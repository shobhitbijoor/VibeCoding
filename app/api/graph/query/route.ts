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
    
    // Helper to find connected nodes
    const findConnectedNodes = (nodeId: string, relTypes?: string[], direction?: 'from' | 'to' | 'both') => {
      const connected: string[] = [];
      allRelationships.forEach(rel => {
        if (relTypes && !relTypes.includes(rel.type)) return;
        
        if (direction === 'from' || direction === 'both' || !direction) {
          if (rel.fromId === nodeId) connected.push(rel.toId);
        }
        if (direction === 'to' || direction === 'both' || !direction) {
          if (rel.toId === nodeId) connected.push(rel.fromId);
        }
      });
      return connected;
    };

    const findNodeByLabel = (nodeId: string) => allNodes.find(n => n.id === nodeId);
    
    // FAILURE-CENTRIC QUERY: When Failure ID is selected, trace specific failure lineage
    if (failureId && failureId !== 'all') {
      const failureNode = allNodes.find(n => n.id === failureId);
      if (failureNode) {
        relevantNodeIds.add(failureId);
        
        // 1. Find the SPECIFIC assembly affected by this failure (via RELATED_TO_FAILURE)
        let specificAssemblyId: string | null = null;
        let specificPartId: string | null = null;
        
        allRelationships.forEach(rel => {
          if (rel.type === 'RELATED_TO_FAILURE' && rel.toId === failureId) {
            const sourceNode = findNodeByLabel(rel.fromId);
            if (sourceNode) {
              relevantNodeIds.add(rel.fromId);
              if (sourceNode.label === 'Assembly') {
                specificAssemblyId = rel.fromId;
              } else if (sourceNode.label === 'Part') {
                specificPartId = rel.fromId;
              }
            }
          }
        });

        // 2. Find the root cause of this failure
        allRelationships.forEach(rel => {
          if (rel.type === 'CAUSED_BY' && rel.fromId === failureId) {
            relevantNodeIds.add(rel.toId);
          }
        });

        // 3. If we have a specific assembly, trace its lineage
        if (specificAssemblyId) {
          const assembly = findNodeByLabel(specificAssemblyId);
          
          // Find the customer location where this specific assembly is installed
          allRelationships.forEach(rel => {
            if (rel.type === 'COMMISSIONED_AT' && rel.fromId === specificAssemblyId) {
              const location = findNodeByLabel(rel.toId);
              if (location && location.label === 'CustomerLocation') {
                relevantNodeIds.add(rel.toId);
                
                // Find the customer for this location
                allRelationships.forEach(r2 => {
                  if (r2.type === 'COMMISSIONED_AT' && r2.toId === rel.toId) {
                    const customer = findNodeByLabel(r2.fromId);
                    if (customer && customer.label === 'Customer') {
                      relevantNodeIds.add(r2.fromId);
                    }
                  }
                });
              }
            }
          });

          // Find warranty for this specific assembly
          allRelationships.forEach(rel => {
            if (rel.type === 'HAS_WARRANTY' && rel.fromId === specificAssemblyId) {
              relevantNodeIds.add(rel.toId);
            }
          });

          // Find service records for this specific assembly
          allRelationships.forEach(rel => {
            if (rel.type === 'HAS_SERVICE_RECORD' && rel.fromId === specificAssemblyId) {
              relevantNodeIds.add(rel.toId);
            }
          });

          // Find inspections for this specific assembly
          allRelationships.forEach(rel => {
            if (rel.type === 'INSPECTED_BY' && rel.fromId === specificAssemblyId) {
              relevantNodeIds.add(rel.toId);
            }
          });
        }

        // 4. If we have a specific failed part, trace its supply chain
        if (specificPartId) {
          // Find supplier for this part
          allRelationships.forEach(rel => {
            if (rel.type === 'SUPPLIED_BY' && rel.fromId === specificPartId) {
              relevantNodeIds.add(rel.toId);
            }
          });

          // Find PO this part came from
          allRelationships.forEach(rel => {
            if (rel.type === 'SOURCED_FROM' && rel.fromId === specificPartId) {
              relevantNodeIds.add(rel.toId);
            }
          });

          // Find inspections for this part
          allRelationships.forEach(rel => {
            if (rel.type === 'INSPECTED_BY' && rel.fromId === specificPartId) {
              relevantNodeIds.add(rel.toId);
            }
          });

          // Find deviations for this part
          allRelationships.forEach(rel => {
            if (rel.type === 'HAS_DEVIATION' && rel.fromId === specificPartId) {
              relevantNodeIds.add(rel.toId);
            }
          });
        }
      }
    }
    // ASSEMBLY-CENTRIC QUERY: When Product (Assembly) is selected
    else if (assemblyId && assemblyId !== 'all') {
      relevantNodeIds.add(assemblyId);
      const assembly = findNodeByLabel(assemblyId);
      
      if (assembly) {
        // Find parts in this assembly (but don't expand to other assemblies)
        allRelationships.forEach(rel => {
          if (rel.type === 'CONTAINS_PART' && rel.fromId === assemblyId) {
            relevantNodeIds.add(rel.toId);
            
            // For each part, find its supplier and PO
            const partId = rel.toId;
            allRelationships.forEach(r2 => {
              if (r2.fromId === partId) {
                if (r2.type === 'SUPPLIED_BY' || r2.type === 'SOURCED_FROM') {
                  relevantNodeIds.add(r2.toId);
                }
              }
            });
          }
        });

        // Find customer location
        allRelationships.forEach(rel => {
          if (rel.type === 'COMMISSIONED_AT' && rel.fromId === assemblyId) {
            relevantNodeIds.add(rel.toId);
            // Find customer for location
            allRelationships.forEach(r2 => {
              if (r2.type === 'COMMISSIONED_AT' && r2.toId === rel.toId) {
                const node = findNodeByLabel(r2.fromId);
                if (node && node.label === 'Customer') {
                  relevantNodeIds.add(r2.fromId);
                }
              }
            });
          }
        });

        // Find warranty, service records, inspections
        allRelationships.forEach(rel => {
          if (rel.fromId === assemblyId) {
            if (['HAS_WARRANTY', 'HAS_SERVICE_RECORD', 'INSPECTED_BY', 'RELATED_TO_FAILURE', 'HAS_DEVIATION'].includes(rel.type)) {
              relevantNodeIds.add(rel.toId);
            }
          }
        });
      }
    }
    // SUPPLIER-CENTRIC QUERY
    else if (supplierId && supplierId !== 'all') {
      relevantNodeIds.add(supplierId);
      
      // Find parts from this supplier
      allRelationships.forEach(rel => {
        if (rel.type === 'SUPPLIED_BY' && rel.toId === supplierId) {
          relevantNodeIds.add(rel.fromId);
        }
      });

      // Find POs to this supplier
      allRelationships.forEach(rel => {
        if (rel.type === 'ORDERED_FROM' && rel.toId === supplierId) {
          relevantNodeIds.add(rel.fromId);
        }
      });
    }
    // CUSTOMER-CENTRIC QUERY
    else if (customerId && customerId !== 'all') {
      relevantNodeIds.add(customerId);
      
      // Find locations for this customer
      allRelationships.forEach(rel => {
        if (rel.type === 'COMMISSIONED_AT' && rel.fromId === customerId) {
          relevantNodeIds.add(rel.toId);
          
          // Find assemblies at each location
          allRelationships.forEach(r2 => {
            if (r2.type === 'COMMISSIONED_AT' && r2.toId === rel.toId) {
              const node = findNodeByLabel(r2.fromId);
              if (node && node.label === 'Assembly') {
                relevantNodeIds.add(r2.fromId);
              }
            }
          });
        }
      });
    }
    // PART-CENTRIC QUERY
    else if (partId && partId !== 'all') {
      relevantNodeIds.add(partId);
      
      // Find supplier and PO
      allRelationships.forEach(rel => {
        if (rel.fromId === partId && ['SUPPLIED_BY', 'SOURCED_FROM'].includes(rel.type)) {
          relevantNodeIds.add(rel.toId);
        }
      });

      // Find inspections and failures
      allRelationships.forEach(rel => {
        if (rel.fromId === partId && ['INSPECTED_BY', 'RELATED_TO_FAILURE', 'HAS_DEVIATION'].includes(rel.type)) {
          relevantNodeIds.add(rel.toId);
        }
      });
    }
    // PO-CENTRIC QUERY
    else if (poId && poId !== 'all') {
      relevantNodeIds.add(poId);
      
      // Find supplier
      allRelationships.forEach(rel => {
        if (rel.type === 'ORDERED_FROM' && rel.fromId === poId) {
          relevantNodeIds.add(rel.toId);
        }
      });

      // Find parts from this PO
      allRelationships.forEach(rel => {
        if (rel.type === 'SOURCED_FROM' && rel.toId === poId) {
          relevantNodeIds.add(rel.fromId);
        }
      });

      // Find warehouse delivered to
      allRelationships.forEach(rel => {
        if (rel.type === 'DELIVERED_TO' && rel.fromId === poId) {
          relevantNodeIds.add(rel.toId);
        }
      });
    }
    // NO SPECIFIC FILTERS - Show a sample
    else {
      const nodesByLabel: Record<string, number> = {};
      allNodes.forEach(node => {
        if (!nodesByLabel[node.label]) nodesByLabel[node.label] = 0;
        if (nodesByLabel[node.label] < 3) {
          if (!nodeTypes.length || nodeTypes.includes(node.label)) {
            relevantNodeIds.add(node.id);
            nodesByLabel[node.label]++;
          }
        }
      });
    }

    // Apply node type filter to results
    let filteredNodes = allNodes.filter(node => relevantNodeIds.has(node.id));
    if (nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => nodeTypes.includes(node.label));
    }

    // Get IDs of filtered nodes
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter relationships to only include those between filtered nodes
    const filteredRelationships = allRelationships.filter(
      rel => filteredNodeIds.has(rel.fromId) && filteredNodeIds.has(rel.toId)
    );

    return NextResponse.json({
      nodes: filteredNodes,
      relationships: filteredRelationships,
      totalNodes: filteredNodes.length,
      totalRelationships: filteredRelationships.length,
      truncated: false,
    });
  } catch (error) {
    console.error('Graph Query API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
