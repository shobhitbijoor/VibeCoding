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

  // ========== SPECIFIC QUERY METHODS ==========
  
  // Get all customers
  getAllCustomers(): Node[] {
    return this.getNodesByLabel('Customer');
  }

  // Get all assemblies for a customer
  getCustomerAssemblies(customerId: string): Node[] {
    // Find assemblies connected to this customer via locations
    const customerLocations = this.getConnectedNodes(customerId, 'COMMISSIONED_AT', 'out');
    const assemblies: Node[] = [];
    
    // Also check direct relationships
    const directAssemblies = this.getConnectedNodes(customerId, undefined, 'out')
      .filter(n => n.label === 'Assembly');
    assemblies.push(...directAssemblies);
    
    // Check assemblies at customer locations
    customerLocations.forEach(loc => {
      const locAssemblies = this.getConnectedNodes(loc.id, undefined, 'in')
        .filter(n => n.label === 'Assembly');
      assemblies.push(...locAssemblies);
    });
    
    // Also search by customer name in assembly properties
    const customer = this.getNodeById(customerId);
    if (customer) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      allAssemblies.forEach(asm => {
        if (!assemblies.find(a => a.id === asm.id)) {
          assemblies.push(asm);
        }
      });
    }
    
    return assemblies;
  }

  // Get all parts in an assembly
  getAssemblyParts(assemblyId: string): Node[] {
    // Try to find by ID first
    let assembly = this.getNodeById(assemblyId);
    
    // If not found, try to find by assembly number or name
    if (!assembly) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      const searchTerm = assemblyId.toLowerCase();
      assembly = allAssemblies.find(a => 
        a.properties.assemblyNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.serialNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.name?.toString().toLowerCase().includes(searchTerm)
      );
    }
    
    if (!assembly) {
      return [];
    }
    
    return this.getConnectedNodes(assembly.id, 'CONTAINS_PART', 'out');
  }

  // Get suppliers for a part
  getPartSuppliers(partId: string): Node[] {
    let part = this.getNodeById(partId);
    
    if (!part) {
      const allParts = this.getNodesByLabel('Part');
      part = allParts.find(p => 
        p.properties.partNumber === partId ||
        p.properties.name?.toString().toLowerCase().includes(partId.toLowerCase())
      );
    }
    
    if (!part) {
      return [];
    }
    
    return this.getConnectedNodes(part.id, 'SUPPLIED_BY', 'out');
  }

  // Get service history for an assembly
  getAssemblyServiceHistory(assemblyId: string): Node[] {
    let assembly = this.getNodeById(assemblyId);
    
    if (!assembly) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      const searchTerm = assemblyId.toLowerCase();
      assembly = allAssemblies.find(a => 
        a.properties.assemblyNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.serialNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.name?.toString().toLowerCase().includes(searchTerm)
      );
    }
    
    if (!assembly) {
      return [];
    }
    
    return this.getConnectedNodes(assembly.id, 'HAS_SERVICE_RECORD', 'out');
  }

  // Get failures for an assembly
  getAssemblyFailures(assemblyId: string): Node[] {
    let assembly = this.getNodeById(assemblyId);
    
    if (!assembly) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      const searchTerm = assemblyId.toLowerCase();
      assembly = allAssemblies.find(a => 
        a.properties.assemblyNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.serialNumber?.toString().toLowerCase() === searchTerm ||
        a.properties.name?.toString().toLowerCase().includes(searchTerm)
      );
    }
    
    if (!assembly) {
      return [];
    }
    
    return this.getConnectedNodes(assembly.id, 'RELATED_TO_FAILURE', 'out');
  }

  // Get root causes for failures of an assembly
  getFailureRootCauses(assemblyId: string): Array<{failure: Node, rootCauses: Node[]}> {
    const failures = this.getAssemblyFailures(assemblyId);
    return failures.map(failure => ({
      failure,
      rootCauses: this.getConnectedNodes(failure.id, 'CAUSED_BY', 'out')
    }));
  }

  // Get parts by lot number
  getPartsByLot(lotNumber: string): Node[] {
    const allParts = this.getNodesByLabel('Part');
    return allParts.filter(p => 
      p.properties.lotNumber?.toString().toLowerCase().includes(lotNumber.toLowerCase())
    );
  }

  // Get purchase orders for a supplier
  getSupplierPurchaseOrders(supplierId: string): Node[] {
    let supplier = this.getNodeById(supplierId);
    
    if (!supplier) {
      const allSuppliers = this.getNodesByLabel('Supplier');
      supplier = allSuppliers.find(s => 
        s.properties.name?.toString().toLowerCase().includes(supplierId.toLowerCase())
      );
    }
    
    if (!supplier) {
      return [];
    }
    
    return this.getConnectedNodes(supplier.id, 'ORDERED_FROM', 'in');
  }

  // Get parts supplied by a supplier
  getPartsBySupplier(supplierId: string): Node[] {
    let supplier = this.getNodeById(supplierId);
    
    if (!supplier) {
      const allSuppliers = this.getNodesByLabel('Supplier');
      supplier = allSuppliers.find(s => 
        s.properties.name?.toString().toLowerCase().includes(supplierId.toLowerCase())
      );
    }
    
    if (!supplier) {
      return [];
    }
    
    return this.getConnectedNodes(supplier.id, 'SUPPLIED_BY', 'in');
  }

  // Get assemblies manufactured at a plant
  getAssembliesByPlant(plantId: string): Node[] {
    let plant = this.getNodeById(plantId);
    
    if (!plant) {
      const allPlants = this.getNodesByLabel('Plant');
      plant = allPlants.find(p => 
        p.properties.name?.toString().toLowerCase().includes(plantId.toLowerCase())
      );
    }
    
    if (!plant) {
      return [];
    }
    
    return this.getConnectedNodes(plant.id, 'MANUFACTURED_AT', 'in');
  }

  // Get parts processed at a station
  getPartsAtStation(stationId: string): Node[] {
    let station = this.getNodeById(stationId);
    
    if (!station) {
      const allStations = this.getNodesByLabel('Station');
      station = allStations.find(s => 
        s.properties.name?.toString().toLowerCase().includes(stationId.toLowerCase())
      );
    }
    
    if (!station) {
      return [];
    }
    
    return this.getConnectedNodes(station.id, 'PROCESSED_AT', 'in');
  }

  // Get quality inspections for a part
  getQualityInspections(partId: string): Node[] {
    let part = this.getNodeById(partId);
    
    if (!part) {
      const allParts = this.getNodesByLabel('Part');
      part = allParts.find(p => 
        p.properties.partNumber === partId ||
        p.properties.name?.toString().toLowerCase().includes(partId.toLowerCase())
      );
    }
    
    if (!part) {
      return [];
    }
    
    return this.getConnectedNodes(part.id, 'INSPECTED_BY', 'out');
  }

  // Get assemblies by warranty status
  getAssembliesByWarrantyStatus(): { active: Node[]; expired: Node[]; expiringSoon: Node[] } {
    const assemblies = this.getNodesByLabel('Assembly');
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const result = {
      active: [] as Node[],
      expired: [] as Node[],
      expiringSoon: [] as Node[],
    };
    
    assemblies.forEach(asm => {
      const warrantyEnd = asm.properties.warrantyEnd 
        ? new Date(asm.properties.warrantyEnd as string)
        : null;
      
      if (!warrantyEnd) {
        result.active.push(asm);
      } else if (warrantyEnd < now) {
        result.expired.push(asm);
      } else if (warrantyEnd < thirtyDaysFromNow) {
        result.expiringSoon.push(asm);
      } else {
        result.active.push(asm);
      }
    });
    
    return result;
  }

  // Get locations for a customer
  getCustomerLocations(customerId: string): Node[] {
    let customer = this.getNodeById(customerId);
    
    if (!customer) {
      const allCustomers = this.getNodesByLabel('Customer');
      customer = allCustomers.find(c => 
        c.properties.name?.toString().toLowerCase().includes(customerId.toLowerCase())
      );
    }
    
    if (!customer) {
      return [];
    }
    
    return this.getConnectedNodes(customer.id, 'COMMISSIONED_AT', 'out');
  }

  // Get all suppliers
  getAllSuppliers(): Node[] {
    return this.getNodesByLabel('Supplier');
  }

  // Get all assemblies
  getAllAssemblies(): Node[] {
    return this.getNodesByLabel('Assembly');
  }

  // Get all parts
  getAllParts(): Node[] {
    return this.getNodesByLabel('Part');
  }

  // Search nodes by name or property value
  searchNodes(searchTerm: string): Node[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.nodes.values()).filter(node => {
      const props = node.properties;
      return Object.values(props).some(val => 
        val?.toString().toLowerCase().includes(term)
      );
    });
  }

  // Get all failures
  getAllFailures(): Node[] {
    return this.getNodesByLabel('Failure');
  }

  // Get all root causes
  getAllRootCauses(): Node[] {
    return this.getNodesByLabel('RootCause');
  }

  // Get failure by ID or failure ID
  getFailureById(failureId: string): Node | undefined {
    let failure = this.getNodeById(failureId);
    if (!failure) {
      const allFailures = this.getNodesByLabel('Failure');
      failure = allFailures.find(f => 
        f.properties.failureId?.toString().toLowerCase() === failureId.toLowerCase()
      );
    }
    return failure;
  }

  // Get root cause for a failure
  getRootCauseForFailure(failureId: string): Node[] {
    const failure = this.getFailureById(failureId);
    if (!failure) return [];
    return this.getConnectedNodes(failure.id, 'CAUSED_BY', 'out');
  }

  // Get assembly for a failure
  getAssemblyForFailure(failureId: string): Node | undefined {
    const failure = this.getFailureById(failureId);
    if (!failure) return undefined;
    
    // Check the failure's assemblyAffected property
    const assemblyNumber = failure.properties.assemblyAffected as string;
    if (assemblyNumber) {
      const assemblies = this.getNodesByLabel('Assembly');
      return assemblies.find(a => a.properties.assemblyNumber === assemblyNumber);
    }
    
    // Also check relationships
    const related = this.getConnectedNodes(failure.id, 'RELATED_TO_FAILURE', 'in');
    return related.find(n => n.label === 'Assembly');
  }

  // Get part that caused a failure
  getPartForFailure(failureId: string): Node | undefined {
    const failure = this.getFailureById(failureId);
    if (!failure) return undefined;
    
    // Check the failure's partAffected property
    const partNumber = failure.properties.partAffected as string;
    if (partNumber) {
      const parts = this.getNodesByLabel('Part');
      return parts.find(p => p.properties.partNumber === partNumber);
    }
    
    // Also check relationships
    const related = this.getConnectedNodes(failure.id, 'RELATED_TO_FAILURE', 'in');
    return related.find(n => n.label === 'Part');
  }

  // Get full traceability for a part
  getPartTraceability(partId: string): {
    part: Node | undefined;
    supplier: Node | undefined;
    purchaseOrder: Node | undefined;
    warehouse: Node | undefined;
    plant: Node | undefined;
    station: Node | undefined;
    assemblies: Node[];
    inspections: Node[];
    deviations: Node[];
  } {
    let part = this.getNodeById(partId);
    if (!part) {
      const allParts = this.getNodesByLabel('Part');
      part = allParts.find(p => 
        p.properties.partNumber?.toString().toLowerCase() === partId.toLowerCase() ||
        p.properties.name?.toString().toLowerCase().includes(partId.toLowerCase())
      );
    }
    
    if (!part) {
      return {
        part: undefined,
        supplier: undefined,
        purchaseOrder: undefined,
        warehouse: undefined,
        plant: undefined,
        station: undefined,
        assemblies: [],
        inspections: [],
        deviations: [],
      };
    }

    const suppliers = this.getConnectedNodes(part.id, 'SUPPLIED_BY', 'out');
    const pos = this.getConnectedNodes(part.id, 'SOURCED_FROM', 'out');
    const warehouses = this.getConnectedNodes(part.id, 'STORED_AT', 'out');
    const plants = this.getConnectedNodes(part.id, 'MANUFACTURED_AT', 'out');
    const stations = this.getConnectedNodes(part.id, 'PROCESSED_AT', 'out');
    const assemblies = this.getConnectedNodes(part.id, 'CONTAINS_PART', 'in');
    const inspections = this.getConnectedNodes(part.id, 'INSPECTED_BY', 'out');
    const deviations = this.getConnectedNodes(part.id, 'HAS_DEVIATION', 'out');

    return {
      part,
      supplier: suppliers[0],
      purchaseOrder: pos[0],
      warehouse: warehouses[0],
      plant: plants[0],
      station: stations[0],
      assemblies,
      inspections,
      deviations,
    };
  }

  // Get full traceability for an assembly
  getAssemblyTraceability(assemblyId: string): {
    assembly: Node | undefined;
    customer: Node | undefined;
    location: Node | undefined;
    warranty: Node | undefined;
    parts: Node[];
    serviceRecords: Node[];
    failures: Node[];
    inspections: Node[];
    deviations: Node[];
  } {
    let assembly = this.getNodeById(assemblyId);
    if (!assembly) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      assembly = allAssemblies.find(a => 
        a.properties.assemblyNumber?.toString().toLowerCase() === assemblyId.toLowerCase() ||
        a.properties.name?.toString().toLowerCase().includes(assemblyId.toLowerCase())
      );
    }

    if (!assembly) {
      return {
        assembly: undefined,
        customer: undefined,
        location: undefined,
        warranty: undefined,
        parts: [],
        serviceRecords: [],
        failures: [],
        inspections: [],
        deviations: [],
      };
    }

    const locations = this.getConnectedNodes(assembly.id, 'COMMISSIONED_AT', 'out');
    const location = locations[0];
    
    // Find customer from location
    let customer: Node | undefined;
    if (location) {
      const customers = this.getConnectedNodes(location.id, 'COMMISSIONED_AT', 'in').filter(n => n.label === 'Customer');
      customer = customers[0];
    }

    const warranties = this.getConnectedNodes(assembly.id, 'HAS_WARRANTY', 'out');
    const parts = this.getConnectedNodes(assembly.id, 'CONTAINS_PART', 'out');
    const serviceRecords = this.getConnectedNodes(assembly.id, 'HAS_SERVICE_RECORD', 'out');
    const failures = this.getConnectedNodes(assembly.id, 'RELATED_TO_FAILURE', 'out');
    const inspections = this.getConnectedNodes(assembly.id, 'INSPECTED_BY', 'out');
    const deviations = this.getConnectedNodes(assembly.id, 'HAS_DEVIATION', 'out');

    return {
      assembly,
      customer,
      location,
      warranty: warranties[0],
      parts,
      serviceRecords,
      failures,
      inspections,
      deviations,
    };
  }

  // Get parts from same lot
  getPartsFromSameLot(partId: string): Node[] {
    let part = this.getNodeById(partId);
    if (!part) {
      const allParts = this.getNodesByLabel('Part');
      part = allParts.find(p => 
        p.properties.partNumber?.toString().toLowerCase() === partId.toLowerCase()
      );
    }
    if (!part) return [];

    const lotNumber = part.properties.lotNumber as string;
    if (!lotNumber) return [];

    return this.getNodesByLabel('Part').filter(p => 
      p.properties.lotNumber === lotNumber
    );
  }

  // Get deviations for part
  getDeviationsForPart(partId: string): Node[] {
    let part = this.getNodeById(partId);
    if (!part) {
      const allParts = this.getNodesByLabel('Part');
      part = allParts.find(p => 
        p.properties.partNumber?.toString().toLowerCase() === partId.toLowerCase()
      );
    }
    if (!part) return [];
    return this.getConnectedNodes(part.id, 'HAS_DEVIATION', 'out');
  }

  // Get deviations for assembly
  getDeviationsForAssembly(assemblyId: string): Node[] {
    let assembly = this.getNodeById(assemblyId);
    if (!assembly) {
      const allAssemblies = this.getNodesByLabel('Assembly');
      assembly = allAssemblies.find(a => 
        a.properties.assemblyNumber?.toString().toLowerCase() === assemblyId.toLowerCase()
      );
    }
    if (!assembly) return [];
    return this.getConnectedNodes(assembly.id, 'HAS_DEVIATION', 'out');
  }

  // Initialize with comprehensive dummy data
  // REQUIREMENTS:
  // 1. No cross-joins - each assembly is installed at SPECIFIC customer locations only
  // 2. No duplicates - unique IDs and clear relationships
  // 3. At least 50 customer installations
  // 4. One supplier can supply multiple parts
  // 5. One part can be in multiple assemblies
  // 6. One finished good can be installed at multiple customers/sites
  // 7. Cohort tracing - same supplier parts in same assembly at different locations
  // 8. Inspection records and deviations link to root causes
  private initializeWithDummyData(): void {
    // ===== CUSTOMERS (10 customers) =====
    const customers = [
      this.createNode('Customer', { customerId: 'CUST-001', name: 'Acme Manufacturing Co.', industry: 'Automotive', region: 'North America', contractStart: '2022-01-15', tier: 'Enterprise' }),
      this.createNode('Customer', { customerId: 'CUST-002', name: 'Global Motors Inc.', industry: 'Automotive', region: 'Europe', contractStart: '2021-06-01', tier: 'Enterprise' }),
      this.createNode('Customer', { customerId: 'CUST-003', name: 'Pacific Aerospace Ltd.', industry: 'Aerospace', region: 'Asia Pacific', contractStart: '2023-03-10', tier: 'Premium' }),
      this.createNode('Customer', { customerId: 'CUST-004', name: 'Industrial Solutions GmbH', industry: 'Industrial Equipment', region: 'Europe', contractStart: '2022-09-20', tier: 'Standard' }),
      this.createNode('Customer', { customerId: 'CUST-005', name: 'TechDrive Systems', industry: 'Electric Vehicles', region: 'North America', contractStart: '2024-01-01', tier: 'Enterprise' }),
      this.createNode('Customer', { customerId: 'CUST-006', name: 'Nordic Power Systems', industry: 'Energy', region: 'Europe', contractStart: '2023-05-15', tier: 'Premium' }),
      this.createNode('Customer', { customerId: 'CUST-007', name: 'Asia Tech Industries', industry: 'Electronics', region: 'Asia Pacific', contractStart: '2022-11-01', tier: 'Enterprise' }),
      this.createNode('Customer', { customerId: 'CUST-008', name: 'Southern Rail Corp.', industry: 'Transportation', region: 'North America', contractStart: '2023-02-20', tier: 'Standard' }),
      this.createNode('Customer', { customerId: 'CUST-009', name: 'MedTech Innovations', industry: 'Medical Devices', region: 'Europe', contractStart: '2024-03-01', tier: 'Premium' }),
      this.createNode('Customer', { customerId: 'CUST-010', name: 'Desert Mining Corp.', industry: 'Mining', region: 'Australia', contractStart: '2023-08-10', tier: 'Enterprise' }),
    ];

    // ===== CUSTOMER LOCATIONS (25 locations - multiple per customer) =====
    const locations = [
      // CUST-001 Acme Manufacturing - 3 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-001', customerId: 'CUST-001', address: '123 Industrial Blvd, Detroit, MI 48201', locationType: 'Manufacturing Plant', country: 'USA', timezone: 'EST', siteName: 'Detroit Plant' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-002', customerId: 'CUST-001', address: '456 Assembly Way, Cleveland, OH 44101', locationType: 'Assembly Plant', country: 'USA', timezone: 'EST', siteName: 'Cleveland Plant' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-003', customerId: 'CUST-001', address: '789 Production Rd, Toledo, OH 43601', locationType: 'Testing Facility', country: 'USA', timezone: 'EST', siteName: 'Toledo Test Center' }),
      // CUST-002 Global Motors - 3 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-004', customerId: 'CUST-002', address: '100 Auto Way, Munich, Germany 80331', locationType: 'Assembly Plant', country: 'Germany', timezone: 'CET', siteName: 'Munich Plant' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-005', customerId: 'CUST-002', address: '200 Factory Rd, Stuttgart, Germany 70173', locationType: 'Manufacturing Plant', country: 'Germany', timezone: 'CET', siteName: 'Stuttgart Plant' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-006', customerId: 'CUST-002', address: '300 Engine Blvd, Hamburg, Germany 20095', locationType: 'Engine Plant', country: 'Germany', timezone: 'CET', siteName: 'Hamburg Plant' }),
      // CUST-003 Pacific Aerospace - 3 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-007', customerId: 'CUST-003', address: '50 Tech Park, Shanghai, China 200000', locationType: 'R&D Center', country: 'China', timezone: 'CST', siteName: 'Shanghai R&D' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-008', customerId: 'CUST-003', address: '60 Assembly Lane, Tokyo, Japan 100-0001', locationType: 'Assembly Plant', country: 'Japan', timezone: 'JST', siteName: 'Tokyo Assembly' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-009', customerId: 'CUST-003', address: '70 Aerospace Dr, Singapore 018956', locationType: 'MRO Facility', country: 'Singapore', timezone: 'SGT', siteName: 'Singapore MRO' }),
      // CUST-004 Industrial Solutions - 2 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-010', customerId: 'CUST-004', address: '400 Industrial Park, Frankfurt, Germany 60311', locationType: 'Manufacturing Plant', country: 'Germany', timezone: 'CET', siteName: 'Frankfurt Plant' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-011', customerId: 'CUST-004', address: '500 Machine Way, Vienna, Austria 1010', locationType: 'Service Center', country: 'Austria', timezone: 'CET', siteName: 'Vienna Service' }),
      // CUST-005 TechDrive - 3 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-012', customerId: 'CUST-005', address: '600 Innovation Dr, San Jose, CA 95112', locationType: 'Headquarters', country: 'USA', timezone: 'PST', siteName: 'San Jose HQ' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-013', customerId: 'CUST-005', address: '700 Production Ave, Austin, TX 78701', locationType: 'Gigafactory', country: 'USA', timezone: 'CST', siteName: 'Austin Gigafactory' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-014', customerId: 'CUST-005', address: '800 Battery Blvd, Reno, NV 89501', locationType: 'Battery Plant', country: 'USA', timezone: 'PST', siteName: 'Reno Battery Plant' }),
      // CUST-006 Nordic Power - 2 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-015', customerId: 'CUST-006', address: '900 Wind Way, Copenhagen, Denmark 1050', locationType: 'Wind Farm', country: 'Denmark', timezone: 'CET', siteName: 'Copenhagen Wind' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-016', customerId: 'CUST-006', address: '1000 Solar Rd, Oslo, Norway 0150', locationType: 'Solar Plant', country: 'Norway', timezone: 'CET', siteName: 'Oslo Solar' }),
      // CUST-007 Asia Tech - 3 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-017', customerId: 'CUST-007', address: '1100 Tech Ave, Taipei, Taiwan 100', locationType: 'Fab Plant', country: 'Taiwan', timezone: 'CST', siteName: 'Taipei Fab' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-018', customerId: 'CUST-007', address: '1200 Chip Rd, Seoul, South Korea 04524', locationType: 'Assembly Plant', country: 'South Korea', timezone: 'KST', siteName: 'Seoul Assembly' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-019', customerId: 'CUST-007', address: '1300 Memory Blvd, Shenzhen, China 518000', locationType: 'Test Facility', country: 'China', timezone: 'CST', siteName: 'Shenzhen Test' }),
      // CUST-008 Southern Rail - 2 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-020', customerId: 'CUST-008', address: '1400 Rail Way, Atlanta, GA 30301', locationType: 'Maintenance Depot', country: 'USA', timezone: 'EST', siteName: 'Atlanta Depot' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-021', customerId: 'CUST-008', address: '1500 Track Ave, Houston, TX 77001', locationType: 'Service Center', country: 'USA', timezone: 'CST', siteName: 'Houston Service' }),
      // CUST-009 MedTech - 2 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-022', customerId: 'CUST-009', address: '1600 Medical Dr, Zurich, Switzerland 8001', locationType: 'Clean Room', country: 'Switzerland', timezone: 'CET', siteName: 'Zurich Cleanroom' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-023', customerId: 'CUST-009', address: '1700 Device Blvd, Dublin, Ireland D01', locationType: 'Manufacturing', country: 'Ireland', timezone: 'GMT', siteName: 'Dublin Manufacturing' }),
      // CUST-010 Desert Mining - 2 locations
      this.createNode('CustomerLocation', { locationId: 'LOC-024', customerId: 'CUST-010', address: '1800 Mine Rd, Perth, WA 6000', locationType: 'Mining Site', country: 'Australia', timezone: 'AWST', siteName: 'Perth Mine' }),
      this.createNode('CustomerLocation', { locationId: 'LOC-025', customerId: 'CUST-010', address: '1900 Ore Blvd, Brisbane, QLD 4000', locationType: 'Processing Plant', country: 'Australia', timezone: 'AEST', siteName: 'Brisbane Processing' }),
    ];

    // Link customers to their locations (HAS_LOCATION relationship)
    const customerLocationMap: { [key: string]: number[] } = {
      'CUST-001': [0, 1, 2],
      'CUST-002': [3, 4, 5],
      'CUST-003': [6, 7, 8],
      'CUST-004': [9, 10],
      'CUST-005': [11, 12, 13],
      'CUST-006': [14, 15],
      'CUST-007': [16, 17, 18],
      'CUST-008': [19, 20],
      'CUST-009': [21, 22],
      'CUST-010': [23, 24],
    };

    customers.forEach((customer, custIdx) => {
      const custId = `CUST-00${custIdx + 1}`;
      const locIndices = customerLocationMap[custId] || [];
      locIndices.forEach(locIdx => {
        this.createRelationship('COMMISSIONED_AT', customer.id, locations[locIdx].id, { since: customer.properties.contractStart });
      });
    });

    // ===== SUPPLIERS (8 suppliers - each supplies multiple parts) =====
    const suppliers = [
      this.createNode('Supplier', { supplierId: 'SUP-001', name: 'PrecisionParts Co.', category: 'Precision Components', country: 'Japan', rating: 4.8, certifications: ['ISO 9001', 'IATF 16949'] }),
      this.createNode('Supplier', { supplierId: 'SUP-002', name: 'SteelWorks International', category: 'Raw Materials', country: 'Germany', rating: 4.5, certifications: ['ISO 9001', 'ISO 14001'] }),
      this.createNode('Supplier', { supplierId: 'SUP-003', name: 'ElectroComponents Ltd.', category: 'Electronics', country: 'Taiwan', rating: 4.7, certifications: ['ISO 9001', 'IPC-A-610'] }),
      this.createNode('Supplier', { supplierId: 'SUP-004', name: 'PolymerTech Inc.', category: 'Plastics & Polymers', country: 'USA', rating: 4.3, certifications: ['ISO 9001'] }),
      this.createNode('Supplier', { supplierId: 'SUP-005', name: 'CastMaster Foundry', category: 'Cast Components', country: 'India', rating: 4.2, certifications: ['ISO 9001', 'IATF 16949'] }),
      this.createNode('Supplier', { supplierId: 'SUP-006', name: 'MicroSensor AG', category: 'Sensors', country: 'Switzerland', rating: 4.9, certifications: ['ISO 9001', 'AS9100'] }),
      this.createNode('Supplier', { supplierId: 'SUP-007', name: 'PowerCell Solutions', category: 'Batteries', country: 'South Korea', rating: 4.6, certifications: ['ISO 9001', 'ISO 14001'] }),
      this.createNode('Supplier', { supplierId: 'SUP-008', name: 'HydrauliCore Ltd.', category: 'Hydraulics', country: 'UK', rating: 4.4, certifications: ['ISO 9001', 'IATF 16949'] }),
    ];

    // ===== PLANTS (5 plants) =====
    const plants = [
      this.createNode('Plant', { plantCode: 'PLT-001', name: 'Detroit Manufacturing Hub', country: 'USA', capacity: 50000, type: 'Assembly' }),
      this.createNode('Plant', { plantCode: 'PLT-002', name: 'Munich Precision Works', country: 'Germany', capacity: 35000, type: 'Machining' }),
      this.createNode('Plant', { plantCode: 'PLT-003', name: 'Shanghai Tech Center', country: 'China', capacity: 80000, type: 'Electronics Assembly' }),
      this.createNode('Plant', { plantCode: 'PLT-004', name: 'Tokyo Quality Center', country: 'Japan', capacity: 25000, type: 'Testing' }),
      this.createNode('Plant', { plantCode: 'PLT-005', name: 'Austin Integration Facility', country: 'USA', capacity: 45000, type: 'Integration' }),
    ];

    // ===== STATIONS (10 stations across plants) =====
    const stations = [
      this.createNode('Station', { stationCode: 'STA-001', name: 'CNC Machining Station A1', plantCode: 'PLT-002', type: 'CNC Machining', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-002', name: 'SMT Line 1', plantCode: 'PLT-003', type: 'Surface Mount', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-003', name: 'Final Assembly Line 3', plantCode: 'PLT-001', type: 'Assembly', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-004', name: 'Quality Inspection Bay', plantCode: 'PLT-001', type: 'Inspection', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-005', name: 'Paint & Coating Line', plantCode: 'PLT-001', type: 'Finishing', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-006', name: 'Motor Assembly Line', plantCode: 'PLT-001', type: 'Assembly', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-007', name: 'PCB Assembly Line 2', plantCode: 'PLT-003', type: 'Electronics Assembly', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-008', name: 'Thermal Testing Chamber', plantCode: 'PLT-004', type: 'Testing', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-009', name: 'Integration Bay 1', plantCode: 'PLT-005', type: 'Integration', status: 'Active' }),
      this.createNode('Station', { stationCode: 'STA-010', name: 'Final Test Station', plantCode: 'PLT-005', type: 'Testing', status: 'Active' }),
    ];

    // Link stations to plants
    this.createRelationship('PROCESSED_AT', stations[0].id, plants[1].id, {});
    this.createRelationship('PROCESSED_AT', stations[1].id, plants[2].id, {});
    this.createRelationship('PROCESSED_AT', stations[2].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[3].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[4].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[5].id, plants[0].id, {});
    this.createRelationship('PROCESSED_AT', stations[6].id, plants[2].id, {});
    this.createRelationship('PROCESSED_AT', stations[7].id, plants[3].id, {});
    this.createRelationship('PROCESSED_AT', stations[8].id, plants[4].id, {});
    this.createRelationship('PROCESSED_AT', stations[9].id, plants[4].id, {});

    // ===== WAREHOUSES (5 warehouses) =====
    const warehouses = [
      this.createNode('Warehouse', { warehouseCode: 'WH-001', name: 'Central Distribution Center', location: 'Chicago, IL', capacity: 100000, type: 'Distribution' }),
      this.createNode('Warehouse', { warehouseCode: 'WH-002', name: 'Raw Materials Storage', location: 'Detroit, MI', capacity: 50000, type: 'Raw Materials' }),
      this.createNode('Warehouse', { warehouseCode: 'WH-003', name: 'Finished Goods Warehouse', location: 'Los Angeles, CA', capacity: 75000, type: 'Finished Goods' }),
      this.createNode('Warehouse', { warehouseCode: 'WH-004', name: 'European Hub', location: 'Rotterdam, Netherlands', capacity: 60000, type: 'Distribution' }),
      this.createNode('Warehouse', { warehouseCode: 'WH-005', name: 'Asia Pacific Center', location: 'Singapore', capacity: 40000, type: 'Distribution' }),
    ];

    // ===== PARTS (20 parts - many supplied by same suppliers, used in multiple assemblies) =====
    // Creating parts in lots to enable cohort tracing
    const parts = [
      // Supplier SUP-001 (PrecisionParts Co.) supplies multiple parts
      this.createNode('Part', { partNumber: 'PN-10001', name: 'High-Precision Bearing A', category: 'Mechanical', material: 'Stainless Steel 440C', unitCost: 45.5, lotNumber: 'LOT-2024-001A', supplierId: 'SUP-001' }),
      this.createNode('Part', { partNumber: 'PN-10001', name: 'High-Precision Bearing A', category: 'Mechanical', material: 'Stainless Steel 440C', unitCost: 45.5, lotNumber: 'LOT-2024-001B', supplierId: 'SUP-001' }),
      this.createNode('Part', { partNumber: 'PN-10001', name: 'High-Precision Bearing A', category: 'Mechanical', material: 'Stainless Steel 440C', unitCost: 45.5, lotNumber: 'LOT-2024-001C', supplierId: 'SUP-001' }),
      this.createNode('Part', { partNumber: 'PN-10002', name: 'Precision Shaft', category: 'Mechanical', material: 'Hardened Steel', unitCost: 65.0, lotNumber: 'LOT-2024-002A', supplierId: 'SUP-001' }),
      this.createNode('Part', { partNumber: 'PN-10002', name: 'Precision Shaft', category: 'Mechanical', material: 'Hardened Steel', unitCost: 65.0, lotNumber: 'LOT-2024-002B', supplierId: 'SUP-001' }),
      
      // Supplier SUP-003 (ElectroComponents Ltd.) supplies multiple parts
      this.createNode('Part', { partNumber: 'PN-10003', name: 'Motor Controller PCB', category: 'Electronics', material: 'FR-4 PCB', unitCost: 125.0, lotNumber: 'LOT-2024-003A', supplierId: 'SUP-003' }),
      this.createNode('Part', { partNumber: 'PN-10003', name: 'Motor Controller PCB', category: 'Electronics', material: 'FR-4 PCB', unitCost: 125.0, lotNumber: 'LOT-2024-003B', supplierId: 'SUP-003' }),
      this.createNode('Part', { partNumber: 'PN-10004', name: 'Power Connector Assembly', category: 'Electronics', material: 'Brass/Plastic', unitCost: 8.75, lotNumber: 'LOT-2024-004A', supplierId: 'SUP-003' }),
      this.createNode('Part', { partNumber: 'PN-10005', name: 'Capacitor Bank Module', category: 'Electronics', material: 'Aluminum Electrolytic', unitCost: 45.0, lotNumber: 'LOT-2024-005A', supplierId: 'SUP-003' }),
      this.createNode('Part', { partNumber: 'PN-10006', name: 'Temperature Sensor', category: 'Electronics', material: 'Silicon', unitCost: 18.5, lotNumber: 'LOT-2024-006A', supplierId: 'SUP-003' }),
      
      // Supplier SUP-002 (SteelWorks) supplies structural parts
      this.createNode('Part', { partNumber: 'PN-10007', name: 'Aluminum Housing', category: 'Structural', material: 'Aluminum 6061-T6', unitCost: 85.75, lotNumber: 'LOT-2024-007A', supplierId: 'SUP-002' }),
      this.createNode('Part', { partNumber: 'PN-10008', name: 'Steel Frame', category: 'Structural', material: 'Carbon Steel', unitCost: 120.0, lotNumber: 'LOT-2024-008A', supplierId: 'SUP-002' }),
      
      // Supplier SUP-004 (PolymerTech) supplies seals and thermal compounds
      this.createNode('Part', { partNumber: 'PN-10009', name: 'Rubber Seal Ring', category: 'Sealing', material: 'Viton FKM', unitCost: 3.25, lotNumber: 'LOT-2024-009A', supplierId: 'SUP-004' }),
      this.createNode('Part', { partNumber: 'PN-10010', name: 'Thermal Paste Compound', category: 'Consumable', material: 'Silver-Based Thermal Compound', unitCost: 12.5, lotNumber: 'LOT-2024-010A', supplierId: 'SUP-004' }),
      
      // Supplier SUP-005 (CastMaster) supplies cast components
      this.createNode('Part', { partNumber: 'PN-10011', name: 'Cast Iron Base', category: 'Structural', material: 'Cast Iron', unitCost: 95.0, lotNumber: 'LOT-2024-011A', supplierId: 'SUP-005' }),
      
      // Supplier SUP-006 (MicroSensor) supplies sensors
      this.createNode('Part', { partNumber: 'PN-10012', name: 'Vibration Sensor', category: 'Sensors', material: 'Piezoelectric', unitCost: 85.0, lotNumber: 'LOT-2024-012A', supplierId: 'SUP-006' }),
      this.createNode('Part', { partNumber: 'PN-10013', name: 'Pressure Transducer', category: 'Sensors', material: 'Stainless Steel', unitCost: 120.0, lotNumber: 'LOT-2024-013A', supplierId: 'SUP-006' }),
      
      // Supplier SUP-007 (PowerCell) supplies motors and batteries
      this.createNode('Part', { partNumber: 'PN-10014', name: 'Brushless DC Motor', category: 'Electrical', material: 'Copper/Steel/Magnets', unitCost: 275.0, lotNumber: 'LOT-2024-014A', supplierId: 'SUP-007' }),
      this.createNode('Part', { partNumber: 'PN-10014', name: 'Brushless DC Motor', category: 'Electrical', material: 'Copper/Steel/Magnets', unitCost: 275.0, lotNumber: 'LOT-2024-014B', supplierId: 'SUP-007' }),
      
      // Supplier SUP-008 (HydrauliCore) supplies cooling and hydraulic parts
      this.createNode('Part', { partNumber: 'PN-10015', name: 'Cooling Fan Unit', category: 'Thermal', material: 'Plastic/Aluminum', unitCost: 22.5, lotNumber: 'LOT-2024-015A', supplierId: 'SUP-008' }),
    ];

    // Link parts to their suppliers (each part linked to its designated supplier)
    // SUP-001 supplies parts 0-4
    parts.slice(0, 5).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[0].id, { leadTime: 14 });
    });
    // SUP-003 supplies parts 5-9
    parts.slice(5, 10).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[2].id, { leadTime: 21 });
    });
    // SUP-002 supplies parts 10-11
    parts.slice(10, 12).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[1].id, { leadTime: 10 });
    });
    // SUP-004 supplies parts 12-13
    parts.slice(12, 14).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[3].id, { leadTime: 7 });
    });
    // SUP-005 supplies part 14
    this.createRelationship('SUPPLIED_BY', parts[14].id, suppliers[4].id, { leadTime: 12 });
    // SUP-006 supplies parts 15-16
    parts.slice(15, 17).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[5].id, { leadTime: 18 });
    });
    // SUP-007 supplies parts 17-18
    parts.slice(17, 19).forEach(part => {
      this.createRelationship('SUPPLIED_BY', part.id, suppliers[6].id, { leadTime: 28 });
    });
    // SUP-008 supplies part 19
    this.createRelationship('SUPPLIED_BY', parts[19].id, suppliers[7].id, { leadTime: 15 });

    // Link parts to warehouses where they are stored
    parts.slice(0, 5).forEach(part => {
      this.createRelationship('STORED_AT', part.id, warehouses[1].id, { quantity: 1000 });
    });
    parts.slice(5, 10).forEach(part => {
      this.createRelationship('STORED_AT', part.id, warehouses[0].id, { quantity: 2000 });
    });
    parts.slice(10, 15).forEach(part => {
      this.createRelationship('STORED_AT', part.id, warehouses[3].id, { quantity: 500 });
    });
    parts.slice(15, 20).forEach(part => {
      this.createRelationship('STORED_AT', part.id, warehouses[4].id, { quantity: 300 });
    });

    // ===== ASSEMBLIES (8 assembly types - each installed at multiple specific locations) =====
    const assemblies: Node[] = [];
    const assemblyTypes = [
      { number: 'ASM-5001', name: 'Electric Drive Unit', version: '2.1', status: 'Production', complexity: 'High' },
      { number: 'ASM-5002', name: 'Power Electronics Module', version: '1.5', status: 'Production', complexity: 'High' },
      { number: 'ASM-5003', name: 'Thermal Management System', version: '3.0', status: 'Production', complexity: 'Medium' },
      { number: 'ASM-5004', name: 'Sensor Array Module', version: '1.2', status: 'Production', complexity: 'Medium' },
      { number: 'ASM-5005', name: 'Hydraulic Control Unit', version: '2.0', status: 'Production', complexity: 'High' },
      { number: 'ASM-5006', name: 'Battery Management System', version: '1.8', status: 'Production', complexity: 'High' },
      { number: 'ASM-5007', name: 'Motor Control Assembly', version: '2.5', status: 'Production', complexity: 'Medium' },
      { number: 'ASM-5008', name: 'Precision Gearbox', version: '1.0', status: 'Prototype', complexity: 'High' },
    ];

    // Create 60 assembly instances (to support 50+ installations)
    // Each assembly type gets multiple serial numbers installed at different locations
    let serialCounter = 1;
    const installationData: Array<{ asmIdx: number; locIdx: number; installDate: string }> = [
      // ASM-5001 Electric Drive Unit - installed at 8 locations
      { asmIdx: 0, locIdx: 0, installDate: '2024-01-15' }, // Detroit Plant
      { asmIdx: 0, locIdx: 1, installDate: '2024-01-20' }, // Cleveland Plant
      { asmIdx: 0, locIdx: 4, installDate: '2024-02-01' }, // Stuttgart Plant
      { asmIdx: 0, locIdx: 5, installDate: '2024-02-10' }, // Hamburg Plant
      { asmIdx: 0, locIdx: 12, installDate: '2024-02-15' }, // Austin Gigafactory
      { asmIdx: 0, locIdx: 13, installDate: '2024-02-20' }, // Reno Battery Plant
      { asmIdx: 0, locIdx: 17, installDate: '2024-03-01' }, // Seoul Assembly
      { asmIdx: 0, locIdx: 23, installDate: '2024-03-05' }, // Perth Mine
      
      // ASM-5002 Power Electronics Module - installed at 7 locations
      { asmIdx: 1, locIdx: 0, installDate: '2024-01-18' },
      { asmIdx: 1, locIdx: 3, installDate: '2024-01-25' },
      { asmIdx: 1, locIdx: 7, installDate: '2024-02-05' },
      { asmIdx: 1, locIdx: 11, installDate: '2024-02-12' },
      { asmIdx: 1, locIdx: 14, installDate: '2024-02-18' },
      { asmIdx: 1, locIdx: 16, installDate: '2024-02-25' },
      { asmIdx: 1, locIdx: 19, installDate: '2024-03-02' },
      
      // ASM-5003 Thermal Management System - installed at 8 locations
      { asmIdx: 2, locIdx: 1, installDate: '2024-01-22' },
      { asmIdx: 2, locIdx: 2, installDate: '2024-01-28' },
      { asmIdx: 2, locIdx: 6, installDate: '2024-02-03' },
      { asmIdx: 2, locIdx: 8, installDate: '2024-02-08' },
      { asmIdx: 2, locIdx: 12, installDate: '2024-02-14' },
      { asmIdx: 2, locIdx: 15, installDate: '2024-02-22' },
      { asmIdx: 2, locIdx: 20, installDate: '2024-03-01' },
      { asmIdx: 2, locIdx: 24, installDate: '2024-03-08' },
      
      // ASM-5004 Sensor Array Module - installed at 6 locations
      { asmIdx: 3, locIdx: 2, installDate: '2024-02-01' },
      { asmIdx: 3, locIdx: 6, installDate: '2024-02-06' },
      { asmIdx: 3, locIdx: 9, installDate: '2024-02-11' },
      { asmIdx: 3, locIdx: 17, installDate: '2024-02-16' },
      { asmIdx: 3, locIdx: 21, installDate: '2024-02-21' },
      { asmIdx: 3, locIdx: 23, installDate: '2024-02-26' },
      
      // ASM-5005 Hydraulic Control Unit - installed at 6 locations
      { asmIdx: 4, locIdx: 0, installDate: '2024-02-05' },
      { asmIdx: 4, locIdx: 4, installDate: '2024-02-10' },
      { asmIdx: 4, locIdx: 9, installDate: '2024-02-15' },
      { asmIdx: 4, locIdx: 10, installDate: '2024-02-20' },
      { asmIdx: 4, locIdx: 19, installDate: '2024-02-25' },
      { asmIdx: 4, locIdx: 24, installDate: '2024-03-01' },
      
      // ASM-5006 Battery Management System - installed at 8 locations
      { asmIdx: 5, locIdx: 11, installDate: '2024-02-08' },
      { asmIdx: 5, locIdx: 12, installDate: '2024-02-12' },
      { asmIdx: 5, locIdx: 13, installDate: '2024-02-16' },
      { asmIdx: 5, locIdx: 14, installDate: '2024-02-20' },
      { asmIdx: 5, locIdx: 15, installDate: '2024-02-24' },
      { asmIdx: 5, locIdx: 16, installDate: '2024-02-28' },
      { asmIdx: 5, locIdx: 17, installDate: '2024-03-04' },
      { asmIdx: 5, locIdx: 18, installDate: '2024-03-08' },
      
      // ASM-5007 Motor Control Assembly - installed at 9 locations
      { asmIdx: 6, locIdx: 0, installDate: '2024-02-10' },
      { asmIdx: 6, locIdx: 1, installDate: '2024-02-14' },
      { asmIdx: 6, locIdx: 3, installDate: '2024-02-18' },
      { asmIdx: 6, locIdx: 5, installDate: '2024-02-22' },
      { asmIdx: 6, locIdx: 7, installDate: '2024-02-26' },
      { asmIdx: 6, locIdx: 8, installDate: '2024-03-02' },
      { asmIdx: 6, locIdx: 12, installDate: '2024-03-06' },
      { asmIdx: 6, locIdx: 18, installDate: '2024-03-10' },
      { asmIdx: 6, locIdx: 20, installDate: '2024-03-14' },
      
      // ASM-5008 Precision Gearbox - installed at 8 locations (prototype but deployed)
      { asmIdx: 7, locIdx: 2, installDate: '2024-03-01' },
      { asmIdx: 7, locIdx: 4, installDate: '2024-03-03' },
      { asmIdx: 7, locIdx: 6, installDate: '2024-03-05' },
      { asmIdx: 7, locIdx: 10, installDate: '2024-03-07' },
      { asmIdx: 7, locIdx: 14, installDate: '2024-03-09' },
      { asmIdx: 7, locIdx: 19, installDate: '2024-03-11' },
      { asmIdx: 7, locIdx: 22, installDate: '2024-03-13' },
      { asmIdx: 7, locIdx: 24, installDate: '2024-03-15' },
    ];

    // Create assembly instances and link to locations
    installationData.forEach(({ asmIdx, locIdx, installDate }) => {
      const asmType = assemblyTypes[asmIdx];
      const serialNumber = `SN-${asmType.number}-${String(serialCounter++).padStart(4, '0')}`;
      
      const assembly = this.createNode('Assembly', {
        assemblyNumber: asmType.number,
        serialNumber: serialNumber,
        name: asmType.name,
        version: asmType.version,
        status: asmType.status,
        complexity: asmType.complexity,
        installedAt: locations[locIdx].properties.siteName,
        customerId: locations[locIdx].properties.customerId,
      });
      assemblies.push(assembly);
      
      // Link assembly to its specific location (NO cross-join!)
      this.createRelationship('COMMISSIONED_AT', assembly.id, locations[locIdx].id, { installDate });
    });

    // ===== ASSEMBLY BILL OF MATERIALS =====
    // Same parts used in MULTIPLE assemblies (realistic scenario)
    // Parts from same supplier/lot used across different assemblies at different locations (cohort tracing)
    
    // Define BOM per assembly type (which part indices are used)
    const bomDefinitions: { [key: number]: { partIndices: number[]; quantities: number[] } } = {
      0: { partIndices: [0, 3, 5, 9, 10, 12, 17], quantities: [4, 2, 1, 2, 1, 8, 1] }, // ASM-5001: bearings, shafts, PCB, sensors, housing, seals, motor
      1: { partIndices: [5, 7, 8, 9, 13], quantities: [2, 6, 3, 4, 1] }, // ASM-5002: PCB, connectors, capacitors, sensors, thermal paste
      2: { partIndices: [10, 13, 19, 9], quantities: [1, 2, 4, 6] }, // ASM-5003: housing, thermal paste, fans, sensors
      3: { partIndices: [9, 15, 16], quantities: [8, 4, 2] }, // ASM-5004: temp sensors, vibration sensors, pressure transducers
      4: { partIndices: [1, 3, 11, 12, 14], quantities: [6, 4, 1, 12, 1] }, // ASM-5005: bearings, shafts, frame, seals, cast base
      5: { partIndices: [5, 6, 7, 8, 9, 17], quantities: [4, 2, 8, 6, 4, 2] }, // ASM-5006: PCBs, connectors, capacitors, sensors, motors
      6: { partIndices: [5, 7, 9, 17, 18], quantities: [2, 4, 2, 1, 1] }, // ASM-5007: PCB, connectors, sensors, motors
      7: { partIndices: [0, 1, 2, 3, 4, 10, 12], quantities: [8, 4, 4, 4, 2, 2, 16] }, // ASM-5008: bearings, shafts, housing, seals
    };

    // Create BOM relationships for each assembly
    assemblies.forEach((assembly, idx) => {
      const asmTypeIdx = installationData[idx].asmIdx;
      const bom = bomDefinitions[asmTypeIdx];
      if (bom) {
        bom.partIndices.forEach((partIdx, i) => {
          this.createRelationship('CONTAINS_PART', assembly.id, parts[partIdx].id, { 
            quantity: bom.quantities[i],
            assemblySerial: assembly.properties.serialNumber 
          });
        });
      }
    });

    // ===== SUPPLIER PURCHASE ORDERS (15 POs) =====
    const purchaseOrders = [
      this.createNode('SupplierPO', { poNumber: 'PO-2024-001', orderDate: '2024-01-05', deliveryDate: '2024-01-20', status: 'Delivered', totalValue: 125000, supplierId: 'SUP-001' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-002', orderDate: '2024-01-08', deliveryDate: '2024-01-25', status: 'Delivered', totalValue: 85000, supplierId: 'SUP-003' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-003', orderDate: '2024-01-12', deliveryDate: '2024-01-28', status: 'Delivered', totalValue: 45000, supplierId: 'SUP-002' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-004', orderDate: '2024-01-15', deliveryDate: '2024-02-01', status: 'Delivered', totalValue: 200000, supplierId: 'SUP-001' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-005', orderDate: '2024-01-20', deliveryDate: '2024-02-05', status: 'Delivered', totalValue: 75000, supplierId: 'SUP-004' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-006', orderDate: '2024-01-25', deliveryDate: '2024-02-10', status: 'Delivered', totalValue: 150000, supplierId: 'SUP-003' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-007', orderDate: '2024-02-01', deliveryDate: '2024-02-15', status: 'Delivered', totalValue: 95000, supplierId: 'SUP-005' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-008', orderDate: '2024-02-05', deliveryDate: '2024-02-20', status: 'Delivered', totalValue: 180000, supplierId: 'SUP-006' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-009', orderDate: '2024-02-10', deliveryDate: '2024-02-28', status: 'Delivered', totalValue: 220000, supplierId: 'SUP-007' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-010', orderDate: '2024-02-15', deliveryDate: '2024-03-01', status: 'Delivered', totalValue: 65000, supplierId: 'SUP-008' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-011', orderDate: '2024-02-20', deliveryDate: '2024-03-05', status: 'In Transit', totalValue: 110000, supplierId: 'SUP-001' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-012', orderDate: '2024-02-25', deliveryDate: '2024-03-10', status: 'In Transit', totalValue: 88000, supplierId: 'SUP-003' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-013', orderDate: '2024-03-01', deliveryDate: '2024-03-15', status: 'Pending', totalValue: 145000, supplierId: 'SUP-002' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-014', orderDate: '2024-03-05', deliveryDate: '2024-03-20', status: 'Pending', totalValue: 175000, supplierId: 'SUP-006' }),
      this.createNode('SupplierPO', { poNumber: 'PO-2024-015', orderDate: '2024-03-10', deliveryDate: '2024-03-25', status: 'Confirmed', totalValue: 92000, supplierId: 'SUP-007' }),
    ];

    // Link POs to suppliers
    this.createRelationship('ORDERED_FROM', purchaseOrders[0].id, suppliers[0].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[1].id, suppliers[2].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[2].id, suppliers[1].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[3].id, suppliers[0].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[4].id, suppliers[3].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[5].id, suppliers[2].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[6].id, suppliers[4].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[7].id, suppliers[5].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[8].id, suppliers[6].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[9].id, suppliers[7].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[10].id, suppliers[0].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[11].id, suppliers[2].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[12].id, suppliers[1].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[13].id, suppliers[5].id, {});
    this.createRelationship('ORDERED_FROM', purchaseOrders[14].id, suppliers[6].id, {});

    // Link parts to POs (SOURCED_FROM)
    this.createRelationship('SOURCED_FROM', parts[0].id, purchaseOrders[0].id, { quantity: 5000, receivedDate: '2024-01-20' });
    this.createRelationship('SOURCED_FROM', parts[1].id, purchaseOrders[3].id, { quantity: 3000, receivedDate: '2024-02-01' });
    this.createRelationship('SOURCED_FROM', parts[2].id, purchaseOrders[10].id, { quantity: 2000, receivedDate: '2024-03-05' });
    this.createRelationship('SOURCED_FROM', parts[3].id, purchaseOrders[0].id, { quantity: 4000, receivedDate: '2024-01-20' });
    this.createRelationship('SOURCED_FROM', parts[4].id, purchaseOrders[3].id, { quantity: 2500, receivedDate: '2024-02-01' });
    this.createRelationship('SOURCED_FROM', parts[5].id, purchaseOrders[1].id, { quantity: 2000, receivedDate: '2024-01-25' });
    this.createRelationship('SOURCED_FROM', parts[6].id, purchaseOrders[5].id, { quantity: 1500, receivedDate: '2024-02-10' });
    this.createRelationship('SOURCED_FROM', parts[7].id, purchaseOrders[1].id, { quantity: 8000, receivedDate: '2024-01-25' });
    this.createRelationship('SOURCED_FROM', parts[8].id, purchaseOrders[5].id, { quantity: 3000, receivedDate: '2024-02-10' });
    this.createRelationship('SOURCED_FROM', parts[9].id, purchaseOrders[1].id, { quantity: 10000, receivedDate: '2024-01-25' });
    this.createRelationship('SOURCED_FROM', parts[10].id, purchaseOrders[2].id, { quantity: 3500, receivedDate: '2024-01-28' });
    this.createRelationship('SOURCED_FROM', parts[11].id, purchaseOrders[2].id, { quantity: 2000, receivedDate: '2024-01-28' });
    this.createRelationship('SOURCED_FROM', parts[12].id, purchaseOrders[4].id, { quantity: 25000, receivedDate: '2024-02-05' });
    this.createRelationship('SOURCED_FROM', parts[13].id, purchaseOrders[4].id, { quantity: 500, receivedDate: '2024-02-05' });
    this.createRelationship('SOURCED_FROM', parts[14].id, purchaseOrders[6].id, { quantity: 1000, receivedDate: '2024-02-15' });
    this.createRelationship('SOURCED_FROM', parts[15].id, purchaseOrders[7].id, { quantity: 2000, receivedDate: '2024-02-20' });
    this.createRelationship('SOURCED_FROM', parts[16].id, purchaseOrders[7].id, { quantity: 1500, receivedDate: '2024-02-20' });
    this.createRelationship('SOURCED_FROM', parts[17].id, purchaseOrders[8].id, { quantity: 1200, receivedDate: '2024-02-28' });
    this.createRelationship('SOURCED_FROM', parts[18].id, purchaseOrders[8].id, { quantity: 800, receivedDate: '2024-02-28' });
    this.createRelationship('SOURCED_FROM', parts[19].id, purchaseOrders[9].id, { quantity: 3000, receivedDate: '2024-03-01' });

    // Link POs to warehouses
    this.createRelationship('DELIVERED_TO', purchaseOrders[0].id, warehouses[1].id, { deliveryDate: '2024-01-20' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[1].id, warehouses[0].id, { deliveryDate: '2024-01-25' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[2].id, warehouses[3].id, { deliveryDate: '2024-01-28' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[3].id, warehouses[1].id, { deliveryDate: '2024-02-01' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[4].id, warehouses[1].id, { deliveryDate: '2024-02-05' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[5].id, warehouses[0].id, { deliveryDate: '2024-02-10' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[6].id, warehouses[4].id, { deliveryDate: '2024-02-15' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[7].id, warehouses[3].id, { deliveryDate: '2024-02-20' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[8].id, warehouses[4].id, { deliveryDate: '2024-02-28' });
    this.createRelationship('DELIVERED_TO', purchaseOrders[9].id, warehouses[0].id, { deliveryDate: '2024-03-01' });

    // ===== WARRANTIES (one per assembly instance) =====
    const warrantyTypes = ['Standard', 'Extended', 'Premium'];
    const warrantyCoverages = [
      'Full Parts & Labor (2 years)',
      'Full Parts & Labor + On-site (3 years)',
      'Comprehensive + Preventive Maintenance (5 years)',
    ];

    assemblies.forEach((assembly, idx) => {
      const typeIdx = idx % 3;
      const startDate = assembly.properties.installedAt ? installationData[idx].installDate : '2024-01-01';
      const endYear = parseInt(startDate.split('-')[0]) + (typeIdx === 0 ? 2 : typeIdx === 1 ? 3 : 5);
      const endDate = startDate.replace(/^\d{4}/, endYear.toString());
      
      const warranty = this.createNode('Warranty', {
        warrantyId: `WRN-${String(idx + 1).padStart(3, '0')}`,
        type: warrantyTypes[typeIdx],
        startDate,
        endDate,
        coverage: warrantyCoverages[typeIdx],
        assemblySerial: assembly.properties.serialNumber,
      });
      this.createRelationship('HAS_WARRANTY', assembly.id, warranty.id, {});
    });

    // ===== SERVICE RECORDS (multiple per assembly) =====
    const serviceTypes = ['Preventive Maintenance', 'Corrective Maintenance', 'Calibration', 'Inspection', 'Emergency Repair'];
    const technicians = ['John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson', 'Michael Brown', 'Anna Schmidt', 'Takeshi Yamamoto'];

    // Create service records for random assemblies
    for (let i = 0; i < 100; i++) {
      const asmIdx = i % assemblies.length;
      const serviceDate = `2024-${String(Math.floor(Math.random() * 6) + 3).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
      
      const serviceRecord = this.createNode('ServiceRecord', {
        serviceId: `SVC-${String(i + 1).padStart(3, '0')}`,
        date: serviceDate,
        type: serviceTypes[i % serviceTypes.length],
        technician: technicians[i % technicians.length],
        duration: Math.floor(Math.random() * 8) + 1,
        notes: `Service performed on ${assemblies[asmIdx].properties.name} (${assemblies[asmIdx].properties.serialNumber})`,
        assemblySerial: assemblies[asmIdx].properties.serialNumber,
      });
      this.createRelationship('HAS_SERVICE_RECORD', assemblies[asmIdx].id, serviceRecord.id, {});
    }

    // ===== FAILURES (20 failures linked to specific parts and assemblies) =====
    const failureSeverities = ['Low', 'Medium', 'High', 'Critical'];
    const failureDescriptions = [
      { desc: 'Bearing premature wear detected', part: 'PN-10001', mode: 'Wear' },
      { desc: 'Motor controller overheat shutdown', part: 'PN-10003', mode: 'Overheat' },
      { desc: 'Cooling fan noise exceeds threshold', part: 'PN-10015', mode: 'Noise' },
      { desc: 'Sensor drift out of calibration', part: 'PN-10006', mode: 'Drift' },
      { desc: 'Seal leakage detected', part: 'PN-10009', mode: 'Leakage' },
      { desc: 'PCB solder joint failure', part: 'PN-10003', mode: 'Electrical' },
      { desc: 'Motor vibration above acceptable limit', part: 'PN-10014', mode: 'Vibration' },
      { desc: 'Capacitor degradation', part: 'PN-10005', mode: 'Degradation' },
      { desc: 'Shaft misalignment detected', part: 'PN-10002', mode: 'Misalignment' },
      { desc: 'Housing crack discovered', part: 'PN-10007', mode: 'Structural' },
    ];

    const failures: Node[] = [];
    for (let i = 0; i < 20; i++) {
      const asmIdx = i % assemblies.length;
      const failureInfo = failureDescriptions[i % failureDescriptions.length];
      
      const failure = this.createNode('Failure', {
        failureId: `FLR-${String(i + 1).padStart(3, '0')}`,
        date: `2024-${String(Math.floor(Math.random() * 4) + 4).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        severity: failureSeverities[i % 4],
        description: failureInfo.desc,
        impactLevel: i % 4 === 3 ? 'Line Stoppage' : i % 4 === 2 ? 'Production Delay' : 'Quality Issue',
        assemblyAffected: assemblies[asmIdx].properties.assemblyNumber,
        serialAffected: assemblies[asmIdx].properties.serialNumber,
        partAffected: failureInfo.part,
        failureMode: failureInfo.mode,
        status: i < 15 ? 'Resolved' : 'Under Investigation',
      });
      failures.push(failure);
      
      // Link failure to assembly
      this.createRelationship('RELATED_TO_FAILURE', assemblies[asmIdx].id, failure.id, { discoveredDuring: 'Operation' });
      
      // Link failure to affected part
      const affectedPart = parts.find(p => p.properties.partNumber === failureInfo.part);
      if (affectedPart) {
        this.createRelationship('RELATED_TO_FAILURE', affectedPart.id, failure.id, { failureMode: failureInfo.mode });
      }
    }

    // ===== ROOT CAUSES (linked to failures, deviations, and inspections) =====
    const rootCauses = [
      this.createNode('RootCause', {
        causeId: 'RC-001',
        category: 'Material Defect',
        description: 'Bearing steel hardness below specification due to heat treatment issue at supplier',
        contributingFactors: ['Supplier quality issue', 'Incoming inspection gap', 'Heat treatment process deviation'],
        correctiveAction: 'Updated incoming inspection criteria, issued NCR to supplier',
        preventiveAction: 'Added hardness testing to receiving inspection',
        relatedDeviation: 'DEV-001',
      }),
      this.createNode('RootCause', {
        causeId: 'RC-002',
        category: 'Process Deviation',
        description: 'Thermal paste application insufficient due to operator error during assembly',
        contributingFactors: ['Operator training gap', 'Process parameter drift', 'Work instruction unclear'],
        correctiveAction: 'Retrained assembly operators, adjusted thermal paste quantity',
        preventiveAction: 'Added thermal imaging check post-assembly',
        relatedDeviation: 'DEV-002',
      }),
      this.createNode('RootCause', {
        causeId: 'RC-003',
        category: 'Design Issue',
        description: 'Fan bearing lubrication insufficient for operating temperature range',
        contributingFactors: ['Design validation gap', 'Operating environment hotter than spec'],
        correctiveAction: 'Replaced with high-temperature rated fans',
        preventiveAction: 'Updated design validation to include extended temperature testing',
        relatedDeviation: 'DEV-003',
      }),
      this.createNode('RootCause', {
        causeId: 'RC-004',
        category: 'Supplier Quality',
        description: 'Motor winding resistance out of spec causing overheating',
        contributingFactors: ['Supplier process change not communicated', 'Lot-to-lot variation'],
        correctiveAction: 'Quarantined affected lot, increased sampling frequency',
        preventiveAction: 'Added resistance testing at receiving, supplier audit scheduled',
        relatedDeviation: 'DEV-004',
      }),
      this.createNode('RootCause', {
        causeId: 'RC-005',
        category: 'Installation Error',
        description: 'Incorrect torque applied during field installation',
        contributingFactors: ['Field technician training gap', 'Torque wrench not calibrated'],
        correctiveAction: 'Re-torqued all connections at affected sites',
        preventiveAction: 'Added torque verification step to commissioning checklist',
        relatedDeviation: 'DEV-005',
      }),
    ];

    // Link failures to root causes
    failures.slice(0, 5).forEach((failure, idx) => {
      this.createRelationship('CAUSED_BY', failure.id, rootCauses[idx % rootCauses.length].id, { analysisDate: '2024-05-15' });
    });
    failures.slice(5, 10).forEach((failure, idx) => {
      this.createRelationship('CAUSED_BY', failure.id, rootCauses[(idx + 1) % rootCauses.length].id, { analysisDate: '2024-06-01' });
    });
    failures.slice(10, 15).forEach((failure, idx) => {
      this.createRelationship('CAUSED_BY', failure.id, rootCauses[(idx + 2) % rootCauses.length].id, { analysisDate: '2024-06-15' });
    });

    // ===== QUALITY INSPECTIONS (comprehensive - receiving, assembly, commissioning) =====
    const inspections: Node[] = [];
    
    // Receiving inspections for parts
    parts.forEach((part, idx) => {
      const inspection = this.createNode('QualityInspection', {
        inspectionId: `QI-RCV-${String(idx + 1).padStart(3, '0')}`,
        date: `2024-01-${String(20 + (idx % 10)).padStart(2, '0')}`,
        inspector: `Quality Team ${String.fromCharCode(65 + (idx % 3))}`,
        type: 'Incoming Inspection',
        stage: 'Receiving',
        result: idx % 5 === 0 ? 'Fail' : idx % 3 === 0 ? 'Pass with Deviation' : 'Pass',
        score: idx % 5 === 0 ? 65 : idx % 3 === 0 ? 88 : 95 + (idx % 5),
        location: warehouses[idx % warehouses.length].properties.name,
        partNumber: part.properties.partNumber,
        lotNumber: part.properties.lotNumber,
      });
      inspections.push(inspection);
      this.createRelationship('INSPECTED_BY', part.id, inspection.id, { inspectionPhase: 'receiving' });
    });

    // Assembly inspections for assemblies
    assemblies.slice(0, 30).forEach((assembly, idx) => {
      const inspection = this.createNode('QualityInspection', {
        inspectionId: `QI-ASM-${String(idx + 1).padStart(3, '0')}`,
        date: installationData[idx].installDate.replace(/-\d{2}$/, `-${String(Math.max(1, parseInt(installationData[idx].installDate.split('-')[2]) - 5)).padStart(2, '0')}`),
        inspector: `Quality Team ${String.fromCharCode(65 + (idx % 4))}`,
        type: 'In-Process Inspection',
        stage: 'Assembly',
        result: idx % 4 === 0 ? 'Pass with Deviation' : 'Pass',
        score: idx % 4 === 0 ? 90 : 96 + (idx % 4),
        location: plants[idx % plants.length].properties.name,
        assemblyNumber: assembly.properties.assemblyNumber,
        serialNumber: assembly.properties.serialNumber,
      });
      inspections.push(inspection);
      this.createRelationship('INSPECTED_BY', assembly.id, inspection.id, { inspectionPhase: 'assembly' });
    });

    // Commissioning inspections for assemblies
    assemblies.forEach((assembly, idx) => {
      const inspection = this.createNode('QualityInspection', {
        inspectionId: `QI-COM-${String(idx + 1).padStart(3, '0')}`,
        date: installationData[idx].installDate,
        inspector: `Field Engineer ${idx % 5 + 1}`,
        type: 'Commissioning Inspection',
        stage: 'Commissioning',
        result: idx % 6 === 0 ? 'Pass with Deviation' : 'Pass',
        score: idx % 6 === 0 ? 92 : 97 + (idx % 3),
        location: locations[installationData[idx].locIdx].properties.siteName,
        assemblyNumber: assembly.properties.assemblyNumber,
        serialNumber: assembly.properties.serialNumber,
      });
      inspections.push(inspection);
      this.createRelationship('INSPECTED_BY', assembly.id, inspection.id, { inspectionPhase: 'commissioning' });
    });

    // ===== DEVIATIONS (linked to inspections and root causes) =====
    const deviationTypes = ['Material', 'Process', 'Installation', 'Dimension', 'Documentation'];
    const dispositions = ['Use As-Is', 'Rework', 'Reject', 'Use As-Is with Monitoring', 'Return to Supplier'];
    
    const deviations: Node[] = [];
    
    // Create deviations linked to specific inspections
    for (let i = 0; i < 15; i++) {
      const deviation = this.createNode('Deviation', {
        deviationId: `DEV-${String(i + 1).padStart(3, '0')}`,
        date: `2024-${String(Math.floor(i / 3) + 2).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        type: deviationTypes[i % 5],
        description: i < 5 
          ? `${deviationTypes[i % 5]} deviation detected - related to root cause RC-00${(i % 5) + 1}`
          : `${deviationTypes[i % 5]} deviation found during inspection`,
        disposition: dispositions[i % 5],
        approvedBy: i % 2 === 0 ? 'Quality Manager' : 'Engineering Review Board',
        riskAssessment: i % 3 === 0 ? 'High risk' : i % 3 === 1 ? 'Medium risk' : 'Low risk',
        stage: i < 7 ? 'Receiving' : i < 12 ? 'Assembly' : 'Commissioning',
        rootCauseLink: i < 5 ? `RC-00${(i % 5) + 1}` : undefined,
      });
      deviations.push(deviation);
      
      // Link deviation to an inspection
      const inspectionIdx = i % inspections.length;
      this.createRelationship('HAS_DEVIATION', inspections[inspectionIdx].id, deviation.id, {});
      
      // Link first 5 deviations to root causes
      if (i < 5) {
        this.createRelationship('CAUSED_BY', deviation.id, rootCauses[i].id, { deviationContributedToFailure: true });
      }
    }

    // Link deviations to parts and assemblies
    deviations.slice(0, 7).forEach((deviation, idx) => {
      this.createRelationship('HAS_DEVIATION', parts[idx % parts.length].id, deviation.id, { deviationType: deviation.properties.type });
    });
    deviations.slice(7).forEach((deviation, idx) => {
      this.createRelationship('HAS_DEVIATION', assemblies[idx % assemblies.length].id, deviation.id, { deviationType: deviation.properties.type });
    });

    // Create initial snapshot
    this.createSnapshot('Initial data load - comprehensive manufacturing traceability data');
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
