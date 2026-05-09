# Standard Operating Procedure: Executing Cypher Queries on Kuzu Database

## Document Information
- **Version:** 1.0
- **Last Updated:** May 2024
- **Purpose:** Guide for executing direct Cypher queries against the Kuzu graph database after downloading the project

---

## Prerequisites

Before executing Cypher queries, ensure you have:

1. **Node.js** (v18 or higher) installed
2. **pnpm** package manager installed (`npm install -g pnpm`)
3. Downloaded and extracted the project ZIP file
4. An API key for your preferred LLM provider (OpenAI, Anthropic, or Google)

---

## Step 1: Initial Setup

### 1.1 Extract the Project
```bash
# Unzip the downloaded project
unzip vibecoding-project.zip -d vibecoding
cd vibecoding
```

### 1.2 Install Dependencies
```bash
pnpm install
```

### 1.3 Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your API key
# OPENAI_API_KEY=sk-your-key-here
# OR
# ANTHROPIC_API_KEY=your-anthropic-key
# OR
# GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
```

---

## Step 2: Start the Development Server

```bash
pnpm dev
```

The application will start at `http://localhost:3000`

---

## Step 3: Execute Queries via the Copilot Interface

### 3.1 Navigate to Copilot
Open your browser and go to: `http://localhost:3000/copilot`

### 3.2 Configure LLM Model
Click the settings icon (gear) in the top right to select your preferred LLM model and enter your API key if not set in environment variables.

### 3.3 Ask Natural Language Questions
Type your questions in natural language. Examples:

| Query Type | Example Question |
|------------|------------------|
| Assembly Traceability | "Show me the complete traceability for assembly ASM-5001" |
| Service History | "What is the service history for ASM-5002?" |
| Failure Analysis | "Tell me about failure FLR-001 and its root cause" |
| Part Sourcing | "Which supplier provides part PN-10001?" |
| Lot Containment | "Find all parts from the same lot as PN-10002" |
| Quality Issues | "List all deviations for assembly ASM-5003" |

---

## Step 4: Execute Direct API Queries (Programmatic Access)

### 4.1 Using the Graph API Endpoint
You can query the graph database directly via the REST API:

```bash
# Get database statistics
curl http://localhost:3000/api/graph

# Get all nodes of a specific type
curl "http://localhost:3000/api/graph?action=getNodes&label=Assembly"

# Get all relationships
curl "http://localhost:3000/api/graph?action=getRelationships"
```

### 4.2 Using the Graph Database in Code
Create a script file `scripts/query-graph.ts`:

```typescript
import { getGraphDatabase } from '../lib/kuzu-graph';

const graphDb = getGraphDatabase();

// Example queries
console.log('=== All Assemblies ===');
const assemblies = graphDb.getAllAssemblies();
assemblies.forEach(a => {
  console.log(`${a.properties.assemblyNumber}: ${a.properties.name}`);
});

console.log('\n=== Assembly Traceability ===');
const trace = graphDb.getAssemblyTraceability('ASM-5001');
console.log('Assembly:', trace.assembly?.properties.name);
console.log('Parts:', trace.parts.length);
console.log('Service Records:', trace.serviceRecords.length);
console.log('Failures:', trace.failures.length);

console.log('\n=== Failure Details ===');
const failure = graphDb.getFailureById('FLR-001');
if (failure) {
  console.log('Failure:', failure.properties.description);
  const rootCauses = graphDb.getRootCauseForFailure('FLR-001');
  rootCauses.forEach(rc => {
    console.log('Root Cause:', rc.properties.description);
  });
}
```

Run the script:
```bash
npx tsx scripts/query-graph.ts
```

---

## Step 5: Available Query Methods

The `KuzuGraph` class provides these methods for direct queries:

### Entity Retrieval
| Method | Description |
|--------|-------------|
| `getAllCustomers()` | Get all customers |
| `getAllSuppliers()` | Get all suppliers |
| `getAllAssemblies()` | Get all assemblies |
| `getAllParts()` | Get all parts |
| `getNodesByLabel(label)` | Get all nodes of a specific type |
| `getNodeById(id)` | Get a single node by ID |
| `searchNodes(term)` | Search nodes by name/property |

### Traceability Queries
| Method | Description |
|--------|-------------|
| `getAssemblyTraceability(id)` | Full assembly traceability |
| `getPartTraceability(id)` | Full part supply chain |
| `getAssemblyParts(id)` | Parts in an assembly |
| `getPartSuppliers(id)` | Suppliers for a part |
| `getPartsFromSameLot(id)` | Lot containment |

### Service & Quality
| Method | Description |
|--------|-------------|
| `getAssemblyServiceHistory(id)` | Service records |
| `getAssemblyFailures(id)` | Failures for assembly |
| `getFailureById(id)` | Get failure details |
| `getRootCauseForFailure(id)` | Root cause analysis |
| `getDeviationsForPart(id)` | Quality deviations |
| `getQualityInspections(id)` | Inspection records |

---

## Step 6: Data Management

### 6.1 View Data Management Dashboard
Navigate to: `http://localhost:3000/data-management`

This interface allows you to:
- View all nodes and relationships
- See database statistics
- Create snapshots
- Export/import data

### 6.2 Reset Database
The database initializes with sample data on startup. To reset:
1. Stop the development server (`Ctrl+C`)
2. Restart with `pnpm dev`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found" errors | Run `pnpm install` |
| API key errors | Verify `.env.local` has correct API key |
| Empty query results | Check entity IDs match the sample data (ASM-5001, PN-10001, etc.) |
| Port 3000 in use | Use `PORT=3001 pnpm dev` |

---

## Contact & Support

For issues or questions, refer to the project documentation or contact the development team.

---

*End of Standard Operating Procedure*
