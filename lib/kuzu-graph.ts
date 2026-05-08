// Kuzu-style Graph Database Implementation for Manufacturing/Supply Chain
// This implements the full schema with nodes, relationships, and query capabilities

export interface Node {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface Relationship {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  properties: Record<string, unknown>;
}

export interface GraphSnapshot {
  id: string;
  timestamp: string;
  description: string;
  nodes: Node[];
  relationships: Relationship[];
}

// Node Types (as per schema)
export type NodeLabel =
  | 'Customer'
  | 'CustomerLocation'
  | 'Assembly'
  | 'Part'
  | 'Warranty'
  | 'ServiceRecord'
  | 'Failure'
  | 'RootCause'
  | 'Plant'
  | 'Station'
  | 'Warehouse'
  | 'Supplier'
  | 'SupplierPO'
  | 'QualityInspection'
  | 'Deviation';

// Relationship Types (as per schema)
export type RelationshipType =
  | 'COMMISSIONED_AT'
  | 'CONTAINS_PART'
  | 'SUPPLIED_BY'
  | 'HAS_WARRANTY'
  | 'HAS_SERVICE_RECORD'
  | 'RELATED_TO_FAILURE'
  | 'CAUSED_BY'
  | 'MANUFACTURED_AT'
  | 'PROCESSED_AT'
  | 'STORED_AT'
  | 'ORDERED_FROM'
  | 'INSPECTED_BY'
  | 'HAS_DEVIATION'
  | 'PART_OF_LOT'
  | 'PARENT_ASSEMBLY'
  | 'REPLACED_WITH'
  | 'SOURCED_FROM'
  | 'DELIVERED_TO'
  | 'QUALITY_CHECKED'
  | 'REWORKED_AT';

class KuzuGraph {
  private nodes: Map<string, Node> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private snapshots: GraphSnapshot[] = [];
  private nodeCounter = 0;
  private relCounter = 0;

  constructor() {
    this.initializeWithDummyData();
  }

  private generateNodeId(label: string): string {
    return `${label.toLowerCase()}_${++this.nodeCounter}`;
  }

  private generateRelId(): string {
    return `rel_${++this.relCounter}`;
  }

  // Create a node
  createNode(label: NodeLabel, properties: Record<string, unknown>): Node {
    const id = this.generateNodeId(label);
    const node: Node = { id, label, properties };
    this.nodes.set(id, node);
    return node;
  }

  // Create a relationship
  createRelationship(
    type: RelationshipType,
    fromId: string,
    toId: string,
    properties: Record<string, unknown> = {}
  ): Relationship {
    const id = this.generateRelId();
    const rel: Relationship = { id, type, fromId, toId, properties };
    this.relationships.set(id, rel);
    return rel;
  }

  // Get all nodes
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  // Get all relationships
  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  // Get nodes by label
  getNodesByLabel(label: NodeLabel): Node[] {
    return Array.from(this.nodes.values()).filter((n) => n.label === label);
  }

  // Get node by ID
  getNodeById(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  // Get relationships by type
  getRelationshipsByType(type: RelationshipType): Relationship[] {
    return Array.from(this.relationships.values()).filter((r) => r.type === type);
  }

  // Get relationships for a node
  getRelationshipsForNode(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Relationship[] {
    return Array.from(this.relationships.values()).filter((r) => {
      if (direction === 'out') return r.fromId === nodeId;
      if (direction === 'in') return r.toId === nodeId;
      return r.fromId === nodeId || r.toId === nodeId;
    });
  }

  // Get connected nodes
  getConnectedNodes(nodeId: string, relType?: RelationshipType, direction: 'in' | 'out' | 'both' = 'both'): Node[] {
    const rels = this.getRelationshipsForNode(nodeId, direction);
    const filteredRels = relType ? rels.filter((r) => r.type === relType) : rels;
    const connectedIds = filteredRels.map((r) => (r.fromId === nodeId ? r.toId : r.fromId));
    return connectedIds.map((id) => this.nodes.get(id)).filter((n): n is Node => n !== undefined);
  }

  // Trace part lineage (for lot traceability)
  tracePartLineage(partId: string): { parts: Node[]; path: Relationship[] } {
    const parts: Node[] = [];
    const path: Relationship[] = [];
    const visited = new Set<string>();

    const trace = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this.nodes.get(id);
      if (node && node.label === 'Part') {
        parts.push(node);
        const rels = this.getRelationshipsForNode(id, 'both');
        rels.forEach((rel) => {
          if (rel.type === 'PART_OF_LOT' || rel.type === 'SOURCED_FROM' || rel.type === 'SUPPLIED_BY') {
            path.push(rel);
            trace(rel.fromId === id ? rel.toId : rel.fromId);
          }
        });
      }
    };

    trace(partId);
    return { parts, path };
  }

  // Get assembly bill of materials
  getAssemblyBOM(assemblyId: string): { assembly: Node | undefined; parts: Node[]; suppliers: Node[] } {
    const assembly = this.nodes.get(assemblyId);
    const parts = this.getConnectedNodes(assemblyId, 'CONTAINS_PART', 'out');
    const suppliers: Node[] = [];
    parts.forEach((part) => {
      const partSuppliers = this.getConnectedNodes(part.id, 'SUPPLIED_BY', 'out');
      partSuppliers.forEach((s) => {
        if (!suppliers.find((existing) => existing.id === s.id)) {
          suppliers.push(s);
        }
      });
    });
    return { assembly, parts, suppliers };
  }

  // Get failure analysis
  getFailureAnalysis(failureId: string): { failure: Node | undefined; rootCauses: Node[]; affectedParts: Node[] } {
    const failure = this.nodes.get(failureId);
    const rootCauses = this.getConnectedNodes(failureId, 'CAUSED_BY', 'out');
    const affectedParts: Node[] = [];
    const partRels = this.getRelationshipsForNode(failureId, 'in').filter((r) => r.type === 'RELATED_TO_FAILURE');
    partRels.forEach((rel) => {
      const part = this.nodes.get(rel.fromId);
      if (part) affectedParts.push(part);
    });
    return { failure, rootCauses, affectedParts };
  }

  // Create snapshot
  createSnapshot(description: string): GraphSnapshot {
    const snapshot: GraphSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      nodes: Array.from(this.nodes.values()),
      relationships: Array.from(this.relationships.values()),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  // Get all snapshots
  getSnapshots(): GraphSnapshot[] {
    return this.snapshots;
  }

  // Restore from snapshot
  restoreFromSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return false;

    this.nodes.clear();
    this.relationships.clear();
    snapshot.nodes.forEach((n) => this.nodes.set(n.id, { ...n }));
    snapshot.relationships.forEach((r) => this.relationships.set(r.id, { ...r }));
    return true;
  }

  // Export all data
  exportData(): { nodes: Node[]; relationships: Relationship[]; snapshots: GraphSnapshot[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      relationships: Array.from(this.relationships.values()),
      snapshots: this.snapshots,
    };
  }

  // Import data (replaces existing)
  importData(data: { nodes: Node[]; relationships: Relationship[] }): void {
    // Create snapshot before import
    this.createSnapshot('Pre-import backup');

    this.nodes.clear();
    this.relationships.clear();
    data.nodes.forEach((n) => this.nodes.set(n.id, n));
    data.relationships.forEach((r) => this.relationships.set(r.id, r));

    // Update counters
    this.nodeCounter = Math.max(...data.nodes.map((n) => parseInt(n.id.split('_').pop() || '0', 10)), this.nodeCounter);
    this.relCounter = Math.max(
      ...data.relationships.map((r) => parseInt(r.id.split('_').pop() || '0', 10)),
      this.relCounter
    );
  }

  // Clear all data
  clearData(): void {
    this.createSnapshot('Pre-clear backup');
    this.nodes.clear();
    this.relationships.clear();
  }

  // Get statistics
  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      totalSnapshots: this.snapshots.length,
    };

    // Count by label
    const labels = new Set(Array.from(this.nodes.values()).map((n) => n.label));
    labels.forEach((label) => {
      stats[`nodes_${label}`] = this.getNodesByLabel(label as NodeLabel).length;
    });

    // Count by relationship type
    const relTypes = new Set(Array.from(this.relationships.values()).map((r) => r.type));
    relTypes.forEach((type) => {
      stats[`rels_${type}`] = this.getRelationshipsByType(type as RelationshipType).length;
    });

    return stats;
  }

  // Initialize with comprehensive dummy data
  private initializeWithDummyData(): void {
    // ===== CUSTOMERS =====
    const customers = [
      this.createNode('Customer', {
        name: 'Acme Manufacturing Co.',
        industry: 'Automotive',
        region: 'North America',
        contractStart: '2022-01-15',
        tier: 'Enterprise',
      }),
      this.createNode('Customer', {
        name: 'Global Motors Inc.',
        industry: 'Automotive',
        region: 'Europe',
        contractStart: '2021-06-01',
        tier: 'Enterprise',
      }),
      this.createNode('Customer', {
        name: 'Pacific Aerospace Ltd.',
        industry: 'Aerospace',
        region: 'Asia Pacific',
        contractStart: '2023-03-10',
        tier: 'Premium',
      }),
      this.createNode('Customer', {
        name: 'Industrial Solutions GmbH',
        industry: 'Industrial Equipment',
        region: 'Europe',
        contractStart: '2022-09-20',
        tier: 'Standard',
      }),
      this.createNode('Customer', {
        name: 'TechDrive Systems',
        industry: 'Electric Vehicles',
        region: 'North America',
        contractStart: '2024-01-01',
        tier: 'Enterprise',
      }),
    ];

    // ===== CUSTOMER LOCATIONS =====
    const locations = [
      this.createNode('CustomerLocation', {
        address: '123 Industrial Blvd, Detroit, MI 48201',
        locationType: 'Manufacturing Plant',
        country: 'USA',
        timezone: 'EST',
      }),
      this.createNode('CustomerLocation', {
        address: '456 Auto Way, Munich, Germany 80331',
        locationType: 'Assembly Plant',
        country: 'Germany',
        timezone: 'CET',
      }),
      this.createNode('CustomerLocation', {
        address: '789 Tech Park, Shanghai, China 200000',
        locationType: 'R&D Center',
        country: 'China',
        timezone: 'CST',
      }),
      this.createNode('CustomerLocation', {
        address: '321 Factory Rd, Stuttgart, Germany 70173',
        locationType: 'Manufacturing Plant',
        country: 'Germany',
        timezone: 'CET',
      }),
      this.createNode('CustomerLocation', {
        address: '555 Innovation Dr, San Jose, CA 95112',
        locationType: 'Headquarters',
        country: 'USA',
        timezone: 'PST',
      }),
      this.createNode('CustomerLocation', {
        address: '888 Assembly Lane, Tokyo, Japan 100-0001',
        locationType: 'Assembly Plant',
        country: 'Japan',
        timezone: 'JST',
      }),
      this.createNode('CustomerLocation', {
        address: '999 Production Ave, Austin, TX 78701',
        locationType: 'Gigafactory',
        country: 'USA',
        timezone: 'CST',
      }),
    ];

    // Link customers to locations
    this.createRelationship('COMMISSIONED_AT', customers[0].id, locations[0].id, { since: '2022-01-15' });
    this.createRelationship('COMMISSIONED_AT', customers[1].id, locations[1].id, { since: '2021-06-01' });
    this.createRelationship('COMMISSIONED_AT', customers[1].id, locations[3].id, { since: '2022-01-01' });
    this.createRelationship('COMMISSIONED_AT', customers[2].id, locations[2].id, { since: '2023-03-10' });
    this.createRelationship('COMMISSIONED_AT', customers[2].id, locations[5].id, { since: '2023-06-15' });
    this.createRelationship('COMMISSIONED_AT', customers[3].id, locations[3].id, { since: '2022-09-20' });
    this.createRelationship('COMMISSIONED_AT', customers[4].id, locations[4].id, { since: '2024-01-01' });
    this.createRelationship('COMMISSIONED_AT', customers[4].id, locations[6].id, { since: '2024-02-15' });

    // ===== SUPPLIERS =====
    const suppliers = [
      this.createNode('Supplier', {
        name: 'PrecisionParts Co.',
        category: 'Precision Components',
        country: 'Japan',
        rating: 4.8,
        certifications: ['ISO 9001', 'IATF 16949'],
      }),
      this.createNode('Supplier', {
        name: 'SteelWorks International',
        category: 'Raw Materials',
        country: 'Germany',
        rating: 4.5,
        certifications: ['ISO 9001', 'ISO 14001'],
      }),
      this.createNode('Supplier', {
        name: 'ElectroComponents Ltd.',
        category: 'Electronics',
        country: 'Taiwan',
        rating: 4.7,
        certifications: ['ISO 9001', 'IPC-A-610'],
      }),
      this.createNode('Supplier', {
        name: 'PolymerTech Inc.',
        category: 'Plastics & Polymers',
        country: 'USA',
        rating: 4.3,
        certifications: ['ISO 9001'],
      }),
      this.createNode('Supplier', {
        name: 'CastMaster Foundry',
        category: 'Cast Components',
        country: 'India',
        rating: 4.2,
        certifications: ['ISO 9001', 'IATF 16949'],
      }),
    ];

    // ===== PLANTS =====
    const plants = [
      this.createNode('Plant', {
        name: 'Detroit Manufacturing Hub',
        plantCode: 'DMH-001',
        country: 'USA',
        capacity: 50000,
        type: 'Assembly',
      }),
      this.createNode('Plant', {
        name: 'Munich Precision Works',
        plantCode: 'MPW-002',
        country: 'Germany',
        capacity: 35000,
        type: 'Machining',
      }),
      this.createNode('Plant', {
        name: 'Shanghai Tech Center',
        plantCode: 'STC-003',
        country: 'China',
        capacity: 80000,
        type: 'Electronics Assembly',
      }),
    ];

    // ===== STATIONS =====
    const stations = [
      this.createNode('Station', {
        name: 'CNC Machining Station A1',
        stationCode: 'CNC-A1',
        type: 'CNC Machining',
        status: 'Active',
      }),
      this.createNode('Station', {
        name: 'SMT Line 1',
        stationCode: 'SMT-01',
        type: 'Surface Mount',
        status: 'Active',
      }),
      this.createNode('Station', {
        name: 'Final Assembly Line 3',
        stationCode: 'FAL-03',
        type: 'Assembly',
        status: 'Active',
      }),
      this.createNode('Station', {
        name: 'Quality Inspection Bay',
        stationCode: 'QIB-01',
        type: 'Inspection',
        status: 'Active',
      }),
      this.createNode('Station', {
        name: 'Paint & Coating Line',
        stationCode: 'PCL-01',
        type: 'Finishing',
        status: 'Active',
      }),
    ];

    // Link stations to plants
    this.createRelationship('PROCESSED_AT', stations[0].id, plants[1].id, {});
    this.createRelationship('PROCESSED_AT', stations[1].id, plants[2].id, {});
    this.createRelationship('PROCESSED_AT', stations[2].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[3].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[4].id, plants[0].id, {});

    // ===== WAREHOUSES =====
    const warehouses = [
      this.createNode('Warehouse', {
        name: 'Central Distribution Center',
        warehouseCode: 'CDC-001',
        location: 'Chicago, IL',
        capacity: 100000,
        type: 'Distribution',
      }),
      this.createNode('Warehouse', {
        name: 'Raw Materials Storage',
        warehouseCode: 'RMS-002',
        location: 'Detroit, MI',
        capacity: 50000,
        type: 'Raw Materials',
      }),
      this.createNode('Warehouse', {
        name: 'Finished Goods Warehouse',
        warehouseCode: 'FGW-003',
        location: 'Los Angeles, CA',
        capacity: 75000,
        type: 'Finished Goods',
      }),
    ];

    // ===== PARTS =====
    const parts = [
      this.createNode('Part', {
        partNumber: 'PN-10001',
        name: 'High-Precision Bearing',
        category: 'Mechanical',
        material: 'Stainless Steel 440C',
        unitCost: 45.5,
        lotNumber: 'LOT-2024-001',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10002',
        name: 'Motor Controller PCB',
        category: 'Electronics',
        material: 'FR-4 PCB',
        unitCost: 125.0,
        lotNumber: 'LOT-2024-002',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10003',
        name: 'Aluminum Housing',
        category: 'Structural',
        material: 'Aluminum 6061-T6',
        unitCost: 85.75,
        lotNumber: 'LOT-2024-003',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10004',
        name: 'Rubber Seal Ring',
        category: 'Sealing',
        material: 'Viton FKM',
        unitCost: 3.25,
        lotNumber: 'LOT-2024-004',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10005',
        name: 'Brushless DC Motor',
        category: 'Electrical',
        material: 'Copper/Steel/Magnets',
        unitCost: 275.0,
        lotNumber: 'LOT-2024-005',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10006',
        name: 'Thermal Paste Compound',
        category: 'Consumable',
        material: 'Silver-Based Thermal Compound',
        unitCost: 12.5,
        lotNumber: 'LOT-2024-006',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10007',
        name: 'Stainless Steel Shaft',
        category: 'Mechanical',
        material: 'Stainless Steel 304',
        unitCost: 65.0,
        lotNumber: 'LOT-2024-007',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10008',
        name: 'Power Connector Assembly',
        category: 'Electronics',
        material: 'Brass/Plastic',
        unitCost: 8.75,
        lotNumber: 'LOT-2024-008',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10009',
        name: 'Cooling Fan Unit',
        category: 'Thermal',
        material: 'Plastic/Aluminum',
        unitCost: 22.5,
        lotNumber: 'LOT-2024-009',
      }),
      this.createNode('Part', {
        partNumber: 'PN-10010',
        name: 'Capacitor Bank Module',
        category: 'Electronics',
        material: 'Aluminum Electrolytic',
        unitCost: 45.0,
        lotNumber: 'LOT-2024-010',
      }),
    ];

    // Link parts to suppliers
    this.createRelationship('SUPPLIED_BY', parts[0].id, suppliers[0].id, { leadTime: 14 });
    this.createRelationship('SUPPLIED_BY', parts[1].id, suppliers[2].id, { leadTime: 21 });
    this.createRelationship('SUPPLIED_BY', parts[2].id, suppliers[1].id, { leadTime: 10 });
    this.createRelationship('SUPPLIED_BY', parts[3].id, suppliers[3].id, { leadTime: 7 });
    this.createRelationship('SUPPLIED_BY', parts[4].id, suppliers[0].id, { leadTime: 28 });
    this.createRelationship('SUPPLIED_BY', parts[5].id, suppliers[3].id, { leadTime: 5 });
    this.createRelationship('SUPPLIED_BY', parts[6].id, suppliers[1].id, { leadTime: 12 });
    this.createRelationship('SUPPLIED_BY', parts[7].id, suppliers[2].id, { leadTime: 14 });
    this.createRelationship('SUPPLIED_BY', parts[8].id, suppliers[2].id, { leadTime: 18 });
    this.createRelationship('SUPPLIED_BY', parts[9].id, suppliers[2].id, { leadTime: 21 });

    // Link parts to manufacturing
    this.createRelationship('MANUFACTURED_AT', parts[0].id, plants[1].id, { date: '2024-02-15' });
    this.createRelationship('MANUFACTURED_AT', parts[1].id, plants[2].id, { date: '2024-02-18' });
    this.createRelationship('MANUFACTURED_AT', parts[2].id, plants[1].id, { date: '2024-02-10' });
    this.createRelationship('MANUFACTURED_AT', parts[4].id, plants[2].id, { date: '2024-02-20' });
    this.createRelationship('MANUFACTURED_AT', parts[6].id, plants[1].id, { date: '2024-02-12' });

    // Link parts to warehouses
    this.createRelationship('STORED_AT', parts[0].id, warehouses[1].id, { quantity: 5000 });
    this.createRelationship('STORED_AT', parts[1].id, warehouses[0].id, { quantity: 2000 });
    this.createRelationship('STORED_AT', parts[2].id, warehouses[1].id, { quantity: 3500 });
    this.createRelationship('STORED_AT', parts[3].id, warehouses[1].id, { quantity: 25000 });
    this.createRelationship('STORED_AT', parts[4].id, warehouses[0].id, { quantity: 1200 });

    // ===== ASSEMBLIES =====
    const assemblies = [
      this.createNode('Assembly', {
        assemblyNumber: 'ASM-5001',
        name: 'Electric Drive Unit',
        version: '2.1',
        status: 'Production',
        complexity: 'High',
      }),
      this.createNode('Assembly', {
        assemblyNumber: 'ASM-5002',
        name: 'Power Electronics Module',
        version: '1.5',
        status: 'Production',
        complexity: 'High',
      }),
      this.createNode('Assembly', {
        assemblyNumber: 'ASM-5003',
        name: 'Thermal Management System',
        version: '3.0',
        status: 'Production',
        complexity: 'Medium',
      }),
      this.createNode('Assembly', {
        assemblyNumber: 'ASM-5004',
        name: 'Sensor Array Module',
        version: '1.2',
        status: 'Prototype',
        complexity: 'Medium',
      }),
    ];

    // Link assemblies to parts (BOM)
    this.createRelationship('CONTAINS_PART', assemblies[0].id, parts[0].id, { quantity: 4 });
    this.createRelationship('CONTAINS_PART', assemblies[0].id, parts[4].id, { quantity: 1 });
    this.createRelationship('CONTAINS_PART', assemblies[0].id, parts[6].id, { quantity: 2 });
    this.createRelationship('CONTAINS_PART', assemblies[0].id, parts[3].id, { quantity: 8 });

    this.createRelationship('CONTAINS_PART', assemblies[1].id, parts[1].id, { quantity: 1 });
    this.createRelationship('CONTAINS_PART', assemblies[1].id, parts[7].id, { quantity: 4 });
    this.createRelationship('CONTAINS_PART', assemblies[1].id, parts[9].id, { quantity: 2 });

    this.createRelationship('CONTAINS_PART', assemblies[2].id, parts[8].id, { quantity: 3 });
    this.createRelationship('CONTAINS_PART', assemblies[2].id, parts[5].id, { quantity: 1 });
    this.createRelationship('CONTAINS_PART', assemblies[2].id, parts[2].id, { quantity: 1 });

    this.createRelationship('CONTAINS_PART', assemblies[3].id, parts[1].id, { quantity: 2 });
    this.createRelationship('CONTAINS_PART', assemblies[3].id, parts[7].id, { quantity: 6 });

    // Link assemblies to customers/locations
    this.createRelationship('COMMISSIONED_AT', assemblies[0].id, locations[0].id, { installDate: '2024-03-01' });
    this.createRelationship('COMMISSIONED_AT', assemblies[1].id, locations[1].id, { installDate: '2024-02-15' });
    this.createRelationship('COMMISSIONED_AT', assemblies[2].id, locations[6].id, { installDate: '2024-03-10' });
    this.createRelationship('COMMISSIONED_AT', assemblies[3].id, locations[2].id, { installDate: '2024-01-20' });

    // ===== SUPPLIER PURCHASE ORDERS =====
    const purchaseOrders = [
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-001',
        orderDate: '2024-01-15',
        deliveryDate: '2024-02-01',
        status: 'Delivered',
        totalValue: 125000,
      }),
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-002',
        orderDate: '2024-01-20',
        deliveryDate: '2024-02-15',
        status: 'Delivered',
        totalValue: 85000,
      }),
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-003',
        orderDate: '2024-02-01',
        deliveryDate: '2024-02-28',
        status: 'In Transit',
        totalValue: 45000,
      }),
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-004',
        orderDate: '2024-02-10',
        deliveryDate: '2024-03-05',
        status: 'Pending',
        totalValue: 200000,
      }),
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-005',
        orderDate: '2024-02-15',
        deliveryDate: '2024-03-10',
        status: 'Confirmed',
        totalValue: 75000,
      }),
      this.createNode('SupplierPO', {
        poNumber: 'PO-2024-006',
        orderDate: '2024-02-20',
        deliveryDate: '2024-03-15',
        status: 'Pending',
        totalValue: 150000,
      }),
    ];

    // Link POs to suppliers
    this.createRelationship('ORDERED_FROM', purchaseOrders[0].id, suppliers[0].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[1].id, suppliers[2].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[2].id, suppliers[1].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[3].id, suppliers[0].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[4].id, suppliers[3].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[5].id, suppliers[2].id, {});

    // ===== WARRANTIES =====
    const warranties = [
      this.createNode('Warranty', {
        warrantyId: 'WRN-001',
        type: 'Standard',
        startDate: '2024-03-01',
        endDate: '2026-03-01',
        coverage: 'Full Parts & Labor',
      }),
      this.createNode('Warranty', {
        warrantyId: 'WRN-002',
        type: 'Extended',
        startDate: '2024-02-15',
        endDate: '2027-02-15',
        coverage: 'Full Parts & Labor + On-site',
      }),
      this.createNode('Warranty', {
        warrantyId: 'WRN-003',
        type: 'Premium',
        startDate: '2024-03-10',
        endDate: '2029-03-10',
        coverage: 'Comprehensive + Preventive Maintenance',
      }),
    ];

    // Link warranties to assemblies
    this.createRelationship('HAS_WARRANTY', assemblies[0].id, warranties[0].id, {});
    this.createRelationship('HAS_WARRANTY', assemblies[1].id, warranties[1].id, {});
    this.createRelationship('HAS_WARRANTY', assemblies[2].id, warranties[2].id, {});

    // ===== SERVICE RECORDS =====
    const serviceRecords = [
      this.createNode('ServiceRecord', {
        serviceId: 'SVC-001',
        date: '2024-04-15',
        type: 'Preventive Maintenance',
        technician: 'John Smith',
        duration: 4,
        notes: 'Routine inspection and lubrication',
      }),
      this.createNode('ServiceRecord', {
        serviceId: 'SVC-002',
        date: '2024-05-01',
        type: 'Corrective Maintenance',
        technician: 'Maria Garcia',
        duration: 8,
        notes: 'Replaced worn bearing',
      }),
      this.createNode('ServiceRecord', {
        serviceId: 'SVC-003',
        date: '2024-05-10',
        type: 'Calibration',
        technician: 'David Chen',
        duration: 2,
        notes: 'Sensor calibration and verification',
      }),
    ];

    // Link service records to assemblies
    this.createRelationship('HAS_SERVICE_RECORD', assemblies[0].id, serviceRecords[0].id, {});
    this.createRelationship('HAS_SERVICE_RECORD', assemblies[0].id, serviceRecords[1].id, {});
    this.createRelationship('HAS_SERVICE_RECORD', assemblies[3].id, serviceRecords[2].id, {});

    // ===== FAILURES =====
    const failures = [
      this.createNode('Failure', {
        failureId: 'FLR-001',
        date: '2024-04-28',
        severity: 'Medium',
        description: 'Bearing premature wear detected',
        impactLevel: 'Production Delay',
      }),
      this.createNode('Failure', {
        failureId: 'FLR-002',
        date: '2024-05-05',
        severity: 'High',
        description: 'Motor controller overheat',
        impactLevel: 'Line Stoppage',
      }),
    ];

    // ===== ROOT CAUSES =====
    const rootCauses = [
      this.createNode('RootCause', {
        causeId: 'RC-001',
        category: 'Material Defect',
        description: 'Bearing steel hardness below specification',
        contributingFactors: ['Supplier quality issue', 'Incoming inspection gap'],
      }),
      this.createNode('RootCause', {
        causeId: 'RC-002',
        category: 'Design Issue',
        description: 'Insufficient thermal dissipation capacity',
        contributingFactors: ['Undersized heat sink', 'High ambient temperature'],
      }),
    ];

    // Link failures to root causes and parts
    this.createRelationship('CAUSED_BY', failures[0].id, rootCauses[0].id, {});
    this.createRelationship('RELATED_TO_FAILURE', parts[0].id, failures[0].id, {});
    this.createRelationship('CAUSED_BY', failures[1].id, rootCauses[1].id, {});
    this.createRelationship('RELATED_TO_FAILURE', parts[1].id, failures[1].id, {});

    // ===== QUALITY INSPECTIONS =====
    const inspections = [
      this.createNode('QualityInspection', {
        inspectionId: 'QI-001',
        date: '2024-02-01',
        inspector: 'Quality Team A',
        type: 'Incoming Inspection',
        result: 'Pass',
        score: 98,
      }),
      this.createNode('QualityInspection', {
        inspectionId: 'QI-002',
        date: '2024-02-15',
        inspector: 'Quality Team B',
        type: 'In-Process Inspection',
        result: 'Pass with Deviation',
        score: 92,
      }),
      this.createNode('QualityInspection', {
        inspectionId: 'QI-003',
        date: '2024-02-28',
        inspector: 'Quality Team A',
        type: 'Final Inspection',
        result: 'Pass',
        score: 99,
      }),
      this.createNode('QualityInspection', {
        inspectionId: 'QI-004',
        date: '2024-03-01',
        inspector: 'Quality Team C',
        type: 'Incoming Inspection',
        result: 'Fail',
        score: 65,
      }),
    ];

    // Link inspections to parts
    this.createRelationship('QUALITY_CHECKED', parts[0].id, inspections[0].id, {});
    this.createRelationship('QUALITY_CHECKED', parts[1].id, inspections[1].id, {});
    this.createRelationship('QUALITY_CHECKED', assemblies[0].id, inspections[2].id, {});
    this.createRelationship('QUALITY_CHECKED', parts[4].id, inspections[3].id, {});

    // ===== DEVIATIONS =====
    const deviations = [
      this.createNode('Deviation', {
        deviationId: 'DEV-001',
        date: '2024-02-15',
        type: 'Dimensional',
        description: 'Shaft diameter 0.02mm under nominal',
        disposition: 'Use As-Is',
        approvedBy: 'Engineering Review Board',
      }),
      this.createNode('Deviation', {
        deviationId: 'DEV-002',
        date: '2024-03-01',
        type: 'Material',
        description: 'Motor windings resistance 5% above spec',
        disposition: 'Rejected - Return to Supplier',
        approvedBy: 'Quality Manager',
      }),
    ];

    // Link deviations to inspections
    this.createRelationship('HAS_DEVIATION', inspections[1].id, deviations[0].id, {});
    this.createRelationship('HAS_DEVIATION', inspections[3].id, deviations[1].id, {});

    // Create initial snapshot
    this.createSnapshot('Initial data load');
  }
}

// Singleton instance
let graphInstance: KuzuGraph | null = null;

export function getGraphDatabase(): KuzuGraph {
  if (!graphInstance) {
    graphInstance = new KuzuGraph();
  }
  return graphInstance;
}

export function resetGraphDatabase(): KuzuGraph {
  graphInstance = new KuzuGraph();
  return graphInstance;
}
