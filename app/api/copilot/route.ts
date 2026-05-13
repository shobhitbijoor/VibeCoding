import {
  streamText,
  tool,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAzure } from '@ai-sdk/azure'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { getGraphDatabase } from '@/lib/kuzu-graph'

// Initialize the graph database singleton
const graphDb = getGraphDatabase()

// Max duration for streaming
export const maxDuration = 60

// Graph Schema for the LLM to understand
const GRAPH_SCHEMA = `
## Kuzu Graph Database Schema

### Node Types:
1. **Customer** - id, name, industry, tier, contractStartDate, contractEndDate, totalRevenue
2. **CustomerLocation** - id, customerId, name, address, city, state, country, locationType (HQ/Branch/Warehouse)
3. **Assembly** - id, serialNumber, modelNumber, name, description, manufacturedDate, warrantyEndDate, status
4. **Part** - id, partNumber, name, description, category, unitCost, supplier, leadTimeDays, lotNumber, manufacturingDate
5. **Warranty** - id, warrantyType, startDate, endDate, coverageDetails, maxClaims, currentClaims
6. **ServiceRecord** - id, serviceDate, serviceType, description, technicianId, laborHours, partsCost, laborCost
7. **Failure** - id, failureDate, failureType, severity, description, resolutionDate, downtime
8. **RootCause** - id, category, description, correctiveAction, preventiveAction
9. **Plant** - id, name, location, country, capacity, certifications
10. **Station** - id, plantId, name, stationType, operatorCount
11. **Warehouse** - id, name, location, capacity, currentInventory
12. **Supplier** - id, name, country, rating, certifications, leadTimeDays
13. **SupplierPO** - id, supplierId, poNumber, orderDate, deliveryDate, status, totalAmount
14. **QualityInspection** - id, inspectionDate, inspectorId, result, defectsFound, notes
15. **Deviation** - id, deviationType, severity, description, correctiveAction, status

### Relationships:
- COMMISSIONED_AT: Customer -> CustomerLocation (Assembly commissioned at location)
- CONTAINS_PART: Assembly -> Part
- SUPPLIED_BY: Part -> Supplier
- HAS_WARRANTY: Assembly -> Warranty
- HAS_SERVICE: Assembly -> ServiceRecord
- HAS_FAILURE: Assembly -> Failure
- CAUSED_BY: Failure -> RootCause
- USES_PART: ServiceRecord -> Part
- MANUFACTURED_AT: Assembly -> Plant
- BUILT_AT: Part -> Station
- STORED_IN: Part -> Warehouse
- FULFILLED_BY: SupplierPO -> Supplier
- INSPECTED_BY: Part -> QualityInspection
- HAS_DEVIATION: QualityInspection -> Deviation
- LOCATED_AT: Assembly -> CustomerLocation
`

// Define tools for the LLM
const graphTools = {
  queryGraph: tool({
    description: 'Query the Kuzu graph database. Use this to answer questions about customers, assemblies, parts, suppliers, warranties, service records, failures, and manufacturing data.',
    inputSchema: z.object({
      queryType: z.enum([
        'all_customers',
        'customer_assemblies',
        'assembly_parts',
        'part_suppliers',
        'assembly_service_history',
        'assembly_failures',
        'failure_root_causes',
        'parts_by_lot',
        'supplier_purchase_orders',
        'parts_by_supplier',
        'assemblies_by_plant',
        'parts_at_station',
        'quality_inspections',
        'assemblies_by_warranty_status',
        'customer_locations',
        'statistics'
      ]).describe('The type of query to execute'),
      customerId: z.string().nullable().describe('Customer ID for customer-specific queries'),
      assemblyId: z.string().nullable().describe('Assembly ID for assembly-specific queries'),
      partId: z.string().nullable().describe('Part ID for part-specific queries'),
      supplierId: z.string().nullable().describe('Supplier ID for supplier-specific queries'),
      lotNumber: z.string().nullable().describe('Lot number for lot tracking queries'),
      plantId: z.string().nullable().describe('Plant ID for plant-specific queries'),
      stationId: z.string().nullable().describe('Station ID for station-specific queries'),
    }),
    execute: async ({ queryType, customerId, assemblyId, partId, supplierId, lotNumber, plantId, stationId }) => {
      try {
        switch (queryType) {
          case 'all_customers':
            return { success: true, data: graphDb.getAllCustomers() }
          
          case 'customer_assemblies':
            if (!customerId) return { success: false, error: 'customerId is required' }
            return { success: true, data: graphDb.getCustomerAssemblies(customerId) }
          
          case 'assembly_parts':
            if (!assemblyId) return { success: false, error: 'assemblyId is required' }
            return { success: true, data: graphDb.getAssemblyParts(assemblyId) }
          
          case 'part_suppliers':
            if (!partId) return { success: false, error: 'partId is required' }
            return { success: true, data: graphDb.getPartSuppliers(partId) }
          
          case 'assembly_service_history':
            if (!assemblyId) return { success: false, error: 'assemblyId is required' }
            return { success: true, data: graphDb.getAssemblyServiceHistory(assemblyId) }
          
          case 'assembly_failures':
            if (!assemblyId) return { success: false, error: 'assemblyId is required' }
            return { success: true, data: graphDb.getAssemblyFailures(assemblyId) }
          
          case 'failure_root_causes':
            if (!assemblyId) return { success: false, error: 'assemblyId is required' }
            return { success: true, data: graphDb.getFailureRootCauses(assemblyId) }
          
          case 'parts_by_lot':
            if (!lotNumber) return { success: false, error: 'lotNumber is required' }
            return { success: true, data: graphDb.getPartsByLot(lotNumber) }
          
          case 'supplier_purchase_orders':
            if (!supplierId) return { success: false, error: 'supplierId is required' }
            return { success: true, data: graphDb.getSupplierPurchaseOrders(supplierId) }
          
          case 'parts_by_supplier':
            if (!supplierId) return { success: false, error: 'supplierId is required' }
            return { success: true, data: graphDb.getPartsBySupplier(supplierId) }
          
          case 'assemblies_by_plant':
            if (!plantId) return { success: false, error: 'plantId is required' }
            return { success: true, data: graphDb.getAssembliesByPlant(plantId) }
          
          case 'parts_at_station':
            if (!stationId) return { success: false, error: 'stationId is required' }
            return { success: true, data: graphDb.getPartsAtStation(stationId) }
          
          case 'quality_inspections':
            if (!partId) return { success: false, error: 'partId is required' }
            return { success: true, data: graphDb.getQualityInspections(partId) }
          
          case 'assemblies_by_warranty_status':
            return { success: true, data: graphDb.getAssembliesByWarrantyStatus() }
          
          case 'customer_locations':
            if (!customerId) return { success: false, error: 'customerId is required' }
            return { success: true, data: graphDb.getCustomerLocations(customerId) }
          
          case 'statistics':
            return { success: true, data: graphDb.getStatistics() }
          
          default:
            return { success: false, error: 'Unknown query type' }
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),
  
  getGraphStats: tool({
    description: 'Get overall statistics about the graph database including counts of all node and relationship types.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const stats = graphDb.getStatistics()
        return { success: true, data: stats }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),
  
  searchGraph: tool({
    description: 'Search the graph database for nodes matching a search term. Use this to find entities by name before querying for specific details.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The search term to find nodes by name or property value'),
    }),
    execute: async ({ searchTerm }) => {
      try {
        const results = graphDb.searchNodes(searchTerm)
        return { 
          success: true, 
          data: results.map(n => ({
            id: n.id,
            type: n.label,
            properties: n.properties
          }))
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),
  
  getAllEntities: tool({
    description: 'Get all entities of a specific type from the database. Use this to list all customers, suppliers, assemblies, parts, failures, root_causes, deviations, quality_inspections, etc.',
    inputSchema: z.object({
      entityType: z.enum(['customers', 'suppliers', 'assemblies', 'parts', 'plants', 'stations', 'warehouses', 'failures', 'service_records', 'root_causes', 'deviations', 'quality_inspections', 'purchase_orders', 'warranties']).describe('The type of entities to retrieve'),
    }),
    execute: async ({ entityType }) => {
      try {
        let data;
        switch (entityType) {
          case 'customers':
            data = graphDb.getAllCustomers();
            break;
          case 'suppliers':
            data = graphDb.getAllSuppliers();
            break;
          case 'assemblies':
            data = graphDb.getAllAssemblies();
            break;
          case 'parts':
            data = graphDb.getAllParts();
            break;
          case 'plants':
            data = graphDb.getNodesByLabel('Plant');
            break;
          case 'stations':
            data = graphDb.getNodesByLabel('Station');
            break;
          case 'warehouses':
            data = graphDb.getNodesByLabel('Warehouse');
            break;
          case 'failures':
            data = graphDb.getAllFailures();
            break;
          case 'service_records':
            data = graphDb.getNodesByLabel('ServiceRecord');
            break;
          case 'root_causes':
            data = graphDb.getAllRootCauses();
            break;
          case 'deviations':
            data = graphDb.getNodesByLabel('Deviation');
            break;
          case 'quality_inspections':
            data = graphDb.getNodesByLabel('QualityInspection');
            break;
          case 'purchase_orders':
            data = graphDb.getNodesByLabel('SupplierPO');
            break;
          case 'warranties':
            data = graphDb.getNodesByLabel('Warranty');
            break;
          default:
            return { success: false, error: 'Unknown entity type' };
        }
        return { 
          success: true, 
          data: data.map(n => ({
            id: n.id,
            type: n.label,
            properties: n.properties
          }))
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),

  getFailureDetails: tool({
    description: 'Get comprehensive details about a failure including the root cause, affected assembly, affected part, and related deviations. Use this when investigating failures.',
    inputSchema: z.object({
      failureId: z.string().describe('The failure ID (e.g., "FLR-001" or "FLR-002")'),
    }),
    execute: async ({ failureId }) => {
      try {
        const failure = graphDb.getFailureById(failureId);
        if (!failure) {
          return { success: false, error: `Failure "${failureId}" not found` };
        }

        const rootCauses = graphDb.getRootCauseForFailure(failureId);
        const assembly = graphDb.getAssemblyForFailure(failureId);
        const part = graphDb.getPartForFailure(failureId);
        
        // Get deviations for the affected part
        let partDeviations: ReturnType<typeof graphDb.getNodesByLabel> = [];
        if (part) {
          partDeviations = graphDb.getDeviationsForPart(part.properties.partNumber as string);
        }

        return {
          success: true,
          data: {
            failure: { id: failure.id, ...failure.properties },
            rootCauses: rootCauses.map(rc => ({ id: rc.id, ...rc.properties })),
            affectedAssembly: assembly ? { id: assembly.id, ...assembly.properties } : null,
            affectedPart: part ? { id: part.id, ...part.properties } : null,
            relatedDeviations: partDeviations.map(d => ({ id: d.id, ...d.properties })),
          }
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),

  getAssemblyTraceability: tool({
    description: 'Get complete traceability for an assembly including customer, location, warranty, parts, service history, failures, inspections, and deviations.',
    inputSchema: z.object({
      assemblyId: z.string().describe('The assembly number (e.g., "ASM-5001") or name'),
    }),
    execute: async ({ assemblyId }) => {
      try {
        const trace = graphDb.getAssemblyTraceability(assemblyId);
        if (!trace.assembly) {
          return { success: false, error: `Assembly "${assemblyId}" not found` };
        }

        return {
          success: true,
          data: {
            assembly: { id: trace.assembly.id, ...trace.assembly.properties },
            customer: trace.customer ? { id: trace.customer.id, ...trace.customer.properties } : null,
            location: trace.location ? { id: trace.location.id, ...trace.location.properties } : null,
            warranty: trace.warranty ? { id: trace.warranty.id, ...trace.warranty.properties } : null,
            parts: trace.parts.map(p => ({ id: p.id, ...p.properties })),
            serviceRecords: trace.serviceRecords.map(s => ({ id: s.id, ...s.properties })),
            failures: trace.failures.map(f => ({ id: f.id, ...f.properties })),
            inspections: trace.inspections.map(i => ({ id: i.id, ...i.properties })),
            deviations: trace.deviations.map(d => ({ id: d.id, ...d.properties })),
          }
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),

  getPartTraceability: tool({
    description: 'Get complete traceability for a part including supplier, purchase order, warehouse, plant, station, assemblies it is used in, inspections, and deviations.',
    inputSchema: z.object({
      partId: z.string().describe('The part number (e.g., "PN-10001") or name'),
    }),
    execute: async ({ partId }) => {
      try {
        const trace = graphDb.getPartTraceability(partId);
        if (!trace.part) {
          return { success: false, error: `Part "${partId}" not found` };
        }

        return {
          success: true,
          data: {
            part: { id: trace.part.id, ...trace.part.properties },
            supplier: trace.supplier ? { id: trace.supplier.id, ...trace.supplier.properties } : null,
            purchaseOrder: trace.purchaseOrder ? { id: trace.purchaseOrder.id, ...trace.purchaseOrder.properties } : null,
            warehouse: trace.warehouse ? { id: trace.warehouse.id, ...trace.warehouse.properties } : null,
            plant: trace.plant ? { id: trace.plant.id, ...trace.plant.properties } : null,
            station: trace.station ? { id: trace.station.id, ...trace.station.properties } : null,
            assemblies: trace.assemblies.map(a => ({ id: a.id, ...a.properties })),
            inspections: trace.inspections.map(i => ({ id: i.id, ...i.properties })),
            deviations: trace.deviations.map(d => ({ id: d.id, ...d.properties })),
          }
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),

  getPartsFromSameLot: tool({
    description: 'Get all parts from the same lot number. Useful for tracing potentially affected parts when a quality issue is found.',
    inputSchema: z.object({
      partId: z.string().describe('The part number to find lot mates for'),
    }),
    execute: async ({ partId }) => {
      try {
        const parts = graphDb.getPartsFromSameLot(partId);
        if (parts.length === 0) {
          return { success: false, error: `No parts found for "${partId}" or lot information unavailable` };
        }
        return {
          success: true,
          data: parts.map(p => ({ id: p.id, ...p.properties }))
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),

  getDeviations: tool({
    description: 'Get all deviations for a part or assembly. Use this to check quality issues during receiving, assembly, or commissioning.',
    inputSchema: z.object({
      entityType: z.enum(['part', 'assembly']).describe('Whether to get deviations for a part or assembly'),
      entityId: z.string().describe('The part number (e.g., "PN-10002") or assembly number (e.g., "ASM-5002")'),
    }),
    execute: async ({ entityType, entityId }) => {
      try {
        let deviations;
        if (entityType === 'part') {
          deviations = graphDb.getDeviationsForPart(entityId);
        } else {
          deviations = graphDb.getDeviationsForAssembly(entityId);
        }
        
        return {
          success: true,
          data: deviations.map(d => ({ id: d.id, ...d.properties }))
        };
      } catch (error) {
        return { success: false, error: String(error) }
      }
    },
  }),
}

// Helper function to get the model based on provider and API key
function getModel(modelId: string, userProvidedApiKey?: string) {
  // Handle Azure CoE GPT-4o model
  if (modelId.startsWith('azure-coe/')) {
    const apiKey = userProvidedApiKey || process.env.AZURE_COE_API_KEY
    const endpoint = process.env.AZURE_COE_ENDPOINT
    if (!apiKey) {
      throw new Error('Azure CoE API key is required. Set AZURE_COE_API_KEY in environment variables or provide an API key in settings.')
    }
    if (!endpoint) {
      throw new Error('Azure CoE endpoint is required. Set AZURE_COE_ENDPOINT in environment variables.')
    }
    // Extract resource name from endpoint: https://mfg-nag-openai-models.openai.azure.com/...
    // becomes "mfg-nag-openai-models"
    const urlMatch = endpoint.match(/https:\/\/([^.]+)\.openai\.azure\.com/)
    const resourceName = urlMatch ? urlMatch[1] : 'mfg-nag-openai-models'
    
    const azure = createAzure({
      resourceName,
      apiKey,
    })
    // Use the deployment name from the endpoint (gpt-4o)
    return azure('gpt-4o')
  }

  if (modelId.startsWith('openai/')) {
    const apiKey = userProvidedApiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in environment variables or provide an API key in settings.')
    }
    const openai = createOpenAI({ apiKey })
    const modelName = modelId.replace('openai/', '')
    return openai(modelName)
  }
  
  if (modelId.startsWith('anthropic/')) {
    const apiKey = userProvidedApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY in environment variables or provide an API key in settings.')
    }
    const anthropic = createAnthropic({ apiKey })
    const modelName = modelId.replace('anthropic/', '')
    return anthropic(modelName)
  }
  
  if (modelId.startsWith('google/')) {
    const apiKey = userProvidedApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('Google AI API key is required. Set GOOGLE_GENERATIVE_AI_API_KEY in environment variables or provide an API key in settings.')
    }
    const google = createGoogleGenerativeAI({ apiKey })
    const modelName = modelId.replace('google/', '')
    return google(modelName)
  }
  
  throw new Error(`Unknown model provider for model: ${modelId}. Supported providers: openai/, anthropic/, google/, azure-coe/`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, model: selectedModel, apiKey } = body as {
      messages: UIMessage[]
      model?: string
      apiKey?: string
    }

    // Default to OpenAI GPT-4o-mini if no model specified
    const modelId = selectedModel || 'openai/gpt-4o-mini'
    
    // Get the appropriate model based on provider and API key
    const model = getModel(modelId, apiKey)

    const result = streamText({
      model,
      system: `You are a helpful assistant that can query a manufacturing/supply chain graph database.
      
${GRAPH_SCHEMA}

## Available Tools

You have several tools for querying the graph database:

### Entity Listing & Search
- **getAllEntities** - List all entities of a type (customers, suppliers, assemblies, parts, failures, root_causes, deviations, quality_inspections, etc.)
- **searchGraph** - Search for entities by name or any property value
- **getGraphStats** - Get database statistics

### Traceability Tools (USE THESE FOR INVESTIGATIONS)
- **getFailureDetails** - Get complete failure info including root cause, affected assembly, affected part, and related deviations
- **getAssemblyTraceability** - Get full traceability: customer, location, warranty, parts, service history, failures, inspections, deviations
- **getPartTraceability** - Get full traceability: supplier, PO, warehouse, plant, station, assemblies, inspections, deviations
- **getPartsFromSameLot** - Find all parts from the same lot (for containment)
- **getDeviations** - Get deviations for a specific part or assembly

### Relationship Queries
- **queryGraph** - Query specific relationships (assembly_parts, assembly_failures, failure_root_causes, etc.)

## Query Strategy

1. **For failure investigations** (e.g., "what failed?", "tell me about FLR-002"):
   - Use getFailureDetails with the failure ID to get root cause, affected assembly/part, and deviations

2. **For assembly questions** (e.g., "service history for ASM-5001"):
   - Use getAssemblyTraceability for complete info OR queryGraph for specific relationships

3. **For part tracing** (e.g., "where did this part come from?"):
   - Use getPartTraceability for full supply chain visibility

4. **For quality/deviation questions**:
   - Use getDeviations with the part or assembly ID

5. **For lot containment** (e.g., "other parts from the same lot"):
   - Use getPartsFromSameLot

## Data Reference

**Assemblies:** ASM-5001 (Electric Drive Unit), ASM-5002 (Power Electronics Module), ASM-5003 (Thermal Management System), ASM-5004 (Sensor Array Module)

**Parts:** PN-10001 (High-Precision Bearing), PN-10002 (Motor Controller PCB), PN-10003 (Aluminum Housing), PN-10004 (Rubber Seal Ring), PN-10005 (Brushless DC Motor), etc.

**Failures:** FLR-001 (Bearing wear, affects ASM-5001/PN-10001), FLR-002 (Motor controller overheat, affects ASM-5002/PN-10002), FLR-003 (Cooling fan noise, affects ASM-5003)

**Deviations:** DEV-001 (Thermal paste application deviation on PN-10002), DEV-002 (Motor windings resistance issue on PN-10005), DEV-003 (Installation torque deviation on ASM-5003)

**Suppliers:** PrecisionParts Co., SteelWorks International, ElectroComponents Ltd., PolymerTech Inc., CastMaster Foundry

When presenting data, format it nicely using markdown tables or lists as appropriate.
Always explain your findings in a clear, human-readable way.`,
      messages: await convertToModelMessages(messages),
      tools: graphTools,
      stopWhen: stepCountIs(10),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Copilot API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
