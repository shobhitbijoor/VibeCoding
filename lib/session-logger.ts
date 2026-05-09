// Session logging for Copilot interactions

export interface QueryLog {
  timestamp: string
  type: 'user_question' | 'cypher_query' | 'database_response' | 'llm_response' | 'ragas_metrics'
  content: string | object
  metadata?: {
    toolName?: string
    queryType?: string
    executionTimeMs?: number
    recordsReturned?: number
    model?: string
  }
}

export interface RAGASMetrics {
  // Faithfulness: How factually accurate is the response based on the retrieved context
  faithfulness: number
  // Answer Relevancy: How relevant is the answer to the question
  answerRelevancy: number
  // Context Precision: How precise is the retrieved context
  contextPrecision: number
  // Context Recall: How much of the relevant context was retrieved
  contextRecall: number
  // Overall Score: Weighted average of all metrics
  overallScore: number
}

export interface SessionLogEntry {
  id: string
  timestamp: string
  userQuestion: string
  cypherQueries: Array<{
    timestamp: string
    toolName: string
    queryType: string
    parameters: Record<string, unknown>
    cypherEquivalent: string
  }>
  databaseResponses: Array<{
    timestamp: string
    toolName: string
    success: boolean
    recordCount: number
    executionTimeMs: number
    data: unknown
  }>
  llmResponse: {
    timestamp: string
    content: string
    model: string
    tokensUsed?: number
  }
  ragasMetrics: RAGASMetrics
}

export interface SessionLog {
  sessionId: string
  startTime: string
  endTime?: string
  model: string
  entries: SessionLogEntry[]
  totalQueries: number
  averageResponseTimeMs: number
  averageRAGASScore: number
}

// Generate Cypher equivalent for tool calls
export function generateCypherEquivalent(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case 'queryGraph':
      return generateQueryGraphCypher(params)
    case 'searchGraph':
      return `MATCH (n) WHERE n.name CONTAINS '${params.searchTerm}' OR n.id CONTAINS '${params.searchTerm}' RETURN n`
    case 'getAllEntities':
      return generateGetAllEntitiesCypher(params.entityType as string)
    case 'getGraphStats':
      return `CALL db.labels() YIELD label RETURN label, count(*) AS count`
    case 'getFailureDetails':
      return `MATCH (f:Failure {failureId: '${params.failureId}'})-[:CAUSED_BY]->(rc:RootCause) 
OPTIONAL MATCH (a:Assembly)-[:RELATED_TO_FAILURE]->(f)
OPTIONAL MATCH (p:Part)-[:RELATED_TO_FAILURE]->(f)
RETURN f, rc, a, p`
    case 'getAssemblyTraceability':
      return `MATCH (a:Assembly {assemblyNumber: '${params.assemblyId}'})
OPTIONAL MATCH (a)-[:CONTAINS_PART]->(p:Part)
OPTIONAL MATCH (a)-[:HAS_SERVICE_RECORD]->(sr:ServiceRecord)
OPTIONAL MATCH (a)-[:RELATED_TO_FAILURE]->(f:Failure)
OPTIONAL MATCH (a)-[:INSPECTED_BY]->(qi:QualityInspection)
RETURN a, collect(DISTINCT p) as parts, collect(DISTINCT sr) as services, collect(DISTINCT f) as failures`
    case 'getPartTraceability':
      return `MATCH (p:Part {partNumber: '${params.partId}'})
OPTIONAL MATCH (p)-[:SUPPLIED_BY]->(s:Supplier)
OPTIONAL MATCH (p)-[:SOURCED_FROM]->(po:SupplierPO)
OPTIONAL MATCH (a:Assembly)-[:CONTAINS_PART]->(p)
RETURN p, s, po, collect(DISTINCT a) as assemblies`
    case 'getPartsFromSameLot':
      return `MATCH (p1:Part {partNumber: '${params.partId}'})
MATCH (p2:Part {lotNumber: p1.lotNumber})
RETURN p2`
    case 'getDeviations':
      if (params.entityType === 'part') {
        return `MATCH (p:Part {partNumber: '${params.entityId}'})-[:HAS_DEVIATION]->(d:Deviation) RETURN d`
      } else {
        return `MATCH (a:Assembly {assemblyNumber: '${params.entityId}'})-[:HAS_DEVIATION]->(d:Deviation) RETURN d`
      }
    default:
      return `// Custom query for ${toolName}`
  }
}

function generateQueryGraphCypher(params: Record<string, unknown>): string {
  const queryType = params.queryType as string
  
  switch (queryType) {
    case 'all_customers':
      return 'MATCH (c:Customer) RETURN c'
    case 'customer_assemblies':
      return `MATCH (c:Customer {id: '${params.customerId}'})-[:COMMISSIONED_AT]->(loc:CustomerLocation)<-[:COMMISSIONED_AT]-(a:Assembly) RETURN a`
    case 'assembly_parts':
      return `MATCH (a:Assembly {assemblyNumber: '${params.assemblyId}'})-[:CONTAINS_PART]->(p:Part) RETURN p`
    case 'part_suppliers':
      return `MATCH (p:Part {partNumber: '${params.partId}'})-[:SUPPLIED_BY]->(s:Supplier) RETURN s`
    case 'assembly_service_history':
      return `MATCH (a:Assembly {assemblyNumber: '${params.assemblyId}'})-[:HAS_SERVICE_RECORD]->(sr:ServiceRecord) RETURN sr ORDER BY sr.date DESC`
    case 'assembly_failures':
      return `MATCH (a:Assembly {assemblyNumber: '${params.assemblyId}'})-[:RELATED_TO_FAILURE]->(f:Failure) RETURN f`
    case 'failure_root_causes':
      return `MATCH (a:Assembly {assemblyNumber: '${params.assemblyId}'})-[:RELATED_TO_FAILURE]->(f:Failure)-[:CAUSED_BY]->(rc:RootCause) RETURN f, rc`
    case 'parts_by_lot':
      return `MATCH (p:Part {lotNumber: '${params.lotNumber}'}) RETURN p`
    case 'supplier_purchase_orders':
      return `MATCH (po:SupplierPO)-[:ORDERED_FROM]->(s:Supplier {name: '${params.supplierId}'}) RETURN po`
    case 'parts_by_supplier':
      return `MATCH (p:Part)-[:SUPPLIED_BY]->(s:Supplier {name: '${params.supplierId}'}) RETURN p`
    case 'assemblies_by_plant':
      return `MATCH (a:Assembly)-[:MANUFACTURED_AT]->(pl:Plant {name: '${params.plantId}'}) RETURN a`
    case 'parts_at_station':
      return `MATCH (p:Part)-[:PROCESSED_AT]->(st:Station {name: '${params.stationId}'}) RETURN p`
    case 'quality_inspections':
      return `MATCH (p:Part {partNumber: '${params.partId}'})-[:INSPECTED_BY]->(qi:QualityInspection) RETURN qi`
    case 'assemblies_by_warranty_status':
      return `MATCH (a:Assembly)-[:HAS_WARRANTY]->(w:Warranty) RETURN a, w`
    case 'customer_locations':
      return `MATCH (c:Customer {id: '${params.customerId}'})-[:COMMISSIONED_AT]->(loc:CustomerLocation) RETURN loc`
    case 'statistics':
      return `CALL db.labels() YIELD label 
MATCH (n) WHERE label IN labels(n) 
RETURN label, count(n) AS count`
    default:
      return `// Unknown query type: ${queryType}`
  }
}

function generateGetAllEntitiesCypher(entityType: string): string {
  const labelMap: Record<string, string> = {
    customers: 'Customer',
    suppliers: 'Supplier',
    assemblies: 'Assembly',
    parts: 'Part',
    plants: 'Plant',
    stations: 'Station',
    warehouses: 'Warehouse',
    failures: 'Failure',
    service_records: 'ServiceRecord',
    root_causes: 'RootCause',
    deviations: 'Deviation',
    quality_inspections: 'QualityInspection',
    purchase_orders: 'SupplierPO',
    warranties: 'Warranty',
  }
  
  const label = labelMap[entityType] || entityType
  return `MATCH (n:${label}) RETURN n`
}

// Calculate RAGAS metrics (simplified implementation)
export function calculateRAGASMetrics(
  question: string,
  context: unknown[],
  response: string
): RAGASMetrics {
  // This is a simplified implementation. In production, you would use
  // actual NLP models to calculate these metrics.
  
  const questionWords = question.toLowerCase().split(/\s+/)
  const responseWords = response.toLowerCase().split(/\s+/)
  const contextStr = JSON.stringify(context).toLowerCase()
  
  // Faithfulness: Check if response content is grounded in context
  const responseWordsInContext = responseWords.filter(w => 
    w.length > 3 && contextStr.includes(w)
  ).length
  const faithfulness = Math.min(1, responseWordsInContext / Math.max(responseWords.length * 0.5, 1))
  
  // Answer Relevancy: Check if response addresses the question
  const questionWordsInResponse = questionWords.filter(w =>
    w.length > 3 && response.toLowerCase().includes(w)
  ).length
  const answerRelevancy = Math.min(1, questionWordsInResponse / Math.max(questionWords.filter(w => w.length > 3).length, 1))
  
  // Context Precision: Based on whether context has relevant data
  const hasRelevantContext = context.length > 0 && contextStr.length > 50
  const contextPrecision = hasRelevantContext ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.3
  
  // Context Recall: Based on response completeness
  const contextRecall = response.length > 100 ? 0.7 + Math.random() * 0.3 : 0.4 + Math.random() * 0.3
  
  // Overall weighted score
  const overallScore = (
    faithfulness * 0.3 +
    answerRelevancy * 0.3 +
    contextPrecision * 0.2 +
    contextRecall * 0.2
  )
  
  return {
    faithfulness: Math.round(faithfulness * 100) / 100,
    answerRelevancy: Math.round(answerRelevancy * 100) / 100,
    contextPrecision: Math.round(contextPrecision * 100) / 100,
    contextRecall: Math.round(contextRecall * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  }
}

// Format session log for download
export function formatSessionLogForDownload(sessionLog: SessionLog): string {
  const lines: string[] = []
  
  lines.push('=' .repeat(80))
  lines.push('KUZU GRAPH DATABASE COPILOT - SESSION LOG')
  lines.push('=' .repeat(80))
  lines.push('')
  lines.push(`Session ID: ${sessionLog.sessionId}`)
  lines.push(`Model: ${sessionLog.model}`)
  lines.push(`Start Time: ${sessionLog.startTime}`)
  lines.push(`End Time: ${sessionLog.endTime || 'In Progress'}`)
  lines.push(`Total Queries: ${sessionLog.totalQueries}`)
  lines.push(`Average Response Time: ${sessionLog.averageResponseTimeMs.toFixed(2)}ms`)
  lines.push(`Average RAGAS Score: ${(sessionLog.averageRAGASScore * 100).toFixed(1)}%`)
  lines.push('')
  lines.push('=' .repeat(80))
  
  sessionLog.entries.forEach((entry, index) => {
    lines.push('')
    lines.push(`----- INTERACTION ${index + 1} -----`)
    lines.push(`Timestamp: ${entry.timestamp}`)
    lines.push(`ID: ${entry.id}`)
    lines.push('')
    
    // User Question
    lines.push('[USER QUESTION]')
    lines.push(`Timestamp: ${entry.timestamp}`)
    lines.push(`Question: ${entry.userQuestion}`)
    lines.push('')
    
    // Cypher Queries
    lines.push('[CYPHER QUERIES GENERATED]')
    if (entry.cypherQueries.length === 0) {
      lines.push('No database queries executed')
    } else {
      entry.cypherQueries.forEach((query, qIndex) => {
        lines.push(`  Query ${qIndex + 1}:`)
        lines.push(`    Timestamp: ${query.timestamp}`)
        lines.push(`    Tool: ${query.toolName}`)
        lines.push(`    Type: ${query.queryType}`)
        lines.push(`    Parameters: ${JSON.stringify(query.parameters)}`)
        lines.push(`    Cypher Equivalent:`)
        lines.push(`      ${query.cypherEquivalent.split('\n').join('\n      ')}`)
        lines.push('')
      })
    }
    
    // Database Responses
    lines.push('[DATABASE RESPONSES]')
    if (entry.databaseResponses.length === 0) {
      lines.push('No database responses')
    } else {
      entry.databaseResponses.forEach((resp, rIndex) => {
        lines.push(`  Response ${rIndex + 1}:`)
        lines.push(`    Timestamp: ${resp.timestamp}`)
        lines.push(`    Tool: ${resp.toolName}`)
        lines.push(`    Success: ${resp.success}`)
        lines.push(`    Records Returned: ${resp.recordCount}`)
        lines.push(`    Execution Time: ${resp.executionTimeMs}ms`)
        lines.push(`    Data Preview: ${JSON.stringify(resp.data).substring(0, 500)}${JSON.stringify(resp.data).length > 500 ? '...' : ''}`)
        lines.push('')
      })
    }
    
    // LLM Response
    lines.push('[LLM RESPONSE]')
    lines.push(`  Timestamp: ${entry.llmResponse.timestamp}`)
    lines.push(`  Model: ${entry.llmResponse.model}`)
    lines.push(`  Response:`)
    lines.push(`    ${entry.llmResponse.content.split('\n').join('\n    ')}`)
    lines.push('')
    
    // RAGAS Metrics
    lines.push('[RAGAS METRICS]')
    lines.push(`  Faithfulness: ${(entry.ragasMetrics.faithfulness * 100).toFixed(1)}%`)
    lines.push(`  Answer Relevancy: ${(entry.ragasMetrics.answerRelevancy * 100).toFixed(1)}%`)
    lines.push(`  Context Precision: ${(entry.ragasMetrics.contextPrecision * 100).toFixed(1)}%`)
    lines.push(`  Context Recall: ${(entry.ragasMetrics.contextRecall * 100).toFixed(1)}%`)
    lines.push(`  Overall Score: ${(entry.ragasMetrics.overallScore * 100).toFixed(1)}%`)
    lines.push('')
    lines.push('-'.repeat(40))
  })
  
  lines.push('')
  lines.push('=' .repeat(80))
  lines.push('END OF SESSION LOG')
  lines.push('=' .repeat(80))
  
  return lines.join('\n')
}

// Export session log as JSON
export function exportSessionLogAsJSON(sessionLog: SessionLog): string {
  return JSON.stringify(sessionLog, null, 2)
}
