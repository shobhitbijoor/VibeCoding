import fastapi
import fastapi.middleware.cors
from fastapi.responses import StreamingResponse
import kuzu
import os
import json
import shutil
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from io import BytesIO
import random

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database paths
DB_BASE_PATH = "/tmp/kuzu_db"
VERSIONS_PATH = "/tmp/kuzu_versions"

def get_current_version() -> int:
    """Get the current database version"""
    version_file = os.path.join(VERSIONS_PATH, "current_version.txt")
    if os.path.exists(version_file):
        with open(version_file, "r") as f:
            return int(f.read().strip())
    return 1

def set_current_version(version: int):
    """Set the current database version"""
    os.makedirs(VERSIONS_PATH, exist_ok=True)
    with open(os.path.join(VERSIONS_PATH, "current_version.txt"), "w") as f:
        f.write(str(version))

def get_all_versions() -> list[dict]:
    """Get list of all available versions"""
    versions = []
    if os.path.exists(VERSIONS_PATH):
        for item in os.listdir(VERSIONS_PATH):
            if item.startswith("v") and os.path.isdir(os.path.join(VERSIONS_PATH, item)):
                version_num = int(item[1:])
                version_meta_file = os.path.join(VERSIONS_PATH, item, "metadata.json")
                if os.path.exists(version_meta_file):
                    with open(version_meta_file, "r") as f:
                        meta = json.load(f)
                    versions.append({
                        "version": version_num,
                        "created_at": meta.get("created_at", "Unknown"),
                        "description": meta.get("description", "No description")
                    })
    return sorted(versions, key=lambda x: x["version"], reverse=True)

def save_version_snapshot(description: str = "Manual snapshot"):
    """Save current database as a version snapshot"""
    current_version = get_current_version()
    new_version = current_version + 1
    
    # Save current DB to version folder
    version_folder = os.path.join(VERSIONS_PATH, f"v{current_version}")
    os.makedirs(version_folder, exist_ok=True)
    
    if os.path.exists(DB_BASE_PATH):
        # Copy database to version folder
        version_db_path = os.path.join(version_folder, "db")
        if os.path.exists(version_db_path):
            shutil.rmtree(version_db_path)
        shutil.copytree(DB_BASE_PATH, version_db_path)
    
    # Save metadata
    with open(os.path.join(version_folder, "metadata.json"), "w") as f:
        json.dump({
            "created_at": datetime.now().isoformat(),
            "description": description
        }, f)
    
    set_current_version(new_version)
    return new_version

def rollback_to_version(version: int) -> bool:
    """Rollback database to a specific version"""
    version_folder = os.path.join(VERSIONS_PATH, f"v{version}")
    version_db_path = os.path.join(version_folder, "db")
    
    if not os.path.exists(version_db_path):
        return False
    
    # Clear current database
    if os.path.exists(DB_BASE_PATH):
        shutil.rmtree(DB_BASE_PATH)
    
    # Copy version to current
    shutil.copytree(version_db_path, DB_BASE_PATH)
    
    return True

def get_db() -> kuzu.Database:
    """Get or create the Kuzu database"""
    os.makedirs(DB_BASE_PATH, exist_ok=True)
    return kuzu.Database(DB_BASE_PATH)

def init_schema(conn: kuzu.Connection):
    """Initialize the graph database schema"""
    
    # Node tables
    node_tables = [
        # Customers and Locations
        """CREATE NODE TABLE IF NOT EXISTS Customer(
            id STRING PRIMARY KEY,
            name STRING,
            industry STRING,
            contact_email STRING,
            contact_phone STRING
        )""",
        """CREATE NODE TABLE IF NOT EXISTS CustomerLocation(
            id STRING PRIMARY KEY,
            customer_id STRING,
            name STRING,
            address STRING,
            city STRING,
            country STRING,
            site_type STRING
        )""",
        
        # Assemblies and Parts
        """CREATE NODE TABLE IF NOT EXISTS Assembly(
            id STRING PRIMARY KEY,
            name STRING,
            model STRING,
            serial_number STRING,
            manufacture_date DATE,
            commission_date DATE
        )""",
        """CREATE NODE TABLE IF NOT EXISTS Part(
            id STRING PRIMARY KEY,
            part_number STRING,
            name STRING,
            description STRING,
            category STRING,
            lot_number STRING
        )""",
        
        # Warranty and Service
        """CREATE NODE TABLE IF NOT EXISTS Warranty(
            id STRING PRIMARY KEY,
            assembly_id STRING,
            warranty_type STRING,
            start_date DATE,
            end_date DATE,
            coverage_details STRING,
            status STRING
        )""",
        """CREATE NODE TABLE IF NOT EXISTS ServiceRecord(
            id STRING PRIMARY KEY,
            assembly_id STRING,
            service_date DATE,
            service_type STRING,
            technician STRING,
            notes STRING,
            next_service_date DATE
        )""",
        
        # Failures and Root Causes
        """CREATE NODE TABLE IF NOT EXISTS Failure(
            id STRING PRIMARY KEY,
            part_id STRING,
            failure_date DATE,
            failure_mode STRING,
            conditions STRING,
            environment STRING,
            symptoms STRING
        )""",
        """CREATE NODE TABLE IF NOT EXISTS RootCause(
            id STRING PRIMARY KEY,
            failure_id STRING,
            cause_category STRING,
            description STRING,
            corrective_action STRING,
            preventive_action STRING
        )""",
        
        # Organization: Plants, Stations, Warehouses
        """CREATE NODE TABLE IF NOT EXISTS Plant(
            id STRING PRIMARY KEY,
            name STRING,
            location STRING,
            plant_type STRING
        )""",
        """CREATE NODE TABLE IF NOT EXISTS Station(
            id STRING PRIMARY KEY,
            plant_id STRING,
            name STRING,
            station_type STRING,
            capacity INT64
        )""",
        """CREATE NODE TABLE IF NOT EXISTS Warehouse(
            id STRING PRIMARY KEY,
            name STRING,
            location STRING,
            capacity INT64
        )""",
        
        # Suppliers and Purchase Orders
        """CREATE NODE TABLE IF NOT EXISTS Supplier(
            id STRING PRIMARY KEY,
            name STRING,
            contact_email STRING,
            contact_phone STRING,
            address STRING,
            rating DOUBLE
        )""",
        """CREATE NODE TABLE IF NOT EXISTS SupplierPO(
            id STRING PRIMARY KEY,
            supplier_id STRING,
            po_number STRING,
            order_date DATE,
            delivery_date DATE,
            status STRING,
            total_amount DOUBLE
        )""",
        
        # Quality Inspections and Deviations
        """CREATE NODE TABLE IF NOT EXISTS QualityInspection(
            id STRING PRIMARY KEY,
            inspection_type STRING,
            inspection_date DATE,
            inspector STRING,
            location STRING,
            result STRING,
            score DOUBLE,
            notes STRING
        )""",
        """CREATE NODE TABLE IF NOT EXISTS Deviation(
            id STRING PRIMARY KEY,
            deviation_type STRING,
            severity STRING,
            description STRING,
            detected_date DATE,
            resolution STRING,
            resolution_date DATE
        )"""
    ]
    
    # Relationship tables
    rel_tables = [
        # Customer relationships
        "CREATE REL TABLE IF NOT EXISTS HAS_LOCATION(FROM Customer TO CustomerLocation)",
        "CREATE REL TABLE IF NOT EXISTS COMMISSIONED_AT(FROM Assembly TO CustomerLocation, commission_date DATE)",
        
        # Assembly relationships
        "CREATE REL TABLE IF NOT EXISTS CONTAINS_PART(FROM Assembly TO Part, quantity INT64, position STRING)",
        "CREATE REL TABLE IF NOT EXISTS HAS_WARRANTY(FROM Assembly TO Warranty)",
        "CREATE REL TABLE IF NOT EXISTS SERVICED(FROM Assembly TO ServiceRecord)",
        
        # Part and Failure relationships
        "CREATE REL TABLE IF NOT EXISTS FAILED(FROM Part TO Failure)",
        "CREATE REL TABLE IF NOT EXISTS HAS_ROOT_CAUSE(FROM Failure TO RootCause)",
        
        # Manufacturing relationships
        "CREATE REL TABLE IF NOT EXISTS ASSEMBLED_AT(FROM Part TO Station, assembly_date DATE)",
        "CREATE REL TABLE IF NOT EXISTS INSTALLED_BY(FROM Part TO Plant, install_date DATE)",
        "CREATE REL TABLE IF NOT EXISTS BELONGS_TO(FROM Station TO Plant)",
        
        # Supply chain relationships
        "CREATE REL TABLE IF NOT EXISTS RECEIVED_AT(FROM Part TO Warehouse, receipt_date DATE)",
        "CREATE REL TABLE IF NOT EXISTS SUPPLIED_BY(FROM Part TO Supplier)",
        "CREATE REL TABLE IF NOT EXISTS FROM_PO(FROM Part TO SupplierPO)",
        "CREATE REL TABLE IF NOT EXISTS ISSUED_BY(FROM SupplierPO TO Supplier)",
        
        # Quality relationships
        "CREATE REL TABLE IF NOT EXISTS INSPECTED_RECEIVING(FROM Part TO QualityInspection)",
        "CREATE REL TABLE IF NOT EXISTS INSPECTED_ASSEMBLY(FROM Part TO QualityInspection)",
        "CREATE REL TABLE IF NOT EXISTS INSPECTED_COMMISSIONING(FROM Assembly TO QualityInspection)",
        "CREATE REL TABLE IF NOT EXISTS HAS_DEVIATION(FROM QualityInspection TO Deviation)"
    ]
    
    for table in node_tables:
        try:
            conn.execute(table)
        except Exception as e:
            print(f"Table creation note: {e}")
    
    for rel in rel_tables:
        try:
            conn.execute(rel)
        except Exception as e:
            print(f"Relationship creation note: {e}")

def populate_dummy_data(conn: kuzu.Connection):
    """Populate the database with realistic dummy data"""
    
    # Check if data already exists
    result = conn.execute("MATCH (c:Customer) RETURN count(c) as cnt")
    if result.has_next():
        row = result.get_next()
        if row[0] > 0:
            return  # Data already exists
    
    # Customers
    customers = [
        ("CUST001", "Acme Manufacturing Corp", "Automotive", "john.smith@acme.com", "+1-555-0101"),
        ("CUST002", "Global Energy Solutions", "Energy", "sarah.jones@ges.com", "+1-555-0102"),
        ("CUST003", "Precision Motors Ltd", "Aerospace", "mike.chen@precisionmotors.com", "+1-555-0103"),
        ("CUST004", "Nordic Industrial Systems", "Heavy Machinery", "erik.hansen@nis.eu", "+46-555-0104"),
        ("CUST005", "Pacific Automation Inc", "Electronics", "yuki.tanaka@pacauto.co.jp", "+81-555-0105"),
    ]
    
    for c in customers:
        conn.execute(f"""
            CREATE (c:Customer {{
                id: '{c[0]}', name: '{c[1]}', industry: '{c[2]}', 
                contact_email: '{c[3]}', contact_phone: '{c[4]}'
            }})
        """)
    
    # Customer Locations
    locations = [
        ("LOC001", "CUST001", "Detroit Plant", "1234 Industrial Blvd", "Detroit", "USA", "Manufacturing"),
        ("LOC002", "CUST001", "Chicago Warehouse", "5678 Storage Ave", "Chicago", "USA", "Distribution"),
        ("LOC003", "CUST002", "Houston Refinery", "9012 Energy Way", "Houston", "USA", "Processing"),
        ("LOC004", "CUST002", "Denver Office", "3456 Corporate Dr", "Denver", "USA", "Administrative"),
        ("LOC005", "CUST003", "Seattle Assembly", "7890 Aerospace Ln", "Seattle", "USA", "Assembly"),
        ("LOC006", "CUST004", "Stockholm HQ", "123 Nordic Street", "Stockholm", "Sweden", "Headquarters"),
        ("LOC007", "CUST005", "Tokyo R&D Center", "456 Tech Park", "Tokyo", "Japan", "Research"),
    ]
    
    for loc in locations:
        conn.execute(f"""
            CREATE (l:CustomerLocation {{
                id: '{loc[0]}', customer_id: '{loc[1]}', name: '{loc[2]}',
                address: '{loc[3]}', city: '{loc[4]}', country: '{loc[5]}', site_type: '{loc[6]}'
            }})
        """)
        conn.execute(f"""
            MATCH (c:Customer {{id: '{loc[1]}'}}), (l:CustomerLocation {{id: '{loc[0]}'}})
            CREATE (c)-[:HAS_LOCATION]->(l)
        """)
    
    # Suppliers
    suppliers = [
        ("SUP001", "TechParts International", "sales@techparts.com", "+1-555-2001", "100 Supplier Rd, Austin, TX", 4.5),
        ("SUP002", "Global Components Ltd", "orders@globalcomp.co.uk", "+44-555-2002", "50 Industrial Way, Manchester, UK", 4.2),
        ("SUP003", "Asian Manufacturing Co", "contact@asianmfg.cn", "+86-555-2003", "888 Factory Blvd, Shenzhen, China", 4.0),
        ("SUP004", "European Precision GmbH", "info@europrecision.de", "+49-555-2004", "25 Werkstrasse, Munich, Germany", 4.8),
        ("SUP005", "Quality Materials Inc", "support@qualmat.com", "+1-555-2005", "300 Materials Dr, Cleveland, OH", 3.9),
    ]
    
    for s in suppliers:
        conn.execute(f"""
            CREATE (s:Supplier {{
                id: '{s[0]}', name: '{s[1]}', contact_email: '{s[2]}',
                contact_phone: '{s[3]}', address: '{s[4]}', rating: {s[5]}
            }})
        """)
    
    # Plants
    plants = [
        ("PLT001", "Main Assembly Plant", "Pittsburgh, PA", "Assembly"),
        ("PLT002", "Component Manufacturing", "Cleveland, OH", "Manufacturing"),
        ("PLT003", "Quality Testing Facility", "Columbus, OH", "Testing"),
    ]
    
    for p in plants:
        conn.execute(f"""
            CREATE (p:Plant {{
                id: '{p[0]}', name: '{p[1]}', location: '{p[2]}', plant_type: '{p[3]}'
            }})
        """)
    
    # Stations
    stations = [
        ("STN001", "PLT001", "Assembly Line A", "Assembly", 100),
        ("STN002", "PLT001", "Assembly Line B", "Assembly", 80),
        ("STN003", "PLT001", "Quality Control Station", "Inspection", 50),
        ("STN004", "PLT002", "CNC Machining", "Machining", 40),
        ("STN005", "PLT002", "Welding Bay", "Welding", 30),
        ("STN006", "PLT003", "Endurance Testing", "Testing", 20),
    ]
    
    for stn in stations:
        conn.execute(f"""
            CREATE (s:Station {{
                id: '{stn[0]}', plant_id: '{stn[1]}', name: '{stn[2]}',
                station_type: '{stn[3]}', capacity: {stn[4]}
            }})
        """)
        conn.execute(f"""
            MATCH (s:Station {{id: '{stn[0]}'}}), (p:Plant {{id: '{stn[1]}'}})
            CREATE (s)-[:BELONGS_TO]->(p)
        """)
    
    # Warehouses
    warehouses = [
        ("WH001", "Central Receiving Warehouse", "Pittsburgh, PA", 10000),
        ("WH002", "Components Storage", "Cleveland, OH", 5000),
        ("WH003", "Finished Goods Warehouse", "Columbus, OH", 8000),
    ]
    
    for wh in warehouses:
        conn.execute(f"""
            CREATE (w:Warehouse {{
                id: '{wh[0]}', name: '{wh[1]}', location: '{wh[2]}', capacity: {wh[3]}
            }})
        """)
    
    # Supplier POs
    pos = [
        ("PO001", "SUP001", "PO-2024-001", "2024-01-15", "2024-02-01", "Delivered", 25000.00),
        ("PO002", "SUP001", "PO-2024-002", "2024-02-20", "2024-03-05", "Delivered", 18500.00),
        ("PO003", "SUP002", "PO-2024-003", "2024-03-01", "2024-03-20", "Delivered", 32000.00),
        ("PO004", "SUP003", "PO-2024-004", "2024-03-15", "2024-04-10", "Delivered", 45000.00),
        ("PO005", "SUP004", "PO-2024-005", "2024-04-01", "2024-04-25", "Delivered", 28000.00),
        ("PO006", "SUP002", "PO-2024-006", "2024-05-01", "2024-05-20", "In Transit", 22000.00),
    ]
    
    for po in pos:
        conn.execute(f"""
            CREATE (p:SupplierPO {{
                id: '{po[0]}', supplier_id: '{po[1]}', po_number: '{po[2]}',
                order_date: date('{po[3]}'), delivery_date: date('{po[4]}'),
                status: '{po[5]}', total_amount: {po[6]}
            }})
        """)
        conn.execute(f"""
            MATCH (po:SupplierPO {{id: '{po[0]}'}}), (s:Supplier {{id: '{po[1]}'}})
            CREATE (po)-[:ISSUED_BY]->(s)
        """)
    
    # Parts (with lot numbers for traceability)
    parts = [
        ("PRT001", "PN-10001", "Hydraulic Pump", "High-pressure hydraulic pump assembly", "Hydraulic", "LOT-2024-A001"),
        ("PRT002", "PN-10001", "Hydraulic Pump", "High-pressure hydraulic pump assembly", "Hydraulic", "LOT-2024-A001"),
        ("PRT003", "PN-10001", "Hydraulic Pump", "High-pressure hydraulic pump assembly", "Hydraulic", "LOT-2024-A001"),
        ("PRT004", "PN-10002", "Control Valve", "Precision control valve unit", "Valve", "LOT-2024-B001"),
        ("PRT005", "PN-10002", "Control Valve", "Precision control valve unit", "Valve", "LOT-2024-B001"),
        ("PRT006", "PN-10003", "Bearing Assembly", "High-speed bearing assembly", "Bearing", "LOT-2024-C001"),
        ("PRT007", "PN-10003", "Bearing Assembly", "High-speed bearing assembly", "Bearing", "LOT-2024-C001"),
        ("PRT008", "PN-10004", "Electric Motor", "Variable speed electric motor", "Motor", "LOT-2024-D001"),
        ("PRT009", "PN-10005", "Sensor Module", "Multi-axis sensor module", "Electronics", "LOT-2024-E001"),
        ("PRT010", "PN-10005", "Sensor Module", "Multi-axis sensor module", "Electronics", "LOT-2024-E001"),
    ]
    
    for prt in parts:
        conn.execute(f"""
            CREATE (p:Part {{
                id: '{prt[0]}', part_number: '{prt[1]}', name: '{prt[2]}',
                description: '{prt[3]}', category: '{prt[4]}', lot_number: '{prt[5]}'
            }})
        """)
    
    # Link parts to suppliers and POs
    part_supplier_po = [
        ("PRT001", "SUP001", "PO001"), ("PRT002", "SUP001", "PO001"), ("PRT003", "SUP001", "PO002"),
        ("PRT004", "SUP002", "PO003"), ("PRT005", "SUP002", "PO003"),
        ("PRT006", "SUP004", "PO005"), ("PRT007", "SUP004", "PO005"),
        ("PRT008", "SUP003", "PO004"), ("PRT009", "SUP001", "PO001"), ("PRT010", "SUP001", "PO002"),
    ]
    
    for psp in part_supplier_po:
        conn.execute(f"""
            MATCH (p:Part {{id: '{psp[0]}'}}), (s:Supplier {{id: '{psp[1]}'}})
            CREATE (p)-[:SUPPLIED_BY]->(s)
        """)
        conn.execute(f"""
            MATCH (p:Part {{id: '{psp[0]}'}}), (po:SupplierPO {{id: '{psp[2]}'}})
            CREATE (p)-[:FROM_PO]->(po)
        """)
    
    # Link parts to warehouses (receiving)
    part_warehouse = [
        ("PRT001", "WH001", "2024-02-02"), ("PRT002", "WH001", "2024-02-02"), ("PRT003", "WH001", "2024-03-06"),
        ("PRT004", "WH002", "2024-03-21"), ("PRT005", "WH002", "2024-03-21"),
        ("PRT006", "WH001", "2024-04-26"), ("PRT007", "WH001", "2024-04-26"),
        ("PRT008", "WH002", "2024-04-11"), ("PRT009", "WH001", "2024-02-02"), ("PRT010", "WH001", "2024-03-06"),
    ]
    
    for pw in part_warehouse:
        conn.execute(f"""
            MATCH (p:Part {{id: '{pw[0]}'}}), (w:Warehouse {{id: '{pw[1]}'}})
            CREATE (p)-[:RECEIVED_AT {{receipt_date: date('{pw[2]}')}}]->(w)
        """)
    
    # Link parts to stations (assembly)
    part_station = [
        ("PRT001", "STN001", "2024-02-15"), ("PRT002", "STN002", "2024-02-16"), ("PRT003", "STN001", "2024-03-20"),
        ("PRT004", "STN001", "2024-03-25"), ("PRT005", "STN002", "2024-03-26"),
        ("PRT006", "STN004", "2024-05-01"), ("PRT007", "STN004", "2024-05-02"),
        ("PRT008", "STN005", "2024-04-20"), ("PRT009", "STN001", "2024-02-15"), ("PRT010", "STN002", "2024-03-20"),
    ]
    
    for ps in part_station:
        conn.execute(f"""
            MATCH (p:Part {{id: '{ps[0]}'}}), (s:Station {{id: '{ps[1]}'}})
            CREATE (p)-[:ASSEMBLED_AT {{assembly_date: date('{ps[2]}')}}]->(s)
        """)
    
    # Link parts to plants
    part_plant = [
        ("PRT001", "PLT001", "2024-02-15"), ("PRT002", "PLT001", "2024-02-16"), ("PRT003", "PLT001", "2024-03-20"),
        ("PRT004", "PLT001", "2024-03-25"), ("PRT005", "PLT001", "2024-03-26"),
        ("PRT006", "PLT002", "2024-05-01"), ("PRT007", "PLT002", "2024-05-02"),
        ("PRT008", "PLT002", "2024-04-20"), ("PRT009", "PLT001", "2024-02-15"), ("PRT010", "PLT001", "2024-03-20"),
    ]
    
    for pp in part_plant:
        conn.execute(f"""
            MATCH (p:Part {{id: '{pp[0]}'}}), (pl:Plant {{id: '{pp[1]}'}})
            CREATE (p)-[:INSTALLED_BY {{install_date: date('{pp[2]}')}}]->(pl)
        """)
    
    # Assemblies
    assemblies = [
        ("ASM001", "Industrial Compressor Unit", "ICU-3000", "SN-2024-001", "2024-02-20", "2024-03-15"),
        ("ASM002", "Hydraulic Power Pack", "HPP-500", "SN-2024-002", "2024-03-01", "2024-04-01"),
        ("ASM003", "Automated Control System", "ACS-200", "SN-2024-003", "2024-03-25", "2024-04-20"),
        ("ASM004", "Precision Motor Assembly", "PMA-100", "SN-2024-004", "2024-04-15", "2024-05-10"),
    ]
    
    for asm in assemblies:
        conn.execute(f"""
            CREATE (a:Assembly {{
                id: '{asm[0]}', name: '{asm[1]}', model: '{asm[2]}',
                serial_number: '{asm[3]}', manufacture_date: date('{asm[4]}'),
                commission_date: date('{asm[5]}')
            }})
        """)
    
    # Link assemblies to parts
    assembly_parts = [
        ("ASM001", "PRT001", 1, "Main Pump"), ("ASM001", "PRT004", 2, "Control Valves"), ("ASM001", "PRT009", 1, "Sensor Unit"),
        ("ASM002", "PRT002", 1, "Primary Pump"), ("ASM002", "PRT005", 1, "Main Valve"), ("ASM002", "PRT006", 2, "Bearings"),
        ("ASM003", "PRT003", 1, "Backup Pump"), ("ASM003", "PRT010", 4, "Sensor Array"),
        ("ASM004", "PRT007", 2, "Motor Bearings"), ("ASM004", "PRT008", 1, "Drive Motor"),
    ]
    
    for ap in assembly_parts:
        conn.execute(f"""
            MATCH (a:Assembly {{id: '{ap[0]}'}}), (p:Part {{id: '{ap[1]}'}})
            CREATE (a)-[:CONTAINS_PART {{quantity: {ap[2]}, position: '{ap[3]}'}}]->(p)
        """)
    
    # Link assemblies to customer locations
    assembly_locations = [
        ("ASM001", "LOC001", "2024-03-15"),
        ("ASM002", "LOC003", "2024-04-01"),
        ("ASM003", "LOC005", "2024-04-20"),
        ("ASM004", "LOC006", "2024-05-10"),
    ]
    
    for al in assembly_locations:
        conn.execute(f"""
            MATCH (a:Assembly {{id: '{al[0]}'}}), (l:CustomerLocation {{id: '{al[1]}'}})
            CREATE (a)-[:COMMISSIONED_AT {{commission_date: date('{al[2]}')}}]->(l)
        """)
    
    # Warranties
    warranties = [
        ("WAR001", "ASM001", "Extended", "2024-03-15", "2027-03-15", "Full parts and labor coverage including on-site service", "Active"),
        ("WAR002", "ASM002", "Standard", "2024-04-01", "2026-04-01", "Parts replacement only", "Active"),
        ("WAR003", "ASM003", "Premium", "2024-04-20", "2029-04-20", "Full coverage with 24/7 support and preventive maintenance", "Active"),
        ("WAR004", "ASM004", "Standard", "2024-05-10", "2026-05-10", "Parts replacement with limited labor", "Active"),
    ]
    
    for war in warranties:
        conn.execute(f"""
            CREATE (w:Warranty {{
                id: '{war[0]}', assembly_id: '{war[1]}', warranty_type: '{war[2]}',
                start_date: date('{war[3]}'), end_date: date('{war[4]}'),
                coverage_details: '{war[5]}', status: '{war[6]}'
            }})
        """)
        conn.execute(f"""
            MATCH (a:Assembly {{id: '{war[1]}'}}), (w:Warranty {{id: '{war[0]}'}})
            CREATE (a)-[:HAS_WARRANTY]->(w)
        """)
    
    # Service Records
    services = [
        ("SVC001", "ASM001", "2024-06-15", "Preventive", "John Davis", "Routine inspection and lubrication", "2024-09-15"),
        ("SVC002", "ASM001", "2024-09-20", "Corrective", "Mike Wilson", "Replaced seal due to minor leak", "2024-12-20"),
        ("SVC003", "ASM002", "2024-07-01", "Preventive", "Sarah Brown", "Filter replacement and system check", "2024-10-01"),
        ("SVC004", "ASM003", "2024-08-15", "Calibration", "Tom Chen", "Sensor calibration and software update", "2025-02-15"),
    ]
    
    for svc in services:
        conn.execute(f"""
            CREATE (s:ServiceRecord {{
                id: '{svc[0]}', assembly_id: '{svc[1]}', service_date: date('{svc[2]}'),
                service_type: '{svc[3]}', technician: '{svc[4]}', notes: '{svc[5]}',
                next_service_date: date('{svc[6]}')
            }})
        """)
        conn.execute(f"""
            MATCH (a:Assembly {{id: '{svc[1]}'}}), (s:ServiceRecord {{id: '{svc[0]}'}})
            CREATE (a)-[:SERVICED]->(s)
        """)
    
    # Failures
    failures = [
        ("FAIL001", "PRT001", "2024-11-10", "Seal Failure", "High temperature operation above 85C for extended period", "Hot environment, continuous operation", "Reduced flow rate, visible leak"),
        ("FAIL002", "PRT006", "2024-10-05", "Bearing Wear", "Inadequate lubrication during high-speed operation", "Normal operating conditions", "Unusual noise, vibration increase"),
    ]
    
    for fail in failures:
        conn.execute(f"""
            CREATE (f:Failure {{
                id: '{fail[0]}', part_id: '{fail[1]}', failure_date: date('{fail[2]}'),
                failure_mode: '{fail[3]}', conditions: '{fail[4]}', environment: '{fail[5]}',
                symptoms: '{fail[6]}'
            }})
        """)
        conn.execute(f"""
            MATCH (p:Part {{id: '{fail[1]}'}}), (f:Failure {{id: '{fail[0]}'}})
            CREATE (p)-[:FAILED]->(f)
        """)
    
    # Root Causes
    root_causes = [
        ("RC001", "FAIL001", "Material", "Seal material degradation at high temperatures", "Replace with high-temperature resistant seal", "Implement temperature monitoring alerts"),
        ("RC002", "FAIL002", "Maintenance", "Lubrication interval too long for operating conditions", "Re-lubricate and replace worn bearing", "Reduce lubrication interval from 6 to 3 months"),
    ]
    
    for rc in root_causes:
        conn.execute(f"""
            CREATE (r:RootCause {{
                id: '{rc[0]}', failure_id: '{rc[1]}', cause_category: '{rc[2]}',
                description: '{rc[3]}', corrective_action: '{rc[4]}', preventive_action: '{rc[5]}'
            }})
        """)
        conn.execute(f"""
            MATCH (f:Failure {{id: '{rc[1]}'}}), (r:RootCause {{id: '{rc[0]}'}})
            CREATE (f)-[:HAS_ROOT_CAUSE]->(r)
        """)
    
    # Quality Inspections - Receiving
    receiving_inspections = [
        ("QI001", "Receiving", "2024-02-02", "Inspector A", "WH001", "Pass", 95.0, "Visual and dimensional check passed"),
        ("QI002", "Receiving", "2024-02-02", "Inspector A", "WH001", "Pass", 92.0, "Minor cosmetic issues noted but within spec"),
        ("QI003", "Receiving", "2024-03-21", "Inspector B", "WH002", "Pass with Deviation", 88.0, "Slight dimension variance"),
        ("QI004", "Receiving", "2024-04-26", "Inspector C", "WH001", "Pass", 98.0, "Excellent quality"),
    ]
    
    for qi in receiving_inspections:
        conn.execute(f"""
            CREATE (q:QualityInspection {{
                id: '{qi[0]}', inspection_type: '{qi[1]}', inspection_date: date('{qi[2]}'),
                inspector: '{qi[3]}', location: '{qi[4]}', result: '{qi[5]}',
                score: {qi[6]}, notes: '{qi[7]}'
            }})
        """)
    
    # Link receiving inspections to parts
    receiving_part_inspections = [
        ("PRT001", "QI001"), ("PRT002", "QI001"), ("PRT009", "QI002"),
        ("PRT004", "QI003"), ("PRT005", "QI003"),
        ("PRT006", "QI004"), ("PRT007", "QI004"),
    ]
    
    for rpi in receiving_part_inspections:
        conn.execute(f"""
            MATCH (p:Part {{id: '{rpi[0]}'}}), (q:QualityInspection {{id: '{rpi[1]}'}})
            CREATE (p)-[:INSPECTED_RECEIVING]->(q)
        """)
    
    # Quality Inspections - Assembly
    assembly_inspections = [
        ("QI005", "Assembly", "2024-02-15", "QC Tech 1", "PLT001", "Pass", 96.0, "All torque specs verified"),
        ("QI006", "Assembly", "2024-02-16", "QC Tech 2", "PLT001", "Pass", 94.0, "Assembly complete and tested"),
        ("QI007", "Assembly", "2024-03-25", "QC Tech 1", "PLT001", "Pass with Deviation", 89.0, "Alignment adjustment required"),
        ("QI008", "Assembly", "2024-05-01", "QC Tech 3", "PLT002", "Pass", 97.0, "Precision assembly verified"),
    ]
    
    for qi in assembly_inspections:
        conn.execute(f"""
            CREATE (q:QualityInspection {{
                id: '{qi[0]}', inspection_type: '{qi[1]}', inspection_date: date('{qi[2]}'),
                inspector: '{qi[3]}', location: '{qi[4]}', result: '{qi[5]}',
                score: {qi[6]}, notes: '{qi[7]}'
            }})
        """)
    
    # Link assembly inspections to parts
    assembly_part_inspections = [
        ("PRT001", "QI005"), ("PRT009", "QI005"),
        ("PRT002", "QI006"), ("PRT006", "QI006"),
        ("PRT004", "QI007"), ("PRT005", "QI007"),
        ("PRT007", "QI008"), ("PRT008", "QI008"),
    ]
    
    for api in assembly_part_inspections:
        conn.execute(f"""
            MATCH (p:Part {{id: '{api[0]}'}}), (q:QualityInspection {{id: '{api[1]}'}})
            CREATE (p)-[:INSPECTED_ASSEMBLY]->(q)
        """)
    
    # Quality Inspections - Commissioning
    commissioning_inspections = [
        ("QI009", "Commissioning", "2024-03-15", "Field Engineer A", "LOC001", "Pass", 95.0, "System operational, all parameters nominal"),
        ("QI010", "Commissioning", "2024-04-01", "Field Engineer B", "LOC003", "Pass with Deviation", 90.0, "Minor calibration adjustment post-install"),
        ("QI011", "Commissioning", "2024-04-20", "Field Engineer A", "LOC005", "Pass", 98.0, "Excellent installation quality"),
        ("QI012", "Commissioning", "2024-05-10", "Field Engineer C", "LOC006", "Pass", 94.0, "System verified and customer trained"),
    ]
    
    for qi in commissioning_inspections:
        conn.execute(f"""
            CREATE (q:QualityInspection {{
                id: '{qi[0]}', inspection_type: '{qi[1]}', inspection_date: date('{qi[2]}'),
                inspector: '{qi[3]}', location: '{qi[4]}', result: '{qi[5]}',
                score: {qi[6]}, notes: '{qi[7]}'
            }})
        """)
    
    # Link commissioning inspections to assemblies
    commissioning_assembly_inspections = [
        ("ASM001", "QI009"), ("ASM002", "QI010"), ("ASM003", "QI011"), ("ASM004", "QI012"),
    ]
    
    for cai in commissioning_assembly_inspections:
        conn.execute(f"""
            MATCH (a:Assembly {{id: '{cai[0]}'}}), (q:QualityInspection {{id: '{cai[1]}'}})
            CREATE (a)-[:INSPECTED_COMMISSIONING]->(q)
        """)
    
    # Deviations
    deviations = [
        ("DEV001", "Dimensional", "Minor", "Part dimension 0.5mm outside tolerance", "2024-03-21", "Accepted with engineering approval", "2024-03-22"),
        ("DEV002", "Alignment", "Minor", "Valve alignment required adjustment", "2024-03-25", "Realigned during assembly", "2024-03-25"),
        ("DEV003", "Calibration", "Minor", "Pressure sensor required recalibration", "2024-04-01", "Recalibrated on-site", "2024-04-02"),
    ]
    
    for dev in deviations:
        conn.execute(f"""
            CREATE (d:Deviation {{
                id: '{dev[0]}', deviation_type: '{dev[1]}', severity: '{dev[2]}',
                description: '{dev[3]}', detected_date: date('{dev[4]}'),
                resolution: '{dev[5]}', resolution_date: date('{dev[6]}')
            }})
        """)
    
    # Link deviations to inspections
    inspection_deviations = [
        ("QI003", "DEV001"), ("QI007", "DEV002"), ("QI010", "DEV003"),
    ]
    
    for id in inspection_deviations:
        conn.execute(f"""
            MATCH (q:QualityInspection {{id: '{id[0]}'}}), (d:Deviation {{id: '{id[1]}'}})
            CREATE (q)-[:HAS_DEVIATION]->(d)
        """)

def init_database():
    """Initialize database with schema and data"""
    db = get_db()
    conn = kuzu.Connection(db)
    init_schema(conn)
    populate_dummy_data(conn)
    
    # Save initial version
    if not os.path.exists(os.path.join(VERSIONS_PATH, "v1")):
        save_version_snapshot("Initial data load")
    
    return db, conn

# Initialize on startup
db, conn = init_database()

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "database": "kuzu"}

@app.get("/stats")
async def get_stats():
    """Get database statistics"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    stats = {}
    tables = ["Customer", "CustomerLocation", "Assembly", "Part", "Warranty", 
              "ServiceRecord", "Failure", "RootCause", "Plant", "Station", 
              "Warehouse", "Supplier", "SupplierPO", "QualityInspection", "Deviation"]
    
    for table in tables:
        try:
            result = conn.execute(f"MATCH (n:{table}) RETURN count(n) as cnt")
            if result.has_next():
                stats[table] = result.get_next()[0]
        except:
            stats[table] = 0
    
    stats["current_version"] = get_current_version()
    stats["available_versions"] = len(get_all_versions())
    
    return stats

@app.get("/versions")
async def get_versions():
    """Get all available data versions"""
    return {"versions": get_all_versions(), "current_version": get_current_version()}

@app.post("/versions/rollback/{version}")
async def rollback_version(version: int):
    """Rollback to a specific version"""
    if rollback_to_version(version):
        global db, conn
        db = get_db()
        conn = kuzu.Connection(db)
        return {"success": True, "message": f"Rolled back to version {version}"}
    return {"success": False, "message": f"Version {version} not found"}

@app.get("/export")
async def export_data():
    """Export all data to Excel format"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    output = BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Export each node table
        node_tables = {
            "Customers": "MATCH (n:Customer) RETURN n.id as id, n.name as name, n.industry as industry, n.contact_email as contact_email, n.contact_phone as contact_phone",
            "CustomerLocations": "MATCH (n:CustomerLocation) RETURN n.id as id, n.customer_id as customer_id, n.name as name, n.address as address, n.city as city, n.country as country, n.site_type as site_type",
            "Assemblies": "MATCH (n:Assembly) RETURN n.id as id, n.name as name, n.model as model, n.serial_number as serial_number, n.manufacture_date as manufacture_date, n.commission_date as commission_date",
            "Parts": "MATCH (n:Part) RETURN n.id as id, n.part_number as part_number, n.name as name, n.description as description, n.category as category, n.lot_number as lot_number",
            "Warranties": "MATCH (n:Warranty) RETURN n.id as id, n.assembly_id as assembly_id, n.warranty_type as warranty_type, n.start_date as start_date, n.end_date as end_date, n.coverage_details as coverage_details, n.status as status",
            "ServiceRecords": "MATCH (n:ServiceRecord) RETURN n.id as id, n.assembly_id as assembly_id, n.service_date as service_date, n.service_type as service_type, n.technician as technician, n.notes as notes, n.next_service_date as next_service_date",
            "Failures": "MATCH (n:Failure) RETURN n.id as id, n.part_id as part_id, n.failure_date as failure_date, n.failure_mode as failure_mode, n.conditions as conditions, n.environment as environment, n.symptoms as symptoms",
            "RootCauses": "MATCH (n:RootCause) RETURN n.id as id, n.failure_id as failure_id, n.cause_category as cause_category, n.description as description, n.corrective_action as corrective_action, n.preventive_action as preventive_action",
            "Plants": "MATCH (n:Plant) RETURN n.id as id, n.name as name, n.location as location, n.plant_type as plant_type",
            "Stations": "MATCH (n:Station) RETURN n.id as id, n.plant_id as plant_id, n.name as name, n.station_type as station_type, n.capacity as capacity",
            "Warehouses": "MATCH (n:Warehouse) RETURN n.id as id, n.name as name, n.location as location, n.capacity as capacity",
            "Suppliers": "MATCH (n:Supplier) RETURN n.id as id, n.name as name, n.contact_email as contact_email, n.contact_phone as contact_phone, n.address as address, n.rating as rating",
            "SupplierPOs": "MATCH (n:SupplierPO) RETURN n.id as id, n.supplier_id as supplier_id, n.po_number as po_number, n.order_date as order_date, n.delivery_date as delivery_date, n.status as status, n.total_amount as total_amount",
            "QualityInspections": "MATCH (n:QualityInspection) RETURN n.id as id, n.inspection_type as inspection_type, n.inspection_date as inspection_date, n.inspector as inspector, n.location as location, n.result as result, n.score as score, n.notes as notes",
            "Deviations": "MATCH (n:Deviation) RETURN n.id as id, n.deviation_type as deviation_type, n.severity as severity, n.description as description, n.detected_date as detected_date, n.resolution as resolution, n.resolution_date as resolution_date",
        }
        
        for sheet_name, query in node_tables.items():
            try:
                result = conn.execute(query)
                columns = result.get_column_names()
                rows = []
                while result.has_next():
                    rows.append(result.get_next())
                df = pd.DataFrame(rows, columns=columns)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
            except Exception as e:
                # Create empty sheet with headers
                df = pd.DataFrame()
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        # Export relationship tables
        rel_tables = {
            "Rel_AssemblyParts": "MATCH (a:Assembly)-[r:CONTAINS_PART]->(p:Part) RETURN a.id as assembly_id, p.id as part_id, r.quantity as quantity, r.position as position",
            "Rel_AssemblyLocations": "MATCH (a:Assembly)-[r:COMMISSIONED_AT]->(l:CustomerLocation) RETURN a.id as assembly_id, l.id as location_id, r.commission_date as commission_date",
            "Rel_PartSuppliers": "MATCH (p:Part)-[:SUPPLIED_BY]->(s:Supplier) RETURN p.id as part_id, s.id as supplier_id",
            "Rel_PartPOs": "MATCH (p:Part)-[:FROM_PO]->(po:SupplierPO) RETURN p.id as part_id, po.id as po_id",
            "Rel_PartWarehouses": "MATCH (p:Part)-[r:RECEIVED_AT]->(w:Warehouse) RETURN p.id as part_id, w.id as warehouse_id, r.receipt_date as receipt_date",
            "Rel_PartStations": "MATCH (p:Part)-[r:ASSEMBLED_AT]->(s:Station) RETURN p.id as part_id, s.id as station_id, r.assembly_date as assembly_date",
            "Rel_PartReceivingInsp": "MATCH (p:Part)-[:INSPECTED_RECEIVING]->(q:QualityInspection) RETURN p.id as part_id, q.id as inspection_id",
            "Rel_PartAssemblyInsp": "MATCH (p:Part)-[:INSPECTED_ASSEMBLY]->(q:QualityInspection) RETURN p.id as part_id, q.id as inspection_id",
            "Rel_AssemblyCommInsp": "MATCH (a:Assembly)-[:INSPECTED_COMMISSIONING]->(q:QualityInspection) RETURN a.id as assembly_id, q.id as inspection_id",
            "Rel_InspectionDeviations": "MATCH (q:QualityInspection)-[:HAS_DEVIATION]->(d:Deviation) RETURN q.id as inspection_id, d.id as deviation_id",
        }
        
        for sheet_name, query in rel_tables.items():
            try:
                result = conn.execute(query)
                columns = result.get_column_names()
                rows = []
                while result.has_next():
                    rows.append(result.get_next())
                df = pd.DataFrame(rows, columns=columns)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
            except Exception as e:
                df = pd.DataFrame()
                df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=kuzu_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )

@app.post("/import")
async def import_data(file: fastapi.UploadFile):
    """Import data from Excel file"""
    global db, conn
    
    # Save current version before import
    save_version_snapshot("Pre-import backup")
    
    try:
        contents = await file.read()
        excel_file = BytesIO(contents)
        
        # Clear existing data and reinitialize schema
        if os.path.exists(DB_BASE_PATH):
            shutil.rmtree(DB_BASE_PATH)
        
        db = get_db()
        conn = kuzu.Connection(db)
        init_schema(conn)
        
        # Read all sheets
        xl = pd.ExcelFile(excel_file)
        
        # Import node tables
        node_imports = {
            "Customers": ("Customer", ["id", "name", "industry", "contact_email", "contact_phone"]),
            "CustomerLocations": ("CustomerLocation", ["id", "customer_id", "name", "address", "city", "country", "site_type"]),
            "Assemblies": ("Assembly", ["id", "name", "model", "serial_number", "manufacture_date", "commission_date"]),
            "Parts": ("Part", ["id", "part_number", "name", "description", "category", "lot_number"]),
            "Warranties": ("Warranty", ["id", "assembly_id", "warranty_type", "start_date", "end_date", "coverage_details", "status"]),
            "ServiceRecords": ("ServiceRecord", ["id", "assembly_id", "service_date", "service_type", "technician", "notes", "next_service_date"]),
            "Failures": ("Failure", ["id", "part_id", "failure_date", "failure_mode", "conditions", "environment", "symptoms"]),
            "RootCauses": ("RootCause", ["id", "failure_id", "cause_category", "description", "corrective_action", "preventive_action"]),
            "Plants": ("Plant", ["id", "name", "location", "plant_type"]),
            "Stations": ("Station", ["id", "plant_id", "name", "station_type", "capacity"]),
            "Warehouses": ("Warehouse", ["id", "name", "location", "capacity"]),
            "Suppliers": ("Supplier", ["id", "name", "contact_email", "contact_phone", "address", "rating"]),
            "SupplierPOs": ("SupplierPO", ["id", "supplier_id", "po_number", "order_date", "delivery_date", "status", "total_amount"]),
            "QualityInspections": ("QualityInspection", ["id", "inspection_type", "inspection_date", "inspector", "location", "result", "score", "notes"]),
            "Deviations": ("Deviation", ["id", "deviation_type", "severity", "description", "detected_date", "resolution", "resolution_date"]),
        }
        
        imported_counts = {}
        
        for sheet_name, (table_name, columns) in node_imports.items():
            if sheet_name in xl.sheet_names:
                df = pd.read_excel(xl, sheet_name=sheet_name)
                if not df.empty:
                    for _, row in df.iterrows():
                        props = []
                        for col in columns:
                            if col in df.columns:
                                val = row[col]
                                if pd.isna(val):
                                    continue
                                if isinstance(val, (pd.Timestamp, datetime)):
                                    props.append(f"{col}: date('{val.strftime('%Y-%m-%d')}')")
                                elif isinstance(val, (int, float)) and col not in ["id", "name", "description"]:
                                    if col == "capacity":
                                        props.append(f"{col}: {int(val)}")
                                    else:
                                        props.append(f"{col}: {val}")
                                else:
                                    val_escaped = str(val).replace("'", "\\'")
                                    props.append(f"{col}: '{val_escaped}'")
                        
                        if props:
                            query = f"CREATE (n:{table_name} {{{', '.join(props)}}})"
                            try:
                                conn.execute(query)
                            except Exception as e:
                                print(f"Error importing {table_name}: {e}")
                    
                    imported_counts[sheet_name] = len(df)
        
        # Import relationships
        if "Rel_AssemblyParts" in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name="Rel_AssemblyParts")
            for _, row in df.iterrows():
                try:
                    conn.execute(f"""
                        MATCH (a:Assembly {{id: '{row['assembly_id']}'}}), (p:Part {{id: '{row['part_id']}'}})
                        CREATE (a)-[:CONTAINS_PART {{quantity: {int(row['quantity'])}, position: '{row['position']}'}}]->(p)
                    """)
                except:
                    pass
        
        # Additional relationship imports...
        rel_simple = [
            ("Rel_PartSuppliers", "Part", "Supplier", "SUPPLIED_BY", "part_id", "supplier_id"),
            ("Rel_PartPOs", "Part", "SupplierPO", "FROM_PO", "part_id", "po_id"),
            ("Rel_PartReceivingInsp", "Part", "QualityInspection", "INSPECTED_RECEIVING", "part_id", "inspection_id"),
            ("Rel_PartAssemblyInsp", "Part", "QualityInspection", "INSPECTED_ASSEMBLY", "part_id", "inspection_id"),
            ("Rel_AssemblyCommInsp", "Assembly", "QualityInspection", "INSPECTED_COMMISSIONING", "assembly_id", "inspection_id"),
            ("Rel_InspectionDeviations", "QualityInspection", "Deviation", "HAS_DEVIATION", "inspection_id", "deviation_id"),
        ]
        
        for sheet, from_table, to_table, rel_type, from_col, to_col in rel_simple:
            if sheet in xl.sheet_names:
                df = pd.read_excel(xl, sheet_name=sheet)
                for _, row in df.iterrows():
                    try:
                        conn.execute(f"""
                            MATCH (a:{from_table} {{id: '{row[from_col]}'}}), (b:{to_table} {{id: '{row[to_col]}'}})
                            CREATE (a)-[:{rel_type}]->(b)
                        """)
                    except:
                        pass
        
        # Save new version after import
        new_version = save_version_snapshot("Data import")
        
        return {
            "success": True,
            "message": "Data imported successfully",
            "imported": imported_counts,
            "new_version": new_version
        }
        
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/query/assembly/{assembly_id}")
async def get_assembly_details(assembly_id: str):
    """Get comprehensive details about an assembly"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    result = {}
    
    # Basic assembly info
    query = f"MATCH (a:Assembly {{id: '{assembly_id}'}}) RETURN a"
    res = conn.execute(query)
    if res.has_next():
        result["assembly"] = dict(res.get_next()[0])
    
    # Customer and location
    query = f"""
        MATCH (a:Assembly {{id: '{assembly_id}'}})-[:COMMISSIONED_AT]->(l:CustomerLocation)<-[:HAS_LOCATION]-(c:Customer)
        RETURN c, l
    """
    res = conn.execute(query)
    if res.has_next():
        row = res.get_next()
        result["customer"] = dict(row[0])
        result["location"] = dict(row[1])
    
    # Warranty
    query = f"""
        MATCH (a:Assembly {{id: '{assembly_id}'}})-[:HAS_WARRANTY]->(w:Warranty)
        RETURN w
    """
    res = conn.execute(query)
    if res.has_next():
        result["warranty"] = dict(res.get_next()[0])
    
    # Service records
    query = f"""
        MATCH (a:Assembly {{id: '{assembly_id}'}})-[:SERVICED]->(s:ServiceRecord)
        RETURN s ORDER BY s.service_date DESC
    """
    res = conn.execute(query)
    services = []
    while res.has_next():
        services.append(dict(res.get_next()[0]))
    result["service_records"] = services
    
    # Parts
    query = f"""
        MATCH (a:Assembly {{id: '{assembly_id}'}})-[r:CONTAINS_PART]->(p:Part)
        RETURN p, r.quantity as quantity, r.position as position
    """
    res = conn.execute(query)
    parts = []
    while res.has_next():
        row = res.get_next()
        part = dict(row[0])
        part["quantity"] = row[1]
        part["position"] = row[2]
        parts.append(part)
    result["parts"] = parts
    
    return result

@app.get("/query/part/{part_id}/traceability")
async def get_part_traceability(part_id: str):
    """Get full traceability for a part"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    result = {"part_id": part_id}
    
    # Part info
    query = f"MATCH (p:Part {{id: '{part_id}'}}) RETURN p"
    res = conn.execute(query)
    if res.has_next():
        result["part"] = dict(res.get_next()[0])
    
    # Supplier info
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[:SUPPLIED_BY]->(s:Supplier)
        RETURN s
    """
    res = conn.execute(query)
    if res.has_next():
        result["supplier"] = dict(res.get_next()[0])
    
    # PO info
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[:FROM_PO]->(po:SupplierPO)
        RETURN po
    """
    res = conn.execute(query)
    if res.has_next():
        result["purchase_order"] = dict(res.get_next()[0])
    
    # Warehouse receiving
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[r:RECEIVED_AT]->(w:Warehouse)
        RETURN w, r.receipt_date as receipt_date
    """
    res = conn.execute(query)
    if res.has_next():
        row = res.get_next()
        result["warehouse"] = dict(row[0])
        result["receipt_date"] = str(row[1])
    
    # Assembly station
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[r:ASSEMBLED_AT]->(s:Station)-[:BELONGS_TO]->(pl:Plant)
        RETURN s, pl, r.assembly_date as assembly_date
    """
    res = conn.execute(query)
    if res.has_next():
        row = res.get_next()
        result["station"] = dict(row[0])
        result["plant"] = dict(row[1])
        result["assembly_date"] = str(row[2])
    
    # Quality inspections - receiving
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[:INSPECTED_RECEIVING]->(q:QualityInspection)
        OPTIONAL MATCH (q)-[:HAS_DEVIATION]->(d:Deviation)
        RETURN q, collect(d) as deviations
    """
    res = conn.execute(query)
    receiving_inspections = []
    while res.has_next():
        row = res.get_next()
        insp = dict(row[0])
        insp["deviations"] = [dict(d) for d in row[1] if d is not None]
        receiving_inspections.append(insp)
    result["receiving_inspections"] = receiving_inspections
    
    # Quality inspections - assembly
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[:INSPECTED_ASSEMBLY]->(q:QualityInspection)
        OPTIONAL MATCH (q)-[:HAS_DEVIATION]->(d:Deviation)
        RETURN q, collect(d) as deviations
    """
    res = conn.execute(query)
    assembly_inspections = []
    while res.has_next():
        row = res.get_next()
        insp = dict(row[0])
        insp["deviations"] = [dict(d) for d in row[1] if d is not None]
        assembly_inspections.append(insp)
    result["assembly_inspections"] = assembly_inspections
    
    # Failures
    query = f"""
        MATCH (p:Part {{id: '{part_id}'}})-[:FAILED]->(f:Failure)
        OPTIONAL MATCH (f)-[:HAS_ROOT_CAUSE]->(rc:RootCause)
        RETURN f, rc
    """
    res = conn.execute(query)
    failures = []
    while res.has_next():
        row = res.get_next()
        fail = dict(row[0])
        if row[1]:
            fail["root_cause"] = dict(row[1])
        failures.append(fail)
    result["failures"] = failures
    
    # Same lot parts
    if result.get("part"):
        lot_number = result["part"].get("lot_number")
        part_number = result["part"].get("part_number")
        if lot_number and part_number:
            query = f"""
                MATCH (p:Part {{lot_number: '{lot_number}', part_number: '{part_number}'}})
                WHERE p.id <> '{part_id}'
                RETURN p
            """
            res = conn.execute(query)
            same_lot = []
            while res.has_next():
                same_lot.append(dict(res.get_next()[0]))
            result["same_lot_parts"] = same_lot
    
    return result

@app.get("/query/failure/{failure_id}")
async def get_failure_details(failure_id: str):
    """Get details about a failure including root cause"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    result = {}
    
    # Failure and part info
    query = f"""
        MATCH (p:Part)-[:FAILED]->(f:Failure {{id: '{failure_id}'}})
        OPTIONAL MATCH (f)-[:HAS_ROOT_CAUSE]->(rc:RootCause)
        RETURN f, p, rc
    """
    res = conn.execute(query)
    if res.has_next():
        row = res.get_next()
        result["failure"] = dict(row[0])
        result["part"] = dict(row[1])
        if row[2]:
            result["root_cause"] = dict(row[2])
    
    return result

@app.get("/query/lot/{lot_number}")
async def get_lot_traceability(lot_number: str):
    """Get all parts from a specific lot and their locations"""
    db = get_db()
    conn = kuzu.Connection(db)
    
    # Get all parts in lot
    query = f"""
        MATCH (p:Part {{lot_number: '{lot_number}'}})
        OPTIONAL MATCH (p)-[r:RECEIVED_AT]->(w:Warehouse)
        OPTIONAL MATCH (p)-[r2:ASSEMBLED_AT]->(s:Station)
        OPTIONAL MATCH (a:Assembly)-[:CONTAINS_PART]->(p)
        OPTIONAL MATCH (a)-[:COMMISSIONED_AT]->(l:CustomerLocation)
        RETURN p, w, s, a, l
    """
    res = conn.execute(query)
    
    parts = []
    while res.has_next():
        row = res.get_next()
        part_info = {
            "part": dict(row[0]),
            "warehouse": dict(row[1]) if row[1] else None,
            "station": dict(row[2]) if row[2] else None,
            "assembly": dict(row[3]) if row[3] else None,
            "customer_location": dict(row[4]) if row[4] else None
        }
        parts.append(part_info)
    
    return {"lot_number": lot_number, "parts": parts}
