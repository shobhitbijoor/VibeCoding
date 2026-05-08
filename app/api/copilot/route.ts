import {
  streamText,
  tool,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
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
}

// Helper function to get the model based on provider and API key
function getModel(modelId: string, apiKey?: string) {
  // Check for environment variable API keys
  const openaiKey = apiKey || process.env.OPENAI_API_KEY
  const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY
  const googleKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  
  if (modelId.startsWith('openai/')) {
    if (!openaiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in environment variables or provide an API key in settings.')
    }
    const openai = createOpenAI({ apiKey: openaiKey })
    const modelName = modelId.replace('openai/', '')
    return openai(modelName)
  }
  
  if (modelId.startsWith('anthropic/')) {
    if (!anthropicKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY in environment variables or provide an API key in settings.')
    }
    const anthropic = createAnthropic({ apiKey: anthropicKey })
    const modelName = modelId.replace('anthropic/', '')
    return anthropic(modelName)
  }
  
  if (modelId.startsWith('google/')) {
    if (!googleKey) {
      throw new Error('Google AI API key is required. Set GOOGLE_GENERATIVE_AI_API_KEY in environment variables or provide an API key in settings.')
    }
    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    const modelName = modelId.replace('google/', '')
    return google(modelName)
  }
  
  // Fallback - try to use the model ID directly with OpenAI if key is available
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey })
    return openai('gpt-4o-mini')
  }
  
  throw new Error('No API key configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in your environment variables, or provide an API key in the settings.')
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

When users ask questions about the data, use the queryGraph tool to fetch relevant information.
Always explain your findings in a clear, human-readable way.
If you need to make multiple queries to answer a question, do so step by step.
When presenting data, format it nicely using markdown tables or lists as appropriate.

Important guidelines:
- For questions about customers, start with 'all_customers' to see available customers
- For assembly-related questions, you may need the assembly ID first
- For supplier questions, check 'statistics' first to see available suppliers
- Always provide context about what you found and what it means`,
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
