# Kuzu Graph Database Implementation Documentation

## Overview

This project implements a **Kuzu-style Graph Database** for manufacturing and supply chain traceability. The system enables natural language querying through an AI Copilot that translates user questions into graph traversal operations.

---

## Architecture Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Query    │────▶│   AI Copilot    │────▶│   Tool Calls    │────▶│  Kuzu Graph DB  │
│  (Natural Lang) │     │   (LLM + Tools) │     │ (Query Methods) │     │  (In-Memory)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Code Files and Their Roles

### 1. Copilot UI (`app/copilot/page.tsx`)
- Provides the chat interface for user interaction
- Sends messages to the API endpoint with selected LLM model
- Streams responses back to the user in real-time

### 2. Copilot API Route (`app/api/copilot/route.ts`)
- **Lines 12-15**: Initializes the graph database singleton
- **Lines 21-57**: Defines the `GRAPH_SCHEMA` constant that describes the database structure to the LLM
- **Lines 59-413**: Defines `graphTools` - the tool definitions that the LLM can call:
  - `queryGraph` - Generic query tool with multiple query types
  - `getGraphStats` - Returns database statistics
  - `searchGraph` - Full-text search across all nodes
  - `getAllEntities` - Lists all entities of a specific type
  - `getFailureDetails` - Comprehensive failure investigation
  - `getAssemblyTraceability` - Complete assembly lineage
  - `getPartTraceability` - Complete part supply chain
  - `getPartsFromSameLot` - Lot containment queries
  - `getDeviations` - Quality deviation queries

### 3. Kuzu Graph Database (`lib/kuzu-graph.ts`)
- **Lines 1-66**: Type definitions for Node, Relationship, NodeLabel, RelationshipType
- **Lines 67-106**: Core `KuzuGraph` class with `createNode()` and `createRelationship()` methods
- **Lines 107-200**: Basic query methods (`getAllNodes()`, `getNodesByLabel()`, `getConnectedNodes()`, etc.)
- **Lines 200-600**: Specialized query methods (traceability, failure analysis, etc.)
- **Lines 600-1500**: Dummy data initialization with sample nodes and relationships

---

## Query Execution Flow

### Step 1: User Submits Question
```typescript
// Example: "Show me the service history for assembly ASM-5001"
```

### Step 2: LLM Processes Query
The Copilot API (`app/api/copilot/route.ts`) uses the AI SDK's `streamText` with tool definitions:

```typescript
const result = streamText({
  model,
  system: `You are a helpful assistant that can query a manufacturing/supply chain graph database...`,
  messages: convertToModelMessages(messages),
  tools: graphTools,
  maxSteps: 5,
});
```

### Step 3: LLM Selects Appropriate Tool
The LLM analyzes the user's question and calls the appropriate tool:

```typescript
// LLM decides to call:
getAssemblyTraceability({ assemblyId: "ASM-5001" })
```

### Step 4: Tool Executes Graph Query
The tool calls methods on the `KuzuGraph` class:

```typescript
// In app/api/copilot/route.ts
execute: async ({ assemblyId }) => {
  const trace = graphDb.getAssemblyTraceability(assemblyId);
  return { success: true, data: trace };
}
```

### Step 5: Graph Database Processes Query
The `KuzuGraph` class traverses nodes and relationships:

```typescript
// In lib/kuzu-graph.ts
getAssemblyServiceHistory(assemblyId: string): Node[] {
  let assembly = this.getNodeById(assemblyId);
  if (!assembly) {
    const allAssemblies = this.getNodesByLabel('Assembly');
    assembly = allAssemblies.find(a => 
      a.properties.assemblyNumber === assemblyId
    );
  }
  return this.getConnectedNodes(assembly.id, 'HAS_SERVICE_RECORD', 'out');
}
```

### Step 6: Results Returned to LLM
The tool returns structured data that the LLM formats into a human-readable response.

---

## Cypher-Equivalent Operations

While this implementation uses TypeScript methods, here are the equivalent Cypher queries:

| Operation | Cypher Equivalent |
|-----------|-------------------|
| `getNodesByLabel('Assembly')` | `MATCH (a:Assembly) RETURN a` |
| `getConnectedNodes(id, 'CONTAINS_PART', 'out')` | `MATCH (a)-[:CONTAINS_PART]->(p:Part) WHERE a.id = $id RETURN p` |
| `getAssemblyServiceHistory(id)` | `MATCH (a:Assembly)-[:HAS_SERVICE_RECORD]->(s:ServiceRecord) WHERE a.assemblyNumber = $id RETURN s` |
| `tracePartLineage(id)` | `MATCH path = (p:Part)-[:SUPPLIED_BY|SOURCED_FROM*]->(n) WHERE p.id = $id RETURN path` |

---

## Key Implementation Details

1. **Singleton Pattern**: The graph database uses a singleton to maintain state across API calls
2. **In-Memory Storage**: All nodes and relationships are stored in JavaScript `Map` objects
3. **Flexible Querying**: Methods support both exact ID matching and fuzzy name/number matching
4. **Tool-Based Architecture**: LLM tools provide a declarative interface for the AI to query the database

---

## Supported LLM Providers

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- Google (Gemini 3 Flash, Gemini 3 Pro)

---

*Document generated for VibeCoding Manufacturing Traceability Project*
