import { NextRequest, NextResponse } from 'next/server';
import { getGraphDatabase, resetGraphDatabase } from '@/lib/kuzu-graph';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const graph = getGraphDatabase();

  try {
    switch (action) {
      case 'nodes': {
        const label = searchParams.get('label');
        if (label) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return NextResponse.json(graph.getNodesByLabel(label as any));
        }
        return NextResponse.json(graph.getAllNodes());
      }

      case 'relationships': {
        const type = searchParams.get('type');
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return NextResponse.json(graph.getRelationshipsByType(type as any));
        }
        return NextResponse.json(graph.getAllRelationships());
      }

      case 'node': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Node ID required' }, { status: 400 });
        }
        const node = graph.getNodeById(id);
        if (!node) {
          return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }
        return NextResponse.json(node);
      }

      case 'connected': {
        const nodeId = searchParams.get('nodeId');
        const relType = searchParams.get('relType');
        const direction = searchParams.get('direction') as 'in' | 'out' | 'both' || 'both';
        if (!nodeId) {
          return NextResponse.json({ error: 'Node ID required' }, { status: 400 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json(graph.getConnectedNodes(nodeId, relType as any, direction));
      }

      case 'statistics': {
        return NextResponse.json(graph.getStatistics());
      }

      case 'export': {
        return NextResponse.json(graph.exportData());
      }

      case 'snapshots': {
        return NextResponse.json(graph.getSnapshots());
      }

      case 'assembly-bom': {
        const assemblyId = searchParams.get('assemblyId');
        if (!assemblyId) {
          return NextResponse.json({ error: 'Assembly ID required' }, { status: 400 });
        }
        return NextResponse.json(graph.getAssemblyBOM(assemblyId));
      }

      case 'failure-analysis': {
        const failureId = searchParams.get('failureId');
        if (!failureId) {
          return NextResponse.json({ error: 'Failure ID required' }, { status: 400 });
        }
        return NextResponse.json(graph.getFailureAnalysis(failureId));
      }

      case 'part-lineage': {
        const partId = searchParams.get('partId');
        if (!partId) {
          return NextResponse.json({ error: 'Part ID required' }, { status: 400 });
        }
        return NextResponse.json(graph.tracePartLineage(partId));
      }

      default:
        // Return all nodes and relationships for the knowledge graph page
        return NextResponse.json({
          nodes: graph.getAllNodes(),
          relationships: graph.getAllRelationships(),
          statistics: graph.getStatistics(),
        });
    }
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const graph = getGraphDatabase();

  try {
    const body = await request.json();

    switch (action) {
      case 'import': {
        if (!body.nodes || !body.relationships) {
          return NextResponse.json({ error: 'Invalid import data' }, { status: 400 });
        }
        graph.importData(body);
        return NextResponse.json({ success: true, message: 'Data imported successfully' });
      }

      case 'snapshot': {
        const description = body.description || 'Manual snapshot';
        const snapshot = graph.createSnapshot(description);
        return NextResponse.json(snapshot);
      }

      case 'restore': {
        const snapshotId = body.snapshotId;
        if (!snapshotId) {
          return NextResponse.json({ error: 'Snapshot ID required' }, { status: 400 });
        }
        const success = graph.restoreFromSnapshot(snapshotId);
        if (!success) {
          return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Data restored from snapshot' });
      }

      case 'reset': {
        resetGraphDatabase();
        return NextResponse.json({ success: true, message: 'Database reset to initial state' });
      }

      case 'clear': {
        graph.clearData();
        return NextResponse.json({ success: true, message: 'Database cleared' });
      }

      case 'create-node': {
        const { label, properties } = body;
        if (!label || !properties) {
          return NextResponse.json({ error: 'Label and properties required' }, { status: 400 });
        }
        const node = graph.createNode(label, properties);
        return NextResponse.json(node);
      }

      case 'create-relationship': {
        const { type, fromId, toId, properties } = body;
        if (!type || !fromId || !toId) {
          return NextResponse.json({ error: 'Type, fromId, and toId required' }, { status: 400 });
        }
        const rel = graph.createRelationship(type, fromId, toId, properties || {});
        return NextResponse.json(rel);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
