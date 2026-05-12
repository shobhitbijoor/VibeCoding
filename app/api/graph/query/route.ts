import { NextRequest, NextResponse } from 'next/server';
import { getGraphDatabase } from '@/lib/kuzu-graph';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const graph = getGraphDatabase();

  try {
    // Get filter parameters
    const assemblyId = searchParams.get('assemblyId');
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');
    const partId = searchParams.get('partId');
    const poId = searchParams.get('poId');
    const failureId = searchParams.get('failureId');
    const nodeTypesParam = searchParams.get('nodeTypes');
    const nodeTypes = nodeTypesParam ? nodeTypesParam.split(',') : [];

    // Get all nodes and relationships
    const allNodes = graph.getAllNodes();
    const allRelationships = graph.getAllRelationships();

    // Build a set of relevant node IDs based on filters
    const relevantNodeIds = new Set<string>();
    
    // If no specific filters, include nodes based on node type filter
    const hasSpecificFilters = assemblyId || customerId || supplierId || partId || poId || failureId;

    if (!hasSpecificFilters && nodeTypes.length > 0) {
      // Just filter by node types
      allNodes.forEach(node => {
        if (nodeTypes.includes(node.label)) {
          relevantNodeIds.add(node.id);
        }
      });
    } else if (hasSpecificFilters) {
      // Start with seed nodes from filters
      const seedNodeIds: string[] = [];
      
      if (assemblyId && assemblyId !== 'all') {
        seedNodeIds.push(assemblyId);
      }
      if (customerId && customerId !== 'all') {
        seedNodeIds.push(customerId);
      }
      if (supplierId && supplierId !== 'all') {
        seedNodeIds.push(supplierId);
      }
      if (partId && partId !== 'all') {
        seedNodeIds.push(partId);
      }
      if (poId && poId !== 'all') {
        seedNodeIds.push(poId);
      }
      if (failureId && failureId !== 'all') {
        seedNodeIds.push(failureId);
      }

      // Add seed nodes
      seedNodeIds.forEach(id => relevantNodeIds.add(id));

      // Expand to connected nodes (2 levels deep)
      const expandNodes = (nodeIds: string[], depth: number) => {
        if (depth === 0) return;
        
        const newNodeIds: string[] = [];
        nodeIds.forEach(nodeId => {
          allRelationships.forEach(rel => {
            if (rel.fromId === nodeId && !relevantNodeIds.has(rel.toId)) {
              const targetNode = allNodes.find(n => n.id === rel.toId);
              // Filter by node type if specified
              if (!nodeTypes.length || (targetNode && nodeTypes.includes(targetNode.label))) {
                newNodeIds.push(rel.toId);
                relevantNodeIds.add(rel.toId);
              }
            }
            if (rel.toId === nodeId && !relevantNodeIds.has(rel.fromId)) {
              const targetNode = allNodes.find(n => n.id === rel.fromId);
              // Filter by node type if specified
              if (!nodeTypes.length || (targetNode && nodeTypes.includes(targetNode.label))) {
                newNodeIds.push(rel.fromId);
                relevantNodeIds.add(rel.fromId);
              }
            }
          });
        });
        
        if (newNodeIds.length > 0) {
          expandNodes(newNodeIds, depth - 1);
        }
      };

      // Expand 2 levels from seed nodes
      expandNodes(seedNodeIds, 2);
    } else {
      // No filters at all - return a sample of the graph (first 30 nodes of each type)
      const nodesByLabel: Record<string, typeof allNodes> = {};
      allNodes.forEach(node => {
        if (!nodesByLabel[node.label]) {
          nodesByLabel[node.label] = [];
        }
        if (nodesByLabel[node.label].length < 5) {
          nodesByLabel[node.label].push(node);
          relevantNodeIds.add(node.id);
        }
      });
    }

    // Filter nodes
    const filteredNodes = allNodes.filter(node => relevantNodeIds.has(node.id));

    // Filter relationships to only include those between relevant nodes
    const filteredRelationships = allRelationships.filter(
      rel => relevantNodeIds.has(rel.fromId) && relevantNodeIds.has(rel.toId)
    );

    // Limit to prevent performance issues
    const maxNodes = 50;
    const limitedNodes = filteredNodes.slice(0, maxNodes);
    const limitedNodeIds = new Set(limitedNodes.map(n => n.id));
    const limitedRelationships = filteredRelationships.filter(
      rel => limitedNodeIds.has(rel.fromId) && limitedNodeIds.has(rel.toId)
    );

    return NextResponse.json({
      nodes: limitedNodes,
      relationships: limitedRelationships,
      totalNodes: filteredNodes.length,
      totalRelationships: filteredRelationships.length,
      truncated: filteredNodes.length > maxNodes,
    });
  } catch (error) {
    console.error('Graph Query API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
