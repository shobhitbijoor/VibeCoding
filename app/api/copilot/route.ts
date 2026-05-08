import {
  consumeStream,
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai'
import { z } from 'zod'
import { getGraphDatabase } from '@/lib/kuzu-graph'

// Get the graph database instance
const graphDb = getGraphDatabase()

export const maxDuration = 60 // Max duration for streaming

// Graph Schema for the LLM to understand
const GRAPH_SCHEMA = `
## Kuzu Graph Database Schema

### Node Types:
1. Customer - Properties: name, industry, tier, contactEmail, phone, accountManager
2. CustomerLocation - Properties: name, address, city, state, country, postalCode, locationType (headquarters/branch/warehouse)
3. Assembly - Properties: serialNumber, model, manufactureDate, status (active/inactive/decommissioned), firmwareVersion
4. Part - Properties: partNumber, name, category, lotNumber, manufactureDate, expiryDate, status (in-stock/installed/failed/scrapped)
5. Warranty - Properties: type (standard/extended/premium), startDate, endDate, status (active/expired/voided), coverageDetails
6. ServiceRecord - Properties: serviceDate, serviceType (preventive/corrective/upgrade), description, technicianName, laborHours, resolution
7. Failure - Properties: failureDate, failureType, severity (critical/major/minor), description, detectedBy
8. RootCause - Properties: category (design/manufacturing/material/wear/misuse), description, correctiveAction
9. Plant - Properties: name, location, capacity, certifications, manager
10. Station - Properties: name, type (assembly/testing/packaging/inspection), capacity, operatingHours
11. Warehouse - Properties: name, location, capacity, storageType (ambient/cold/hazmat)
12. Supplier - Properties: name, location, category, rating, leadTimeDays, paymentTerms
13. SupplierPO - Properties: poNumber, orderDate, expectedDelivery, status (pending/shipped/delivered/cancelled), totalValue
14. QualityInspection - Properties: inspectionDate, inspector, result (pass/fail/conditional), notes
15. Deviation - Properties: deviationType, description, severity, status (open/resolved/escalated), resolution

### Relationship Types:
- COMMISSIONED_AT: Customer -> CustomerLocation (commissioned at a location)
- CONTAINS_PART: Assembly -> Part (assembly contains parts)
- SUPPLIED_BY: Part -> Supplier (part supplied by supplier)
- HAS_WARRANTY: Assembly -> Warranty (assembly has warranty)
- HAS_SERVICE_RECORD: Assembly -> ServiceRecord (assembly has service record)
- RELATED_TO_FAILURE: Part/Assembly -> Failure (part/assembly related to failure)
- CAUSED_BY: Failure -> RootCause (failure caused by root cause)
- MANUFACTURED_AT: Assembly/Part -> Plant (manufactured at plant)
- PROCESSED_AT: Part -> Station (processed at station)
- STORED_AT: Part -> Warehouse (stored at warehouse)
- ORDERED_FROM: SupplierPO -> Supplier (PO ordered from supplier)
- INSPECTED_BY: Part -> QualityInspection (part inspected)
- HAS_DEVIATION: QualityInspection -> Deviation (inspection has deviation)
- PART_OF_LOT: Part -> Part (part belongs to lot)
- PARENT_ASSEMBLY: Assembly -> Assembly (sub-assembly relationship)
- REPLACED_WITH: Part -> Part (part replaced with another)
- SOURCED_FROM: Part -> SupplierPO (part sourced from PO)
- DELIVERED_TO: SupplierPO -> Warehouse (PO delivered to warehouse)
- QUALITY_CHECKED: Part -> QualityInspection (quality check)
- REWORKED_AT: Part -> Station (part reworked at station)

### Example Cypher Queries:
1. Get all customers: MATCH (c:Customer) RETURN c
2. Get assemblies for a customer: MATCH (c:Customer)-[:COMMISSIONED_AT]->(l:CustomerLocation)<-[:COMMISSIONED_AT]-(a:Assembly) WHERE c.name = 'Acme Corp' RETURN a
3. Get parts in an assembly: MATCH (a:Assembly)-[:CONTAINS_PART]->(p:Part) WHERE a.serialNumber = 'ASM-001' RETURN p
4. Get supplier for a part: MATCH (p:Part)-[:SUPPLIED_BY]->(s:Supplier) WHERE p.partNumber = 'PN-001' RETURN s
5. Get failure history: MATCH (a:Assembly)-[:RELATED_TO_FAILURE]->(f:Failure)-[:CAUSED_BY]->(rc:RootCause) RETURN a, f, rc
6. Trace part lineage: MATCH path = (p:Part)-[:SOURCED_FROM|PART_OF_LOT*]->(source) WHERE p.id = 'part_1' RETURN path
`

// Tool to query the graph database
const queryGraphTool = tool({
  description: 'Execute a query on the Kuzu graph database. Use this to retrieve data based on the Cypher-like query.',
  inputSchema: z.object({
    queryType: z.enum([
      'getAllNodes',
      'getNodesByLabel',
      'getNodeById',
      'getRelationshipsByType',
      'getConnectedNodes',
      'getAssemblyBOM',
      'getFailureAnalysis',
      'getCustomerAssemblies',
      'getSupplierParts',
      'searchNodes',
      'getWarrantyStatus',
      'getServiceHistory',
      'getPartTraceability',
    ]).describe('The type of query to execute'),
    params: z.object({
      nodeLabel: z.string().optional().describe('Node label to filter by (e.g., Customer, Part, Assembly)'),
      nodeId: z.string().optional().describe('Specific node ID to query'),
      relType: z.string().optional().describe('Relationship type to filter by'),
      searchTerm: z.string().optional().describe('Search term for text-based queries'),
      direction: z.enum(['in', 'out', 'both']).optional().describe('Direction for relationship queries'),
    }).describe('Parameters for the query'),
  }),
  execute: async ({ queryType, params }) => {
    try {
      switch (queryType) {
        case 'getAllNodes':
          return { success: true, data: graphDb.getAllNodes() }
        
        case 'getNodesByLabel':
          if (!params.nodeLabel) return { success: false, error: 'nodeLabel is required' }
          return { success: true, data: graphDb.getNodesByLabel(params.nodeLabel as Parameters<typeof graphDb.getNodesByLabel>[0]) }
        
        case 'getNodeById':
          if (!params.nodeId) return { success: false, error: 'nodeId is required' }
          return { success: true, data: graphDb.getNodeById(params.nodeId) }
        
        case 'getRelationshipsByType':
          if (!params.relType) return { success: false, error: 'relType is required' }
          return { success: true, data: graphDb.getRelationshipsByType(params.relType as Parameters<typeof graphDb.getRelationshipsByType>[0]) }
        
        case 'getConnectedNodes':
          if (!params.nodeId) return { success: false, error: 'nodeId is required' }
          return { 
            success: true, 
            data: graphDb.getConnectedNodes(
              params.nodeId, 
              params.relType as Parameters<typeof graphDb.getConnectedNodes>[1],
              params.direction || 'both'
            ) 
          }
        
        case 'getAssemblyBOM':
          if (!params.nodeId) return { success: false, error: 'assemblyId (nodeId) is required' }
          return { success: true, data: graphDb.getAssemblyBOM(params.nodeId) }
        
        case 'getFailureAnalysis':
          if (!params.nodeId) return { success: false, error: 'failureId (nodeId) is required' }
          return { success: true, data: graphDb.getFailureAnalysis(params.nodeId) }
        
        case 'getCustomerAssemblies':
          if (!params.nodeId) return { success: false, error: 'customerId (nodeId) is required' }
          return { success: true, data: graphDb.getCustomerAssemblies(params.nodeId) }
        
        case 'getSupplierParts':
          if (!params.nodeId) return { success: false, error: 'supplierId (nodeId) is required' }
          return { success: true, data: graphDb.getSupplierParts(params.nodeId) }
        
        case 'searchNodes':
          if (!params.searchTerm) return { success: false, error: 'searchTerm is required' }
          // Search across all nodes
          const allNodes = graphDb.getAllNodes()
          const searchResults = allNodes.filter(node => {
            const propsStr = JSON.stringify(node.properties).toLowerCase()
            return propsStr.includes(params.searchTerm!.toLowerCase())
          })
          return { success: true, data: searchResults }
        
        case 'getWarrantyStatus':
          if (!params.nodeId) return { success: false, error: 'assemblyId (nodeId) is required' }
          const warranties = graphDb.getConnectedNodes(params.nodeId, 'HAS_WARRANTY', 'out')
          return { success: true, data: warranties }
        
        case 'getServiceHistory':
          if (!params.nodeId) return { success: false, error: 'assemblyId (nodeId) is required' }
          const serviceRecords = graphDb.getConnectedNodes(params.nodeId, 'HAS_SERVICE_RECORD', 'out')
          return { success: true, data: serviceRecords }
        
        case 'getPartTraceability':
          if (!params.nodeId) return { success: false, error: 'partId (nodeId) is required' }
          return { success: true, data: graphDb.tracePartLineage(params.nodeId) }
        
        default:
          return { success: false, error: 'Unknown query type' }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

// Tool to get graph statistics
const getGraphStatsTool = tool({
  description: 'Get statistics about the graph database including node counts by type and relationship counts.',
  inputSchema: z.object({}),
  execute: async () => {
    const nodes = graphDb.getAllNodes()
    const relationships = graphDb.getAllRelationships()
    
    const nodeCountsByLabel: Record<string, number> = {}
    nodes.forEach(node => {
      nodeCountsByLabel[node.label] = (nodeCountsByLabel[node.label] || 0) + 1
    })
    
    const relCountsByType: Record<string, number> = {}
    relationships.forEach(rel => {
      relCountsByType[rel.type] = (relCountsByType[rel.type] || 0) + 1
    })
    
    return {
      totalNodes: nodes.length,
      totalRelationships: relationships.length,
      nodeCountsByLabel,
      relCountsByType,
    }
  },
})

const tools = {
  queryGraph: queryGraphTool,
  getGraphStats: getGraphStatsTool,
}

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, model: selectedModel, apiKey }: { 
    messages: UIMessage[], 
    model?: string,
    apiKey?: string 
  } = body

  // Determine which model to use
  let model = selectedModel || 'openai/gpt-4o-mini'
  
  // Build headers for API key if provided
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const systemPrompt = `You are a helpful assistant that helps users query a manufacturing/supply chain graph database.

${GRAPH_SCHEMA}

## Your Role:
1. Understand the user's natural language question about the manufacturing data
2. Use the queryGraph tool to retrieve the relevant data from the graph database
3. Present the results in a clear, human-readable format
4. If the query returns no results, explain what was searched and suggest alternatives

## Guidelines:
- Always use the appropriate query type based on what the user is asking
- For customer-related queries, first find the customer, then their assemblies/locations
- For part traceability, use getPartTraceability
- For failure analysis, use getFailureAnalysis
- For bill of materials, use getAssemblyBOM
- When searching for something by name or text, use searchNodes
- Format results nicely with bullet points or tables when appropriate
- If you're unsure about node IDs, use searchNodes first to find them

## Available Query Types:
- getAllNodes: Get all nodes in the database
- getNodesByLabel: Get nodes by their type (Customer, Part, Assembly, etc.)
- getNodeById: Get a specific node by its ID
- getRelationshipsByType: Get relationships by type
- getConnectedNodes: Get nodes connected to a specific node
- getAssemblyBOM: Get bill of materials for an assembly
- getFailureAnalysis: Get failure details and root causes
- getCustomerAssemblies: Get all assemblies for a customer
- getSupplierParts: Get all parts from a supplier
- searchNodes: Search nodes by text across all properties
- getWarrantyStatus: Get warranty information for an assembly
- getServiceHistory: Get service records for an assembly
- getPartTraceability: Trace the lineage of a part
`

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
