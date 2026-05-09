// ============================================================
// KUZU GRAPH DATABASE SCHEMA - CYPHER FORMAT
// Manufacturing & Supply Chain Traceability
// ============================================================

// ============================================================
// NODE TABLE DEFINITIONS
// ============================================================

CREATE NODE TABLE Customer (
    id STRING PRIMARY KEY,
    name STRING,
    industry STRING,
    tier STRING,
    region STRING,
    contractStartDate DATE,
    contractEndDate DATE,
    totalRevenue DOUBLE
);

CREATE NODE TABLE CustomerLocation (
    id STRING PRIMARY KEY,
    customerId STRING,
    name STRING,
    address STRING,
    city STRING,
    state STRING,
    country STRING,
    locationType STRING  // HQ, Branch, Factory, Warehouse
);

CREATE NODE TABLE Assembly (
    id STRING PRIMARY KEY,
    assemblyNumber STRING,
    modelNumber STRING,
    name STRING,
    description STRING,
    productLine STRING,
    manufacturedDate DATE,
    warrantyEndDate DATE,
    status STRING  // Active, Inactive, Under Maintenance, Decommissioned
);

CREATE NODE TABLE Part (
    id STRING PRIMARY KEY,
    partNumber STRING,
    name STRING,
    description STRING,
    category STRING,
    unitCost DOUBLE,
    leadTimeDays INT32,
    lotNumber STRING,
    manufacturingDate DATE,
    expirationDate DATE
);

CREATE NODE TABLE Warranty (
    id STRING PRIMARY KEY,
    warrantyNumber STRING,
    warrantyType STRING,
    startDate DATE,
    endDate DATE,
    coverageDetails STRING,
    maxClaims INT32,
    currentClaims INT32,
    status STRING  // Active, Expired, Voided
);

CREATE NODE TABLE ServiceRecord (
    id STRING PRIMARY KEY,
    serviceId STRING,
    serviceDate DATE,
    serviceType STRING,  // Preventive Maintenance, Corrective Maintenance, Installation, Inspection
    description STRING,
    technician STRING,
    laborHours DOUBLE,
    partsCost DOUBLE,
    laborCost DOUBLE,
    totalCost DOUBLE,
    outcome STRING  // Completed, Pending Parts, Escalated
);

CREATE NODE TABLE Failure (
    id STRING PRIMARY KEY,
    failureId STRING,
    date DATE,
    severity STRING,  // Low, Medium, High, Critical
    description STRING,
    impactLevel STRING,
    assemblyAffected STRING,
    partAffected STRING,
    status STRING  // Open, Under Investigation, Resolved, Closed
);

CREATE NODE TABLE RootCause (
    id STRING PRIMARY KEY,
    causeId STRING,
    category STRING,  // Material Defect, Process Deviation, Design Issue, Human Error, Environmental
    description STRING,
    contributingFactors STRING[],
    correctiveAction STRING,
    preventiveAction STRING
);

CREATE NODE TABLE Plant (
    id STRING PRIMARY KEY,
    plantId STRING,
    name STRING,
    location STRING,
    country STRING,
    capacity INT32,
    certifications STRING[]  // ISO 9001, ISO 14001, IATF 16949, etc.
);

CREATE NODE TABLE Station (
    id STRING PRIMARY KEY,
    stationId STRING,
    plantId STRING,
    name STRING,
    stationType STRING,  // Assembly, Testing, Packaging, Quality Control
    operatorCount INT32,
    cycleTime DOUBLE
);

CREATE NODE TABLE Warehouse (
    id STRING PRIMARY KEY,
    warehouseId STRING,
    name STRING,
    location STRING,
    capacity INT32,
    currentInventory INT32,
    warehouseType STRING  // Raw Materials, Finished Goods, Distribution
);

CREATE NODE TABLE Supplier (
    id STRING PRIMARY KEY,
    supplierId STRING,
    name STRING,
    country STRING,
    rating DOUBLE,
    certifications STRING[],
    leadTimeDays INT32,
    qualityScore DOUBLE
);

CREATE NODE TABLE SupplierPO (
    id STRING PRIMARY KEY,
    poNumber STRING,
    supplierId STRING,
    orderDate DATE,
    expectedDeliveryDate DATE,
    actualDeliveryDate DATE,
    status STRING,  // Draft, Submitted, Confirmed, Shipped, Delivered, Closed
    totalAmount DOUBLE,
    currency STRING
);

CREATE NODE TABLE QualityInspection (
    id STRING PRIMARY KEY,
    inspectionId STRING,
    date DATE,
    inspector STRING,
    type STRING,  // Incoming Inspection, In-Process Inspection, Final Inspection, Commissioning Inspection
    stage STRING,  // Receiving, Assembly, Final, Commissioning
    result STRING,  // Pass, Fail, Pass with Deviation
    score INT32,
    location STRING,
    notes STRING
);

CREATE NODE TABLE Deviation (
    id STRING PRIMARY KEY,
    deviationId STRING,
    date DATE,
    type STRING,  // Dimensional, Material, Process, Installation
    description STRING,
    disposition STRING,  // Use As-Is, Rework, Reject, Return to Supplier
    approvedBy STRING,
    riskAssessment STRING,
    affectedPart STRING,
    affectedAssembly STRING,
    stage STRING  // Receiving, Assembly, Commissioning
);

// ============================================================
// RELATIONSHIP TABLE DEFINITIONS
// ============================================================

CREATE REL TABLE COMMISSIONED_AT (
    FROM Assembly TO CustomerLocation,
    commissionDate DATE,
    installedBy STRING
);

CREATE REL TABLE CONTAINS_PART (
    FROM Assembly TO Part,
    quantity INT32,
    position STRING
);

CREATE REL TABLE SUPPLIED_BY (
    FROM Part TO Supplier,
    contractDate DATE,
    unitPrice DOUBLE
);

CREATE REL TABLE HAS_WARRANTY (
    FROM Assembly TO Warranty
);

CREATE REL TABLE HAS_SERVICE_RECORD (
    FROM Assembly TO ServiceRecord
);

CREATE REL TABLE RELATED_TO_FAILURE (
    FROM Assembly TO Failure,
    discoveredDuring STRING
);

CREATE REL TABLE RELATED_TO_FAILURE (
    FROM Part TO Failure,
    failureMode STRING
);

CREATE REL TABLE CAUSED_BY (
    FROM Failure TO RootCause,
    analysisDate DATE
);

CREATE REL TABLE MANUFACTURED_AT (
    FROM Assembly TO Plant,
    productionLine STRING
);

CREATE REL TABLE PROCESSED_AT (
    FROM Part TO Station,
    processDate DATE,
    cycleTime DOUBLE
);

CREATE REL TABLE STORED_AT (
    FROM Part TO Warehouse,
    binLocation STRING,
    quantity INT32
);

CREATE REL TABLE ORDERED_FROM (
    FROM SupplierPO TO Supplier
);

CREATE REL TABLE SOURCED_FROM (
    FROM Part TO SupplierPO,
    quantity INT32,
    receivedDate DATE
);

CREATE REL TABLE DELIVERED_TO (
    FROM SupplierPO TO Warehouse,
    deliveryDate DATE
);

CREATE REL TABLE INSPECTED_BY (
    FROM Part TO QualityInspection,
    inspectionPhase STRING
);

CREATE REL TABLE INSPECTED_BY (
    FROM Assembly TO QualityInspection,
    inspectionPhase STRING
);

CREATE REL TABLE HAS_DEVIATION (
    FROM QualityInspection TO Deviation
);

CREATE REL TABLE HAS_DEVIATION (
    FROM Part TO Deviation,
    deviationType STRING
);

CREATE REL TABLE HAS_DEVIATION (
    FROM Assembly TO Deviation,
    impactedBy BOOLEAN
);

CREATE REL TABLE PART_OF_LOT (
    FROM Part TO Part,
    lotNumber STRING
);

CREATE REL TABLE QUALITY_CHECKED (
    FROM Part TO QualityInspection
);

CREATE REL TABLE QUALITY_CHECKED (
    FROM Assembly TO QualityInspection
);

// ============================================================
// SAMPLE CYPHER QUERIES
// ============================================================

// Get all assemblies for a customer
// MATCH (c:Customer)-[:COMMISSIONED_AT]->(loc:CustomerLocation)<-[:COMMISSIONED_AT]-(a:Assembly)
// WHERE c.name = 'Acme Manufacturing'
// RETURN a.assemblyNumber, a.name, a.status;

// Get service history for an assembly
// MATCH (a:Assembly)-[:HAS_SERVICE_RECORD]->(sr:ServiceRecord)
// WHERE a.assemblyNumber = 'ASM-5001'
// RETURN sr.serviceDate, sr.serviceType, sr.description, sr.totalCost
// ORDER BY sr.serviceDate DESC;

// Get failure root cause analysis
// MATCH (f:Failure)-[:CAUSED_BY]->(rc:RootCause)
// WHERE f.failureId = 'FLR-001'
// RETURN f.description, f.severity, rc.category, rc.correctiveAction;

// Get parts by supplier
// MATCH (p:Part)-[:SUPPLIED_BY]->(s:Supplier)
// WHERE s.name = 'Precision Parts Inc.'
// RETURN p.partNumber, p.name, p.category;

// Full assembly traceability
// MATCH (a:Assembly)-[:CONTAINS_PART]->(p:Part)-[:SUPPLIED_BY]->(s:Supplier)
// WHERE a.assemblyNumber = 'ASM-5001'
// RETURN a.name, p.partNumber, p.name, s.name;

// Get assemblies with warranty expiring soon
// MATCH (a:Assembly)-[:HAS_WARRANTY]->(w:Warranty)
// WHERE w.endDate <= date() + duration('P30D') AND w.status = 'Active'
// RETURN a.assemblyNumber, a.name, w.endDate;
