"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Box,
  Cog,
  Building2,
  Truck,
  Package,
  Users,
  MapPin,
  ShieldCheck,
  FileText,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Printer,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface Node {
  id: string
  label: string
  type: "product" | "component" | "facility" | "supplier" | "batch" | "customer" | "site" | "warranty" | "inspection" | "service"
  x: number
  y: number
  properties: Record<string, string>
  connections: string[]
}

// Nodes organized left-to-right: Supplier -> Batch -> Component -> Product -> Customer -> Site
// With inspection records at various stages
const nodes: Node[] = [
  // Column 1: Supplier (leftmost)
  {
    id: "stamford",
    label: "Stamford",
    type: "supplier",
    x: 60,
    y: 160,
    properties: {
      "Type": "OEM Supplier",
      "Location": "UK",
      "Components": "Alternators, Regulators",
      "Quality Rating": "A+",
    },
    connections: ["batch-847", "insp-supplier"],
  },
  // Column 2: Batch
  {
    id: "batch-847",
    label: "Batch SR-2024-0847",
    type: "batch",
    x: 150,
    y: 90,
    properties: {
      "Manufacturing Date": "Jun 15, 2024",
      "Units in Batch": "150",
      "Affected Units": "7",
      "Status": "Under Investigation",
    },
    connections: ["stamford", "alternator", "insp-supplier"],
  },
  // Column 2: Supplier Inspection Record
  {
    id: "insp-supplier",
    label: "Supplier QC",
    type: "inspection",
    x: 150,
    y: 230,
    properties: {
      "Type": "Incoming Inspection",
      "Date": "Jun 18, 2024",
      "Result": "Passed",
      "Inspector": "QC-UK-047",
    },
    connections: ["stamford", "batch-847"],
  },
  // Column 3: Components
  {
    id: "alternator",
    label: "S-Range Alternator",
    type: "component",
    x: 250,
    y: 90,
    properties: {
      "Part Number": "ALT-SR-750",
      "Supplier": "Stamford",
      "Status": "Flagged",
      "Batch": "SR-2024-0847",
    },
    connections: ["batch-847", "centum-x15", "insp-assembly"],
  },
  {
    id: "voltage-reg",
    label: "Voltage Regulator",
    type: "component",
    x: 250,
    y: 230,
    properties: {
      "Part Number": "VR-SX440",
      "Supplier": "Stamford",
      "Status": "Normal",
    },
    connections: ["centum-x15"],
  },
  // Column 4: Product Assembly
  {
    id: "centum-x15",
    label: "CENTUM X15 17L",
    type: "product",
    x: 350,
    y: 160,
    properties: {
      "Model": "17L Series",
      "Power Range": "600KW - 1000KW",
      "Category": "Generator Set",
      "Status": "Active Production",
    },
    connections: ["alternator", "voltage-reg", "insp-assembly", "unitypoint"],
  },
  // Column 4: Assembly Inspection
  {
    id: "insp-assembly",
    label: "Assembly QC",
    type: "inspection",
    x: 350,
    y: 300,
    properties: {
      "Type": "Assembly Inspection",
      "Date": "Jul 20, 2024",
      "Result": "Passed",
      "Inspector": "QC-MFG-112",
    },
    connections: ["centum-x15", "alternator"],
  },
  // Column 5: Customer
  {
    id: "unitypoint",
    label: "UnityPoint Health",
    type: "customer",
    x: 450,
    y: 90,
    properties: {
      "Type": "Healthcare Network",
      "Region": "Midwest USA",
      "Units Deployed": "12",
      "Contract": "Enterprise",
    },
    connections: ["centum-x15", "mercy-hills", "service-history"],
  },
  // Column 6: Customer Site
  {
    id: "mercy-hills",
    label: "Mercy Hills MC",
    type: "site",
    x: 540,
    y: 160,
    properties: {
      "Type": "Healthcare Facility",
      "Location": "Iowa City, IA",
      "Unit Serial": "17L-750KW-0847",
      "Install Date": "Aug 5, 2024",
    },
    connections: ["unitypoint", "insp-commission", "service-history"],
  },
  // Column 6: Commissioning Inspection
  {
    id: "insp-commission",
    label: "Commissioning",
    type: "inspection",
    x: 540,
    y: 300,
    properties: {
      "Type": "Site Commissioning",
      "Date": "Aug 10, 2024",
      "Result": "Passed",
      "Engineer": "FSE-MW-023",
    },
    connections: ["mercy-hills"],
  },
  // Column 5: Service History
  {
    id: "service-history",
    label: "Service Records",
    type: "service",
    x: 450,
    y: 230,
    properties: {
      "Last Service": "Feb 15, 2025",
      "Service Type": "Preventive",
      "Next Due": "Aug 15, 2025",
      "Total Visits": "3",
    },
    connections: ["mercy-hills", "unitypoint"],
  },
]

// Detailed inspection records data
const inspectionRecords: Record<string, {
  documentId: string
  revisionNumber: string
  title: string
  component: string
  serialNumber: string
  batchNumber: string
  stage: string
  date: string
  startTime: string
  endTime: string
  inspector: string
  inspectorCertification: string
  witnessedBy: string
  location: string
  referenceStandards: string[]
  testEquipment: { name: string; model: string; serialNumber: string; calibrationDate: string; calibrationDue: string }[]
  environmentalConditions: { parameter: string; value: string; acceptableRange: string }[]
  checks: { name: string; specification: string; actual: string; status: "pass" | "fail"; method: string; equipmentUsed: string }[]
  deviationsWithinTolerance: { parameter: string; specification: string; actual: string; tolerance: string; notes: string; riskAssessment: string }[]
  deviationsAccepted: { parameter: string; specification: string; actual: string; deviation: string; reason: string; conditions: string; riskLevel: string; mitigationActions: string; approvedBy: string; approvalDate: string }[]
  attachments: { name: string; type: string; description: string }[]
  signatures: { role: string; name: string; date: string; signature: string }[]
}> = {
  "insp-supplier": {
    documentId: "QC-INC-2024-0847-001",
    revisionNumber: "Rev 1.0",
    title: "Incoming Inspection Report - S-Range Alternator",
    component: "S-Range Alternator (ALT-SR-750)",
    serialNumber: "SR-750-2024-08472",
    batchNumber: "SR-2024-0847",
    stage: "Supplier Quality Control - Incoming Inspection",
    date: "June 18, 2024",
    startTime: "08:30 AM",
    endTime: "04:45 PM",
    inspector: "QC-UK-047 (James Thornton)",
    inspectorCertification: "ISO 9001:2015 Lead Auditor, IEC 60034 Certified Inspector",
    witnessedBy: "QC-UK-012 (Robert Hayes) - Senior Quality Engineer",
    location: "Stamford Manufacturing, Peterborough, UK - Receiving Inspection Bay 3",
    referenceStandards: [
      "IEC 60034-1:2022 - Rotating electrical machines",
      "ISO 8528-3:2020 - Reciprocating internal combustion engine driven alternating current generators",
      "CENTUM-QS-750-ALT-R3 - Internal Alternator Specification",
      "Stamford SOP-INC-2023-01 - Incoming Inspection Procedure"
    ],
    testEquipment: [
      { name: "Digital Multimeter", model: "Fluke 87V", serialNumber: "FL-87V-2847", calibrationDate: "Jan 15, 2024", calibrationDue: "Jan 15, 2025" },
      { name: "Megohmmeter", model: "Megger MIT1025", serialNumber: "MG-1025-1892", calibrationDate: "Mar 01, 2024", calibrationDue: "Mar 01, 2025" },
      { name: "Hi-Pot Tester", model: "Hipotronics 880PL", serialNumber: "HP-880-0934", calibrationDate: "Feb 10, 2024", calibrationDue: "Feb 10, 2025" },
      { name: "Digital Caliper", model: "Mitutoyo 500-196-30", serialNumber: "MT-196-4521", calibrationDate: "Apr 05, 2024", calibrationDue: "Apr 05, 2025" },
      { name: "Dial Indicator", model: "Starrett 25-441J", serialNumber: "ST-441-0782", calibrationDate: "May 20, 2024", calibrationDue: "May 20, 2025" },
      { name: "Coating Thickness Gauge", model: "Elcometer 456", serialNumber: "EL-456-2341", calibrationDate: "Apr 12, 2024", calibrationDue: "Apr 12, 2025" },
      { name: "Dynamic Balancing Machine", model: "Schenck CAB 920", serialNumber: "SC-920-0156", calibrationDate: "Jan 30, 2024", calibrationDue: "Jan 30, 2025" },
    ],
    environmentalConditions: [
      { parameter: "Ambient Temperature", value: "22.4°C", acceptableRange: "18-28°C" },
      { parameter: "Relative Humidity", value: "48%", acceptableRange: "30-70%" },
      { parameter: "Atmospheric Pressure", value: "1013 mbar", acceptableRange: "950-1050 mbar" },
      { parameter: "Lighting Level", value: "850 lux", acceptableRange: ">500 lux" },
    ],
    checks: [
      { name: "Visual Inspection", specification: "No visible defects, scratches, or dents", actual: "Clean, no visible defects observed", status: "pass", method: "Visual examination under 850 lux lighting", equipmentUsed: "10x Magnifying glass, LED inspection lamp" },
      { name: "Dimensional Check - Shaft Diameter", specification: "75.00 mm ± 0.02 mm", actual: "75.01 mm", status: "pass", method: "3-point measurement at 0°, 120°, 240°", equipmentUsed: "Mitutoyo 500-196-30 Digital Caliper" },
      { name: "Dimensional Check - Overall Length", specification: "850 mm ± 1 mm", actual: "850.3 mm", status: "pass", method: "End-to-end measurement on V-blocks", equipmentUsed: "Mitutoyo 500-196-30 Digital Caliper" },
      { name: "Winding Resistance (Phase A-B)", specification: "0.012 Ω ± 5%", actual: "0.0118 Ω", status: "pass", method: "4-wire Kelvin measurement at 20°C ref", equipmentUsed: "Fluke 87V Digital Multimeter" },
      { name: "Winding Resistance (Phase B-C)", specification: "0.012 Ω ± 5%", actual: "0.0121 Ω", status: "pass", method: "4-wire Kelvin measurement at 20°C ref", equipmentUsed: "Fluke 87V Digital Multimeter" },
      { name: "Winding Resistance (Phase C-A)", specification: "0.012 Ω ± 5%", actual: "0.0119 Ω", status: "pass", method: "4-wire Kelvin measurement at 20°C ref", equipmentUsed: "Fluke 87V Digital Multimeter" },
      { name: "Insulation Resistance Test", specification: "> 100 MΩ @ 500V DC", actual: "485 MΩ", status: "pass", method: "1-minute stabilized reading per IEC 60034-1", equipmentUsed: "Megger MIT1025 Megohmmeter" },
      { name: "Hi-Pot Test", specification: "2.5kV AC for 60s, no breakdown", actual: "No breakdown observed, leakage 0.8mA", status: "pass", method: "IEC 60034-1 routine test procedure", equipmentUsed: "Hipotronics 880PL Hi-Pot Tester" },
      { name: "Bearing Free Play - Radial", specification: "0.02-0.05 mm", actual: "0.03 mm", status: "pass", method: "Dial indicator measurement under 50N load", equipmentUsed: "Starrett 25-441J Dial Indicator" },
      { name: "Bearing Free Play - Axial", specification: "0.05-0.12 mm", actual: "0.08 mm", status: "pass", method: "Dial indicator measurement under 100N load", equipmentUsed: "Starrett 25-441J Dial Indicator" },
      { name: "Rotor Balance Grade", specification: "G2.5 or better", actual: "G2.5 (Residual unbalance: 12g·mm)", status: "pass", method: "Two-plane dynamic balance per ISO 1940-1", equipmentUsed: "Schenck CAB 920 Balancing Machine" },
      { name: "Paint Finish Thickness", specification: "60-80 μm", actual: "72 μm (avg of 6 readings)", status: "pass", method: "Non-destructive coating measurement", equipmentUsed: "Elcometer 456 Coating Thickness Gauge" },
    ],
    deviationsWithinTolerance: [
      { parameter: "Stator Core Lamination Stack Height", specification: "380.0 mm ± 0.5 mm", actual: "380.4 mm", tolerance: "Within +0.5 mm limit", notes: "Upper tolerance range, documented for traceability. Manufacturing variance within acceptable limits.", riskAssessment: "Low risk - No impact on performance. Magnetic flux density within design margins." },
      { parameter: "Rotor Shaft Runout", specification: "≤ 0.03 mm TIR", actual: "0.028 mm TIR", tolerance: "Within specification", notes: "Near upper limit at 93% of tolerance. Flagged for monitoring in future batches from same supplier.", riskAssessment: "Low risk - Vibration analysis predicts <0.5mm/s increase at rated speed." },
      { parameter: "AVR Connector Pin Resistance", specification: "≤ 10 mΩ", actual: "8.7 mΩ", tolerance: "Within specification", notes: "Acceptable. Minor oxidation noted on pin 3 during visual inspection, cleaned with isopropyl alcohol and re-tested.", riskAssessment: "Low risk - Post-cleaning value stable. Connector sealed for protection." },
    ],
    deviationsAccepted: [
      { 
        parameter: "Exciter Stator Air Gap", 
        specification: "1.50 mm ± 0.10 mm (1.40-1.60 mm)", 
        actual: "1.63 mm", 
        deviation: "+0.03 mm beyond upper tolerance limit",
        reason: "Engineering analysis (ref: EA-2024-0847-01) confirmed this deviation would result in <0.5% reduction in excitation efficiency, well within operational margins. FEA simulation showed magnetic flux reduction of 0.3%. Component from same batch (SR-2024-0845) tested under full load for 8 hours showed normal voltage regulation (±0.8%) and no thermal anomalies.",
        conditions: "Unit tagged for priority monitoring during first 500 operating hours. Real-time excitation current monitoring to be enabled during commissioning. Customer notified of deviation per quality agreement QA-CENTUM-2023-R4 Section 7.2.",
        riskLevel: "Medium",
        mitigationActions: "1) Enhanced monitoring during commissioning, 2) Excitation current trending for first 500 hours, 3) Thermal imaging during load test, 4) Supplier notified via SCAR-2024-0847 for process review",
        approvedBy: "Chief Quality Engineer (M. Patterson)",
        approvalDate: "June 18, 2024 - 16:30"
      },
    ],
    attachments: [
      { name: "Dimensional Inspection Report", type: "PDF", description: "Detailed dimensional measurements with photos" },
      { name: "Electrical Test Data Sheet", type: "PDF", description: "Raw data from all electrical tests" },
      { name: "Calibration Certificates", type: "PDF", description: "Certificates for all test equipment used" },
      { name: "Deviation Analysis EA-2024-0847-01", type: "PDF", description: "Engineering analysis for air gap deviation" },
      { name: "Thermal Images", type: "JPG", description: "IR images from full load test" },
      { name: "Balance Report", type: "PDF", description: "Dynamic balancing machine output" },
    ],
    signatures: [
      { role: "Inspector", name: "James Thornton (QC-UK-047)", date: "June 18, 2024 - 16:45", signature: "J.Thornton" },
      { role: "Witness", name: "Robert Hayes (QC-UK-012)", date: "June 18, 2024 - 16:50", signature: "R.Hayes" },
      { role: "QC Manager", name: "Margaret Patterson", date: "June 18, 2024 - 17:15", signature: "M.Patterson" },
    ]
  },
  "insp-assembly": {
    documentId: "QC-ASM-2024-0847-002",
    revisionNumber: "Rev 1.1",
    title: "Assembly Inspection Report - CENTUM X15 17L Generator Set",
    component: "CENTUM X15 17L-750KW Generator Set",
    serialNumber: "CTM-17L-2024-0892",
    batchNumber: "ASM-2024-Q3-047",
    stage: "Assembly Quality Control - Final Assembly & Test",
    date: "July 20, 2024",
    startTime: "06:00 AM",
    endTime: "06:30 PM",
    inspector: "QC-MFG-112 (Sarah Chen)",
    inspectorCertification: "ASQ CQE, NETA Level III Certified",
    witnessedBy: "QC-MFG-045 (David Park) - Quality Supervisor",
    location: "CENTUM Assembly Plant, Houston, TX - Test Cell 4",
    referenceStandards: [
      "ISO 8528-1:2018 - Reciprocating internal combustion engine driven alternating current generating sets",
      "NFPA 110:2022 - Standard for Emergency and Standby Power Systems",
      "CENTUM-QS-17L-ASM-R5 - Assembly and Test Specification",
      "IEEE 115-2019 - Test Procedures for Synchronous Machines"
    ],
    testEquipment: [
      { name: "Power Analyzer", model: "Hioki PW6001", serialNumber: "HK-6001-2156", calibrationDate: "May 01, 2024", calibrationDue: "May 01, 2025" },
      { name: "Vibration Analyzer", model: "SKF CMXA 80", serialNumber: "SKF-80-0934", calibrationDate: "Apr 15, 2024", calibrationDue: "Apr 15, 2025" },
      { name: "Sound Level Meter", model: "Bruel & Kjaer 2250", serialNumber: "BK-2250-1847", calibrationDate: "Mar 20, 2024", calibrationDue: "Mar 20, 2025" },
      { name: "Load Bank", model: "Simplex Titan 1000", serialNumber: "SX-1000-0478", calibrationDate: "Jun 01, 2024", calibrationDue: "Jun 01, 2025" },
      { name: "Laser Alignment System", model: "Fixturlaser XA Pro", serialNumber: "FL-XA-2341", calibrationDate: "Feb 28, 2024", calibrationDue: "Feb 28, 2025" },
      { name: "Digital Torque Wrench", model: "Snap-on ATECH3FR250B", serialNumber: "SO-3FR-0892", calibrationDate: "Apr 10, 2024", calibrationDue: "Apr 10, 2025" },
      { name: "Pressure Test Kit", model: "OTC 5606", serialNumber: "OTC-5606-1234", calibrationDate: "May 15, 2024", calibrationDue: "May 15, 2025" },
      { name: "Thermal Imaging Camera", model: "FLIR E96", serialNumber: "FLIR-E96-0567", calibrationDate: "Jun 10, 2024", calibrationDue: "Jun 10, 2025" },
    ],
    environmentalConditions: [
      { parameter: "Ambient Temperature", value: "32°C", acceptableRange: "15-40°C" },
      { parameter: "Relative Humidity", value: "55%", acceptableRange: "30-80%" },
      { parameter: "Barometric Pressure", value: "1008 mbar", acceptableRange: "950-1050 mbar" },
      { parameter: "Test Cell Ventilation", value: "2400 CFM", acceptableRange: ">2000 CFM" },
    ],
    checks: [
      { name: "Engine-Alternator Alignment", specification: "≤ 0.05 mm angular, ≤ 0.10 mm parallel", actual: "0.03 mm angular / 0.07 mm parallel", status: "pass", method: "Laser alignment with 3-point verification", equipmentUsed: "Fixturlaser XA Pro" },
      { name: "Coupling Torque - All Bolts", specification: "145 Nm ± 5%", actual: "143-147 Nm range (all 8 bolts)", status: "pass", method: "Torque verification in star pattern", equipmentUsed: "Snap-on ATECH3FR250B Digital Torque Wrench" },
      { name: "Fuel System Pressure Test", specification: "450 kPa, hold 10 min, no drop", actual: "450 kPa, stable (0 kPa drop)", status: "pass", method: "Pressurize and monitor with digital gauge", equipmentUsed: "OTC 5606 Pressure Test Kit" },
      { name: "Coolant System Pressure Test", specification: "100 kPa, hold 15 min, ≤2 kPa drop", actual: "1.2 kPa drop over 15 min", status: "pass", method: "Pressurize cooling system, monitor decay", equipmentUsed: "OTC 5606 Pressure Test Kit" },
      { name: "Exhaust System Leak Test", specification: "No visible leaks at rated temp", actual: "No leaks detected at 450°C", status: "pass", method: "Visual inspection with smoke test", equipmentUsed: "FLIR E96 Thermal Camera + smoke generator" },
      { name: "Control Panel Function Test", specification: "All indicators and controls operational", actual: "All 24 functions verified operational", status: "pass", method: "Per DSE7320 commissioning checklist", equipmentUsed: "DSE Configuration Suite v7.2" },
      { name: "Emergency Stop Function", specification: "Shutdown in ≤3 seconds", actual: "2.1 seconds (avg of 3 tests)", status: "pass", method: "Timed shutdown from full load", equipmentUsed: "Stopwatch + Power Analyzer" },
      { name: "Battery Charging Circuit", specification: "14.2V ± 0.3V output", actual: "14.3V DC", status: "pass", method: "Measure at battery terminals during charge", equipmentUsed: "Fluke 87V Multimeter" },
      { name: "Vibration Test - No Load", specification: "≤ 4.5 mm/s RMS", actual: "3.8 mm/s RMS", status: "pass", method: "Tri-axial measurement at bearing housings", equipmentUsed: "SKF CMXA 80 Vibration Analyzer" },
      { name: "Noise Level @ 1m", specification: "≤ 98 dB(A)", actual: "96 dB(A) @ 1m, 1.5m height", status: "pass", method: "8-point average per ISO 8528-10", equipmentUsed: "Bruel & Kjaer 2250 Sound Level Meter" },
      { name: "Output Voltage Regulation", specification: "±1% from no load to full load", actual: "±0.8% (480V nominal)", status: "pass", method: "Step load 0-25-50-75-100% and reverse", equipmentUsed: "Hioki PW6001 Power Analyzer" },
      { name: "Frequency Stability", specification: "±0.5% steady state", actual: "±0.3% at all load points", status: "pass", method: "Continuous monitoring during load test", equipmentUsed: "Hioki PW6001 Power Analyzer" },
      { name: "Power Factor Test", specification: "0.8 lagging rated", actual: "750kW @ 0.8 PF achieved", status: "pass", method: "Load bank set to 0.8 PF lagging", equipmentUsed: "Simplex Titan 1000 Load Bank" },
      { name: "Full Load Duration Test", specification: "4 hours at 100% load, stable", actual: "4 hr completed, all parameters stable", status: "pass", method: "Continuous operation with data logging", equipmentUsed: "Load Bank + Power Analyzer + DAQ System" },
    ],
    deviationsWithinTolerance: [
      { parameter: "Alternator Operating Temperature", specification: "≤ 125°C Class F rise", actual: "118°C (winding) after 4hr test", tolerance: "Within limit by 7°C margin", notes: "Slightly higher than typical 110°C, attributed to elevated ambient conditions during test (32°C vs standard 25°C). Temperature corrected to 25°C base: 111°C.", riskAssessment: "Low risk - Class F insulation rated to 155°C. Adequate margin for all operating conditions." },
      { parameter: "Fuel Consumption @ Full Load", specification: "185 L/hr ± 5%", actual: "191 L/hr (103% of nominal)", tolerance: "Within +5% tolerance", notes: "Upper range of acceptable. Fuel injector timing verified within spec (±0.5° from nominal). Likely due to fuel density variation.", riskAssessment: "Low risk - Customer informed of consumption rate for fuel planning. No action required." },
    ],
    deviationsAccepted: [
      { 
        parameter: "Harmonic Distortion (THD)", 
        specification: "≤ 3.0% THD-V per IEEE 519", 
        actual: "3.4% THD-V at 1490 RPM", 
        deviation: "+0.4% beyond specification at specific RPM band",
        reason: "Investigation (ref: NCR-2024-0892-01) traced to minor mechanical resonance between alternator stator and engine block at 1485-1495 RPM frequency band. At steady-state 1500 RPM operation, THD measured 2.8% (within spec). Resonance damped by normal loading. Customer application (hospital backup) operates at steady 1500 RPM only with step-load response time >10 seconds.",
        conditions: "Deviation accepted for this specific customer application (Mercy Hills MC) only. Service Bulletin SB-2024-THD-01 to be issued specifying RPM band to be avoided during manual testing. Enhanced power quality monitoring to be enabled during commissioning. 30-day post-commissioning THD report required.",
        riskLevel: "Medium",
        mitigationActions: "1) Customer training on avoiding 1485-1495 RPM during testing, 2) ATS configured for fast transfer to minimize ramp time, 3) Power quality meter installed for continuous monitoring, 4) Quarterly THD verification for first year",
        approvedBy: "Engineering Director (R. Martinez)",
        approvalDate: "July 20, 2024 - 14:30"
      },
      { 
        parameter: "Vibration at 75% Load Point", 
        specification: "≤ 4.5 mm/s RMS velocity", 
        actual: "4.8 mm/s RMS (560-580 kW range)", 
        deviation: "+0.3 mm/s beyond specification (6.7% over limit)",
        reason: "Root cause analysis (ref: NCR-2024-0892-02) identified slight coupling imbalance (15g residual vs 10g spec). Vibration spike isolated to specific load point (560-580 kW range only). At primary operating points - 100% load for emergency operation and 30-50% load for periodic testing - vibration measured 3.9 mm/s and 3.2 mm/s respectively, well within limits. ISO 10816-1 Class II machinery limit is 7.1 mm/s.",
        conditions: "Coupling re-balanced to 8g residual post-test. Re-test showed 4.2 mm/s at 75% load (still marginally over but improved). Accepted given: 1) Primary use case is full-load emergency backup, 2) Scheduled testing typically at 30-50% load, 3) Absolute value still within ISO machinery limits, 4) Trend monitoring will detect any degradation.",
        riskLevel: "Low",
        mitigationActions: "1) Vibration baseline established for trending, 2) 90-day post-commissioning vibration report required, 3) Annual vibration analysis added to PM schedule, 4) Supplier notified of coupling tolerance issue (SCAR-2024-CPL-03)",
        approvedBy: "Chief Quality Engineer (M. Patterson)",
        approvalDate: "July 21, 2024 - 09:15"
      },
    ],
    attachments: [
      { name: "Complete Test Data Package", type: "PDF", description: "All raw test data with timestamps" },
      { name: "Power Quality Analysis Report", type: "PDF", description: "Detailed THD and harmonic spectrum analysis" },
      { name: "Vibration Analysis Report", type: "PDF", description: "FFT spectra at all load points" },
      { name: "Thermal Survey Report", type: "PDF", description: "IR images at 2hr and 4hr marks" },
      { name: "NCR-2024-0892-01 - THD Investigation", type: "PDF", description: "Non-conformance report for THD deviation" },
      { name: "NCR-2024-0892-02 - Vibration Investigation", type: "PDF", description: "Non-conformance report for vibration deviation" },
      { name: "Test Equipment Calibration Certs", type: "PDF", description: "All calibration certificates" },
    ],
    signatures: [
      { role: "Test Engineer", name: "Sarah Chen (QC-MFG-112)", date: "July 20, 2024 - 18:45", signature: "S.Chen" },
      { role: "Witness", name: "David Park (QC-MFG-045)", date: "July 20, 2024 - 18:50", signature: "D.Park" },
      { role: "QC Manager", name: "Ricardo Martinez", date: "July 21, 2024 - 10:00", signature: "R.Martinez" },
      { role: "Engineering Approval", name: "Margaret Patterson", date: "July 21, 2024 - 10:30", signature: "M.Patterson" },
    ]
  },
  "insp-commission": {
    documentId: "QC-COM-2024-0847-003",
    revisionNumber: "Rev 1.0",
    title: "Site Commissioning Inspection Report",
    component: "CENTUM X15 17L-750KW Generator Set",
    serialNumber: "CTM-17L-2024-0892",
    batchNumber: "N/A - Site Installation",
    stage: "Site Commissioning & Acceptance Testing",
    date: "August 10, 2024",
    startTime: "07:00 AM",
    endTime: "05:30 PM",
    inspector: "FSE-MW-023 (Michael Torres)",
    inspectorCertification: "EGSA Certified Technician, NFPA 110 Qualified",
    witnessedBy: "James Morrison - Facility Director, Mercy Hills Medical Center",
    location: "Mercy Hills Medical Center, 500 E Market St, Iowa City, IA 52245 - Generator Room B12",
    referenceStandards: [
      "NFPA 110:2022 - Standard for Emergency and Standby Power Systems",
      "NFPA 99:2021 - Health Care Facilities Code",
      "Joint Commission EC.02.05.07 - Emergency Power Testing",
      "CENTUM-COM-17L-R4 - Commissioning Procedure",
      "ASCO 7000 Series Installation Manual"
    ],
    testEquipment: [
      { name: "Power Analyzer", model: "Fluke 435-II", serialNumber: "FL-435-3892", calibrationDate: "Jun 15, 2024", calibrationDue: "Jun 15, 2025" },
      { name: "Portable Load Bank", model: "Asco Avtron 6600", serialNumber: "AA-6600-0234", calibrationDate: "Jul 01, 2024", calibrationDue: "Jul 01, 2025" },
      { name: "Combustion Analyzer", model: "Testo 350", serialNumber: "TS-350-1567", calibrationDate: "May 20, 2024", calibrationDue: "May 20, 2025" },
      { name: "Anemometer", model: "TSI VelociCalc 9565", serialNumber: "TSI-9565-0892", calibrationDate: "Apr 25, 2024", calibrationDue: "Apr 25, 2025" },
      { name: "Digital Torque Wrench", model: "CDI 2503LDFN", serialNumber: "CDI-2503-4521", calibrationDate: "Jun 01, 2024", calibrationDue: "Jun 01, 2025" },
      { name: "Refractometer", model: "Atago PAL-91S", serialNumber: "AT-91S-0234", calibrationDate: "Jul 05, 2024", calibrationDue: "Jul 05, 2025" },
      { name: "Infrared Thermometer", model: "Fluke 62 MAX+", serialNumber: "FL-62M-2341", calibrationDate: "Jun 20, 2024", calibrationDue: "Jun 20, 2025" },
    ],
    environmentalConditions: [
      { parameter: "Outdoor Ambient Temperature", value: "31°C (88°F)", acceptableRange: "-20 to 45°C" },
      { parameter: "Generator Room Temperature", value: "38°C", acceptableRange: "≤40°C per design" },
      { parameter: "Relative Humidity", value: "62%", acceptableRange: "30-80%" },
      { parameter: "Altitude", value: "204m (670 ft)", acceptableRange: "≤1000m for full rating" },
    ],
    checks: [
      { name: "Foundation Bolt Torque", specification: "Per drawing CENTUM-FND-750 (M20: 350 Nm)", actual: "All 8 bolts verified 345-355 Nm", status: "pass", method: "Torque verification with calibrated wrench", equipmentUsed: "CDI 2503LDFN Digital Torque Wrench" },
      { name: "Vibration Isolator Deflection", specification: "15-20 mm static deflection", actual: "17 mm (avg of 4 isolators)", status: "pass", method: "Steel rule measurement at each isolator", equipmentUsed: "Calibrated steel rule" },
      { name: "Exhaust Back Pressure", specification: "≤ 6.7 kPa (27 in. WC)", actual: "5.2 kPa (21 in. WC)", status: "pass", method: "Manometer reading at turbo outlet", equipmentUsed: "Dwyer 475 Manometer" },
      { name: "Combustion Air Flow", specification: "≥ 1200 CFM per engine spec", actual: "1450 CFM measured at louver", status: "pass", method: "Traverse measurement per ASHRAE 111", equipmentUsed: "TSI VelociCalc 9565 Anemometer" },
      { name: "Fuel Supply Pressure", specification: "35-55 kPa at genset inlet", actual: "42 kPa steady state", status: "pass", method: "Digital gauge at fuel inlet", equipmentUsed: "Ashcroft digital pressure gauge" },
      { name: "Coolant Level & Mix", specification: "50/50 glycol/water, full level", actual: "52% glycol, level at HOT mark", status: "pass", method: "Refractometer freeze point check", equipmentUsed: "Atago PAL-91S Refractometer" },
      { name: "Battery State of Charge", specification: "≥ 12.6V open circuit", actual: "12.8V OCV, CCA 1850A (spec 1800A)", status: "pass", method: "OCV and load test", equipmentUsed: "Midtronics MDX-655P Battery Tester" },
      { name: "ATS Transfer Test", specification: "Transfer in ≤10 seconds", actual: "8.3 seconds normal-to-emergency", status: "pass", method: "Timed transfer with utility disconnect", equipmentUsed: "Stopwatch + Fluke 435-II logging" },
      { name: "Load Bank Test - 25%", specification: "Voltage ±5%, Freq ±0.5%", actual: "481V, 60.1 Hz - Stable", status: "pass", method: "15-minute stabilized operation", equipmentUsed: "Asco Avtron 6600 Load Bank" },
      { name: "Load Bank Test - 50%", specification: "Voltage ±5%, Freq ±0.5%", actual: "479V, 60.0 Hz - Stable", status: "pass", method: "15-minute stabilized operation", equipmentUsed: "Asco Avtron 6600 Load Bank" },
      { name: "Load Bank Test - 75%", specification: "Voltage ±5%, Freq ±0.5%", actual: "478V, 59.9 Hz - Stable", status: "pass", method: "15-minute stabilized operation", equipmentUsed: "Asco Avtron 6600 Load Bank" },
      { name: "Load Bank Test - 100%", specification: "Voltage ±5%, Freq ±0.5%, 2 hr duration", actual: "477V, 59.9 Hz - 2hr stable", status: "pass", method: "2-hour continuous operation with data logging", equipmentUsed: "Asco Avtron 6600 + Fluke 435-II" },
      { name: "Utility Fail Simulation", specification: "Auto-start and transfer in ≤10s", actual: "Start 4.2s, transfer 8.3s total", status: "pass", method: "Open utility breaker, verify sequence", equipmentUsed: "Stopwatch + sequence of events log" },
      { name: "Utility Restore Simulation", specification: "Cool-down 5 min, retransfer", actual: "5 min cool-down, retransfer 3.1s", status: "pass", method: "Restore utility, verify sequence", equipmentUsed: "Stopwatch + sequence of events log" },
      { name: "Remote Monitoring Connection", specification: "All BACnet points verified", actual: "47/47 points communicating to BMS", status: "pass", method: "Point-by-point verification with facility", equipmentUsed: "Facility BMS workstation" },
      { name: "Operator Training", specification: "Site personnel trained per NFPA 110", actual: "3 staff trained, signed off", status: "pass", method: "Hands-on training with documentation", equipmentUsed: "Training checklist CENTUM-TRN-750" },
    ],
    deviationsWithinTolerance: [
      { parameter: "Generator Room Temperature", specification: "≤ 40°C per mechanical design", actual: "38°C during 100% load test", tolerance: "Within 2°C of design limit", notes: "Summer conditions with 31°C outdoor ambient. Room HVAC cycling on high demand. Temperature stabilized after HVAC caught up. Recommended: Monitor room temp during peak summer testing.", riskAssessment: "Low risk - Engine high-temp alarm set at 105°C coolant. Adequate margin. Facility to monitor during summer testing periods." },
      { parameter: "Fuel Tank Level Sensor Accuracy", specification: "±2% full scale", actual: "±1.8% verified against dipstick", tolerance: "Within specification", notes: "Minor calibration drift noted from factory setting. Adjusted span potentiometer on-site to achieve ±1.2% accuracy. Re-verified satisfactory.", riskAssessment: "Low risk - Sensor accuracy well within requirements. Annual calibration added to PM schedule." },
    ],
    deviationsAccepted: [
      { 
        parameter: "Generator Room Ventilation Rate", 
        specification: "NFPA 110 requires 0.5 CFM/kW minimum = 375 CFM for 750kW unit", 
        actual: "352 CFM measured at intake louver", 
        deviation: "-23 CFM below minimum (6.1% shortfall)",
        reason: "Building HVAC system constraints prevent immediate modification. Engineering analysis (ref: EA-2024-MH-001) identified compensating factors: (1) Generator room volume is 2,400 cu.ft. vs. 1,700 cu.ft. minimum - 40% larger provides additional thermal mass and air volume, (2) Generator operates <100 hours/year (monthly testing + rare emergency use), limiting heat accumulation, (3) 10ft x 12ft roll-up door on north wall provides >2,000 CFM when opened during any extended operation.",
        conditions: "Approved with the following conditions: 1) HVAC upgrade project approved and scheduled for Q1 2025 during planned facility renovation - will increase to 450 CFM, 2) Temporary Operating Procedure TOP-2024-MH-GEN-01 issued requiring roll-up door to be opened during any planned testing exceeding 30 minutes duration, 3) Room temperature monitoring enabled on BMS with alarm at 42°C, 4) Annual re-inspection of ventilation required until permanent fix completed, 5) Joint Commission notified per EC.02.05.07 requirements.",
        riskLevel: "Medium",
        mitigationActions: "1) Operating procedure for door opening during tests, 2) BMS high-temp alarm configured, 3) Quarterly room temp trending, 4) HVAC upgrade in capital plan, 5) Documented in facility AHJ file",
        approvedBy: "Regional Service Manager (K. Williams) & Facility Director (J. Morrison) & AHJ (Iowa City Fire Marshal)",
        approvalDate: "August 10, 2024 - 16:00"
      },
    ],
    attachments: [
      { name: "Complete Commissioning Checklist", type: "PDF", description: "36-page detailed checklist with all readings" },
      { name: "Load Test Data Log", type: "PDF", description: "2-hour power quality data at 1-second intervals" },
      { name: "ATS Sequence of Events Log", type: "PDF", description: "Timestamped transfer test records" },
      { name: "BMS Point Verification List", type: "XLSX", description: "All 47 BACnet points with verification status" },
      { name: "Training Sign-Off Sheets", type: "PDF", description: "Operator training completion records" },
      { name: "EA-2024-MH-001 Ventilation Analysis", type: "PDF", description: "Engineering analysis for ventilation deviation" },
      { name: "TOP-2024-MH-GEN-01", type: "PDF", description: "Temporary operating procedure for ventilation" },
      { name: "Photos - Installation", type: "ZIP", description: "42 installation and commissioning photos" },
    ],
    signatures: [
      { role: "Commissioning Engineer", name: "Michael Torres (FSE-MW-023)", date: "August 10, 2024 - 17:00", signature: "M.Torres" },
      { role: "Customer Witness", name: "James Morrison (Facility Director)", date: "August 10, 2024 - 17:10", signature: "J.Morrison" },
      { role: "Regional Service Manager", name: "Kevin Williams", date: "August 10, 2024 - 17:30", signature: "K.Williams" },
      { role: "Authority Having Jurisdiction", name: "Fire Marshal R. Thompson", date: "August 10, 2024 - 17:45", signature: "R.Thompson" },
    ]
  }
}

const bomData = [
  { component: "Engine", partNumber: "ENG-17L-750", supplier: "Cummins", status: "normal" },
  { component: "Alternator", partNumber: "ALT-SR-750", supplier: "Stamford", status: "flagged" },
  { component: "Voltage Regulator", partNumber: "VR-SX440", supplier: "Stamford", status: "normal" },
  { component: "Control Panel", partNumber: "CP-DSE7320", supplier: "Deep Sea Electronics", status: "normal" },
  { component: "Radiator", partNumber: "RAD-750-HD", supplier: "Modine", status: "normal" },
  { component: "Fuel System", partNumber: "FS-750-EFI", supplier: "Bosch", status: "normal" },
  { component: "Exhaust System", partNumber: "EX-750-SS", supplier: "Donaldson", status: "normal" },
  { component: "Base Frame", partNumber: "BF-17L-STD", supplier: "CENTUM", status: "normal" },
  { component: "Vibration Isolators", partNumber: "VI-750-4P", supplier: "LORD Corp", status: "normal" },
  { component: "Battery System", partNumber: "BAT-12V-200", supplier: "Odyssey", status: "normal" },
  { component: "Transfer Switch", partNumber: "TS-ATS-400A", supplier: "ASCO", status: "normal" },
  { component: "Enclosure", partNumber: "ENC-WP-750", supplier: "CENTUM", status: "normal" },
]

// More distinct color palette for each node type
const nodeColors: Record<Node["type"], { bg: string; border: string; text: string; fill: string; stroke: string; iconColor: string }> = {
  product: { 
    bg: "bg-blue-500/20", 
    border: "border-blue-500/50", 
    text: "text-blue-400", 
    fill: "#3b82f6", 
    stroke: "#60a5fa",
    iconColor: "#ffffff"
  },
  component: { 
    bg: "bg-amber-500/20", 
    border: "border-amber-500/50", 
    text: "text-amber-400", 
    fill: "#f59e0b", 
    stroke: "#fbbf24",
    iconColor: "#000000"
  },
  facility: { 
    bg: "bg-emerald-500/20", 
    border: "border-emerald-500/50", 
    text: "text-emerald-400", 
    fill: "#10b981", 
    stroke: "#34d399",
    iconColor: "#ffffff"
  },
  supplier: { 
    bg: "bg-violet-500/20", 
    border: "border-violet-500/50", 
    text: "text-violet-400", 
    fill: "#8b5cf6", 
    stroke: "#a78bfa",
    iconColor: "#ffffff"
  },
  batch: { 
    bg: "bg-rose-500/20", 
    border: "border-rose-500/50", 
    text: "text-rose-400", 
    fill: "#f43f5e", 
    stroke: "#fb7185",
    iconColor: "#ffffff"
  },
  customer: { 
    bg: "bg-cyan-500/20", 
    border: "border-cyan-500/50", 
    text: "text-cyan-400", 
    fill: "#06b6d4", 
    stroke: "#22d3ee",
    iconColor: "#000000"
  },
  site: { 
    bg: "bg-teal-500/20", 
    border: "border-teal-500/50", 
    text: "text-teal-400", 
    fill: "#14b8a6", 
    stroke: "#2dd4bf",
    iconColor: "#000000"
  },
  warranty: { 
    bg: "bg-indigo-500/20", 
    border: "border-indigo-500/50", 
    text: "text-indigo-400", 
    fill: "#6366f1", 
    stroke: "#818cf8",
    iconColor: "#ffffff"
  },
  inspection: { 
    bg: "bg-orange-500/20", 
    border: "border-orange-500/50", 
    text: "text-orange-400", 
    fill: "#f97316", 
    stroke: "#fb923c",
    iconColor: "#000000"
  },
  service: { 
    bg: "bg-pink-500/20", 
    border: "border-pink-500/50", 
    text: "text-pink-400", 
    fill: "#ec4899", 
    stroke: "#f472b6",
    iconColor: "#ffffff"
  },
}

// Icon mapping for each node type
const nodeIcons: Record<Node["type"], typeof Box> = {
  product: Box,
  component: Cog,
  facility: Building2,
  supplier: Truck,
  batch: Package,
  customer: Users,
  site: MapPin,
  warranty: ShieldCheck,
  inspection: FileText,
  service: Wrench,
}

export function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showBOM, setShowBOM] = useState(false)
  const [showInspection, setShowInspection] = useState(false)
  const [selectedInspection, setSelectedInspection] = useState<string | null>(null)

  const handleViewInspection = (nodeId: string) => {
    setSelectedInspection(nodeId)
    setShowInspection(true)
  }

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
  }, [])

  const handleConnectionClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      setSelectedNode(node)
    }
  }, [])

  // Get only the node types that are actually used in the graph
  const usedNodeTypes = [...new Set(nodes.map(n => n.type))]

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="grid grid-cols-5 gap-4">
          {/* Graph Area */}
          <div className="col-span-3">
            <div className="relative bg-secondary/30 rounded-lg border border-border h-[380px] overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 600 400">
                <defs>
                  {/* Define rounded rectangle clip paths for each node */}
                  {nodes.map((node) => (
                    <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
                      <rect
                        x={-24}
                        y={-24}
                        width={48}
                        height={48}
                        rx={8}
                        ry={8}
                      />
                    </clipPath>
                  ))}
                </defs>

                {/* Connections */}
                {nodes.map((node) =>
                  node.connections.map((connId) => {
                    const targetNode = nodes.find((n) => n.id === connId)
                    if (!targetNode || node.id > connId) return null
                    
                    const isHighlighted = 
                      selectedNode?.id === node.id || 
                      selectedNode?.id === connId ||
                      !selectedNode

                    return (
                      <line
                        key={`${node.id}-${connId}`}
                        x1={node.x}
                        y1={node.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="currentColor"
                        strokeWidth={isHighlighted ? 2 : 1}
                        className={cn(
                          "transition-opacity",
                          isHighlighted ? "text-muted-foreground/40" : "text-border opacity-20"
                        )}
                      />
                    )
                  })
                )}

                {/* Nodes as rounded squares with icons */}
                {nodes.map((node) => {
                  const colors = nodeColors[node.type]
                  const IconComponent = nodeIcons[node.type]
                  const isSelected = selectedNode?.id === node.id
                  const isConnected = selectedNode?.connections.includes(node.id)
                  const isFaded = selectedNode && !isSelected && !isConnected
                  const size = isSelected ? 28 : 24
                  const outerSize = isSelected ? 32 : 28

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer"
                      style={{ opacity: isFaded ? 0.3 : 1 }}
                    >
                      {/* Outer border/glow */}
                      <rect
                        x={-outerSize}
                        y={-outerSize}
                        width={outerSize * 2}
                        height={outerSize * 2}
                        rx={10}
                        ry={10}
                        fill="var(--card)"
                        stroke={colors.stroke}
                        strokeWidth={2}
                        className="transition-all"
                      />
                      {/* Inner colored fill */}
                      <rect
                        x={-size}
                        y={-size}
                        width={size * 2}
                        height={size * 2}
                        rx={8}
                        ry={8}
                        fill={colors.fill}
                        className="transition-all"
                      />
                      {/* Icon */}
                      <foreignObject
                        x={-12}
                        y={-12}
                        width={24}
                        height={24}
                        className="pointer-events-none"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <IconComponent 
                            size={16} 
                            color={colors.iconColor}
                            strokeWidth={2}
                          />
                        </div>
                      </foreignObject>
                      {/* Label below node */}
                      <text
                        textAnchor="middle"
                        y={outerSize + 14}
                        className="text-[9px] font-medium fill-foreground pointer-events-none"
                      >
                        {node.label.length > 14 
                          ? node.label.substring(0, 12) + "..."
                          : node.label
                        }
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {usedNodeTypes.map((type) => {
                const colors = nodeColors[type]
                const IconComponent = nodeIcons[type]
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: colors.fill }}
                    >
                      <IconComponent size={12} color={colors.iconColor} strokeWidth={2} />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{type}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Details Panel */}
          <div className="col-span-2">
            <div className="bg-secondary/30 rounded-lg border border-border h-[380px] p-3">
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: nodeColors[selectedNode.type].fill }}
                      >
                        {(() => {
                          const IconComponent = nodeIcons[selectedNode.type]
                          return <IconComponent size={14} color={nodeColors[selectedNode.type].iconColor} strokeWidth={2} />
                        })()}
                      </div>
                      <h4 className="text-sm font-medium">{selectedNode.label}</h4>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        nodeColors[selectedNode.type].bg,
                        nodeColors[selectedNode.type].text,
                        nodeColors[selectedNode.type].border
                      )}
                    >
                      {selectedNode.type}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Properties</p>
                    <div className="space-y-1.5">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <span className={cn(
                            "font-medium",
                            value === "Flagged" && "text-rose-400"
                          )}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Connected Nodes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.connections.map((connId) => {
                        const connNode = nodes.find((n) => n.id === connId)
                        if (!connNode) return null
                        const connColors = nodeColors[connNode.type]
                        const ConnIcon = nodeIcons[connNode.type]
                        return (
                          <Badge
                            key={connId}
                            variant="outline"
                            className={cn(
                              "text-[10px] cursor-pointer hover:bg-secondary gap-1",
                              connColors.border
                            )}
                            onClick={() => handleConnectionClick(connId)}
                          >
                            <ConnIcon size={10} className={connColors.text} />
                            {connNode.label}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  {selectedNode.id === "centum-x15" && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs p-0 h-auto text-primary"
                      onClick={() => setShowBOM(true)}
                    >
                      View Bill of Materials (BOM)
                    </Button>
                  )}

                  {selectedNode.type === "inspection" && inspectionRecords[selectedNode.id] && (
                    <Button
                      size="sm"
                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => handleViewInspection(selectedNode.id)}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      View Inspection Records
                    </Button>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Click a node to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* BOM Dialog */}
      <Dialog open={showBOM} onOpenChange={setShowBOM}>
        <DialogContent className="max-w-[85vw] w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Bill of Materials - CENTUM X15 17L</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Component</TableHead>
                  <TableHead className="text-xs">Part Number</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Find the supplier of the flagged component
                  const flaggedSupplier = bomData.find(item => item.status === "flagged")?.supplier
                  
                  return bomData.map((item, index) => {
                    const isFlagged = item.status === "flagged"
                    const isSupplierMatch = !isFlagged && item.supplier === flaggedSupplier
                    
                    return (
                      <TableRow
                        key={index}
                        className={isFlagged ? "bg-rose-500/10" : ""}
                      >
                        <TableCell className="text-xs font-medium">{item.component}</TableCell>
                        <TableCell className="text-xs font-mono">{item.partNumber}</TableCell>
                        <TableCell 
                          className={cn(
                            "text-xs",
                            isSupplierMatch && "bg-violet-500/20 text-violet-400 font-medium"
                          )}
                        >
                          {item.supplier}
                          {isSupplierMatch && (
                            <span className="ml-1.5 text-[10px] text-violet-400/70">(same supplier)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isFlagged ? (
                            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">
                              Flagged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                })()}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Inspection Records Dialog */}
      <Dialog open={showInspection} onOpenChange={setShowInspection}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
          {selectedInspection && inspectionRecords[selectedInspection] && (() => {
            const record = inspectionRecords[selectedInspection]
            return (
              <>
                <DialogHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-lg">{record.title}</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">Document ID: {record.documentId}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-6 pb-4">
                    {/* Document Header Info */}
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Document ID:</span>
                            <p className="font-mono font-medium">{record.documentId}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Revision:</span>
                            <p className="font-medium">{record.revisionNumber}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Inspection Stage:</span>
                            <p className="font-medium">{record.stage}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Component:</span>
                            <p className="font-medium">{record.component}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Serial Number:</span>
                            <p className="font-mono font-medium">{record.serialNumber}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Batch Number:</span>
                            <p className="font-mono font-medium">{record.batchNumber}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">{record.date}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Time:</span>
                            <p className="font-medium">{record.startTime} - {record.endTime}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Overall Result:</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs ml-1">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Passed
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Inspector:</span>
                            <p className="font-medium">{record.inspector}</p>
                            <p className="text-xs text-muted-foreground">{record.inspectorCertification}</p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Witnessed By:</span>
                            <p className="font-medium">{record.witnessedBy}</p>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Location:</span>
                          <p className="font-medium">{record.location}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Reference Standards */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Reference Standards & Procedures</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {record.referenceStandards.map((std, index) => (
                          <div key={index} className="text-xs p-2 bg-secondary/30 rounded border border-border">
                            {std}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Test Equipment */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Cog className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-semibold">Test Equipment Used</h3>
                        <Badge variant="outline" className="text-xs">{record.testEquipment.length} instruments</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Equipment</TableHead>
                            <TableHead className="text-xs">Model</TableHead>
                            <TableHead className="text-xs">Serial Number</TableHead>
                            <TableHead className="text-xs">Calibration Date</TableHead>
                            <TableHead className="text-xs">Calibration Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {record.testEquipment.map((equip, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs font-medium">{equip.name}</TableCell>
                              <TableCell className="text-xs">{equip.model}</TableCell>
                              <TableCell className="text-xs font-mono">{equip.serialNumber}</TableCell>
                              <TableCell className="text-xs">{equip.calibrationDate}</TableCell>
                              <TableCell className="text-xs">{equip.calibrationDue}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Separator />

                    {/* Environmental Conditions */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Environmental Conditions During Test</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {record.environmentalConditions.map((cond, index) => (
                          <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border">
                            <p className="text-xs text-muted-foreground">{cond.parameter}</p>
                            <p className="text-sm font-medium">{cond.value}</p>
                            <p className="text-[10px] text-muted-foreground">Range: {cond.acceptableRange}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Quality Control Checks */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-semibold">Quality Control Checks Performed</h3>
                        <Badge variant="outline" className="text-xs">{record.checks.length} checks</Badge>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs ml-2">
                          {record.checks.filter(c => c.status === "pass").length} Passed
                        </Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs min-w-[180px]">Check Item</TableHead>
                              <TableHead className="text-xs min-w-[200px]">Specification</TableHead>
                              <TableHead className="text-xs min-w-[180px]">Actual Result</TableHead>
                              <TableHead className="text-xs min-w-[200px]">Test Method</TableHead>
                              <TableHead className="text-xs min-w-[180px]">Equipment Used</TableHead>
                              <TableHead className="text-xs w-[60px] text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {record.checks.map((check, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs font-medium">{check.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{check.specification}</TableCell>
                                <TableCell className="text-xs">{check.actual}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{check.method}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{check.equipmentUsed}</TableCell>
                                <TableCell className="text-center">
                                  {check.status === "pass" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Separator />

                    {/* Deviations Within Tolerance */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <h3 className="text-sm font-semibold">Deviations Within Tolerance</h3>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                          {record.deviationsWithinTolerance.length} items documented
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The following parameters showed minor deviations but remained within acceptable tolerance limits. Documented for traceability and trend analysis.
                      </p>
                      <div className="space-y-3">
                        {record.deviationsWithinTolerance.map((dev, index) => (
                          <div key={index} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-amber-400">{dev.parameter}</h4>
                              </div>
                              <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                {dev.tolerance}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Specification:</span>
                                <p className="font-medium mt-0.5">{dev.specification}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Actual Measured:</span>
                                <p className="font-medium mt-0.5">{dev.actual}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Notes:</span>
                                <p className="mt-0.5">{dev.notes}</p>
                              </div>
                            </div>
                            <div className="text-xs pt-2 border-t border-amber-500/20">
                              <span className="text-muted-foreground font-medium">Risk Assessment:</span>
                              <p className="mt-1">{dev.riskAssessment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Deviations Outside Tolerance - Accepted */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <h3 className="text-sm font-semibold">Deviations Outside Tolerance - Accepted with Concession</h3>
                        <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30">
                          {record.deviationsAccepted.length} items requiring approval
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The following parameters exceeded specification tolerance limits but were accepted based on engineering analysis, risk assessment, and specific operational conditions. Each deviation requires formal approval and documented mitigation actions.
                      </p>
                      <div className="space-y-4">
                        {record.deviationsAccepted.map((dev, index) => (
                          <div key={index} className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-rose-400">{dev.parameter}</h4>
                                <p className="text-xs text-muted-foreground mt-1">Deviation Magnitude: {dev.deviation}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={cn(
                                  "text-[10px]",
                                  dev.riskLevel === "Low" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                                  dev.riskLevel === "Medium" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                  dev.riskLevel === "High" && "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                )}>
                                  Risk: {dev.riskLevel}
                                </Badge>
                                <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30">
                                  Accepted with Conditions
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Specification Requirement:</span>
                                <p className="font-medium mt-0.5">{dev.specification}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Actual Measured Value:</span>
                                <p className="font-medium mt-0.5">{dev.actual}</p>
                              </div>
                            </div>
                            <div className="text-xs p-3 bg-secondary/30 rounded border border-border">
                              <span className="text-muted-foreground font-medium">Engineering Justification for Acceptance:</span>
                              <p className="mt-1 text-foreground leading-relaxed">{dev.reason}</p>
                            </div>
                            <div className="text-xs p-3 bg-secondary/30 rounded border border-border">
                              <span className="text-muted-foreground font-medium">Conditions of Acceptance & Monitoring Requirements:</span>
                              <p className="mt-1 text-foreground leading-relaxed">{dev.conditions}</p>
                            </div>
                            <div className="text-xs p-3 bg-secondary/30 rounded border border-border">
                              <span className="text-muted-foreground font-medium">Mitigation Actions:</span>
                              <p className="mt-1 text-foreground leading-relaxed">{dev.mitigationActions}</p>
                            </div>
                            <div className="text-xs pt-3 border-t border-rose-500/20 flex justify-between items-center">
                              <div>
                                <span className="text-muted-foreground">Approved By:</span>
                                <span className="ml-2 font-medium">{dev.approvedBy}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Approval Date:</span>
                                <span className="ml-2 font-medium">{dev.approvalDate}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attachments */}
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-semibold">Attachments & Supporting Documents</h3>
                        <Badge variant="outline" className="text-xs">{record.attachments.length} files</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {record.attachments.map((att, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{att.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{att.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">{att.type}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Digital Signatures */}
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Digital Signatures & Approvals</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {record.signatures.map((sig, index) => (
                          <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-[10px]">{sig.role}</Badge>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-sm font-medium">{sig.name}</p>
                            <p className="text-xs text-muted-foreground">{sig.date}</p>
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs font-mono italic text-muted-foreground">Digitally signed: {sig.signature}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Footer */}
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border mt-6">
                      <div className="text-center space-y-2">
                        <p className="text-xs font-medium">OFFICIAL QUALITY CONTROL RECORD</p>
                        <p className="text-[10px] text-muted-foreground">
                          This document is controlled under ISO 9001:2015 QMS. Any modifications require formal revision request and re-approval through the Document Control system.
                        </p>
                        <Separator className="my-2" />
                        <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                          <span>Document ID: {record.documentId}</span>
                          <span>|</span>
                          <span>{record.revisionNumber}</span>
                          <span>|</span>
                          <span>Generated: {new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          CFI Knowledge Fabric Portal - Quality Management System
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
