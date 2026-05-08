export interface AIResponse {
  pattern: RegExp
  response: string
  type: "text" | "table" | "timeline"
  data?: unknown
  sources?: string[]
}

export const aiResponses: AIResponse[] = [
  {
    pattern: /supplier.*alternator|alternator.*supplier|who supplied/i,
    response: "The alternator in CENTUM unit SN-C17L-0094 was supplied by **Stamford (Cummins Generator Technologies)**.",
    type: "table",
    data: {
      headers: ["Field", "Value"],
      rows: [
        ["Supplier", "Stamford (Cummins Generator Technologies)"],
        ["Country", "United Kingdom"],
        ["Accreditation", "ISO 9001:2015, ISO 14001:2015"],
        ["AVL Status", "Approved - Tier 1"],
        ["Component", "S-Range Alternator Model S4L1S-D"],
        ["Lot Number", "STA-2023-B4"],
        ["Manufacturing Date", "2023-06-15"]
      ]
    },
    sources: ["Supplier Master Data", "Approved Vendor List", "Component Registry"]
  },
  {
    pattern: /lot.*STA-2023-B4|which lot/i,
    response: "The Stamford alternator in unit SN-C17L-0094 comes from **lot STA-2023-B4**.",
    type: "table",
    data: {
      headers: ["Field", "Value"],
      rows: [
        ["Lot Number", "STA-2023-B4"],
        ["Manufacturing Date", "2023-06-15"],
        ["Quantity in Lot", "48 units"],
        ["QC Release Status", "Released with deviation"],
        ["Deviation Reference", "DEV-2023-0412"],
        ["Deviation Description", "Minor tolerance variance on voltage regulator mounting points"]
      ]
    },
    sources: ["Lot Tracking System", "QC Release Records"]
  },
  {
    pattern: /commission.*SN-C17L-0094|when.*commissioned|where.*commissioned/i,
    response: "CENTUM unit SN-C17L-0094 was commissioned at **Mercy Hills Medical Center** on **2023-09-15**.",
    type: "table",
    data: {
      headers: ["Field", "Value"],
      rows: [
        ["Commission Date", "2023-09-15"],
        ["Commissioning Engineer", "Robert Chen"],
        ["Customer", "Mercy Hills Medical Center"],
        ["Site Address", "1200 Healthcare Blvd, Des Moines, IA 50309"],
        ["Acceptance Sign-off", "Completed"],
        ["Load Bank Test Result", "Pass - 98.2% efficiency at rated load"],
        ["Warranty Start Date", "2023-09-15"]
      ]
    },
    sources: ["Commission Records", "Customer Site Registry", "Acceptance Certificates"]
  },
  {
    pattern: /service history|service events|all service/i,
    response: "Here is the complete service history for unit SN-C17L-0094:",
    type: "timeline",
    data: {
      events: [
        {
          date: "2024-02-15",
          type: "Scheduled Maintenance",
          technician: "John Martinez",
          findings: "All parameters within spec. Oil and filters replaced.",
          partsReplaced: ["Oil filter", "Air filter", "Fuel filter"]
        },
        {
          date: "2023-12-10",
          type: "Emergency Call",
          technician: "Sarah Chen",
          findings: "False alarm - transfer switch sensor fault. Sensor recalibrated.",
          partsReplaced: []
        },
        {
          date: "2023-11-01",
          type: "Scheduled Maintenance",
          technician: "Mike Thompson",
          findings: "Standard 500-hour service completed. Battery terminals cleaned.",
          partsReplaced: ["Oil filter", "Coolant additive"]
        },
        {
          date: "2023-09-15",
          type: "Initial Commissioning",
          technician: "Robert Chen",
          findings: "Unit commissioned successfully. All acceptance tests passed.",
          partsReplaced: []
        }
      ]
    },
    sources: ["Service Work Orders", "Technician Reports", "Parts Consumption Log"]
  },
  {
    pattern: /warranty.*SN-C17L-0094|warranty status|still under warranty/i,
    response: "Yes, unit SN-C17L-0094 is currently **under warranty**.",
    type: "table",
    data: {
      headers: ["Field", "Value"],
      rows: [
        ["Coverage Type", "Full Parts & Labor"],
        ["Start Date", "2023-09-15"],
        ["Expiry Date", "2026-09-15"],
        ["Remaining Coverage", "2 years, 6 months"],
        ["Extended Warranty", "Not purchased"],
        ["Last Claim", "None"]
      ]
    },
    sources: ["Warranty Registry", "Contract Management System"]
  },
  {
    pattern: /cohort risk|customers.*lot.*STA-2023-B4|where else.*lot|where else.*installed/i,
    response: "Based on lot tracking, **7 customers** have received units containing alternators from lot STA-2023-B4:",
    type: "table",
    data: {
      headers: ["Customer", "Unit Serial", "Location", "Operational Status", "Priority"],
      rows: [
        ["Mercy Hills Medical Center", "SN-C17L-0094", "Des Moines, IA", "Active - Fault Detected", "Critical"],
        ["Iowa Heart Hospital", "SN-C17L-0097", "Des Moines, IA", "Active", "High"],
        ["Cedar Rapids Regional", "SN-C17L-0101", "Cedar Rapids, IA", "Active", "High"],
        ["Dubuque Medical Center", "SN-C17L-0103", "Dubuque, IA", "Active", "Medium"],
        ["Sioux City Healthcare", "SN-C17L-0106", "Sioux City, IA", "Active", "Medium"],
        ["Waterloo General Hospital", "SN-C17L-0109", "Waterloo, IA", "Active", "Medium"],
        ["Iowa City University Hospital", "SN-C17L-0111", "Iowa City, IA", "Active", "Medium"]
      ]
    },
    sources: ["Lot Tracking System", "Customer Installation Registry", "Risk Assessment Engine"]
  },
  {
    pattern: /quality inspection|inspection.*lot|outgoing inspection/i,
    response: "Here is the complete quality inspection chain for lot STA-2023-B4:",
    type: "timeline",
    data: {
      events: [
        {
          date: "2023-06-15",
          stage: "Supplier Outgoing QC",
          result: "Pass with Deviation",
          inspector: "James Wilson (Stamford)",
          details: "Dimensional check passed. Electrical test passed. Minor deviation DEV-2023-0412 raised for voltage regulator mounting tolerance."
        },
        {
          date: "2023-07-02",
          stage: "Goods Reception",
          result: "Conditionally Accepted",
          inspector: "Maria Garcia",
          details: "GRN-2023-4521 issued. Incoming inspection checklist complete. Deviation acknowledged and concession granted."
        },
        {
          date: "2023-07-05",
          stage: "Warehouse Storage",
          result: "Compliant",
          inspector: "Automated System",
          details: "Stored at Bay C-14. Temperature: 18-22°C. Humidity: 45-55%. No violations during 8-week storage."
        },
        {
          date: "2023-08-20",
          stage: "Assembly QC",
          result: "Pass",
          inspector: "Tom Anderson",
          details: "Assembly WO-2023-8891. Torque verification passed. Electrical continuity confirmed. Final sign-off complete."
        },
        {
          date: "2023-09-10",
          stage: "Pre-Shipment",
          result: "Pass",
          inspector: "Lisa Brown",
          details: "Load bank test at factory. All parameters within spec. Packaged for customer delivery."
        },
        {
          date: "2023-09-15",
          stage: "Post-Installation",
          result: "Pass",
          inspector: "Robert Chen",
          details: "On-site commissioning at Mercy Hills. Load bank test: 98.2% efficiency. Customer acceptance signed."
        }
      ]
    },
    sources: ["Supplier QC Records", "Goods Reception Log", "Assembly Quality System", "Commissioning Certificates"]
  },
  {
    pattern: /warranty claim|eligible.*warranty|claim eligibility/i,
    response: "Based on warranty coverage analysis, here is the eligibility matrix for the 7 affected Iowa hospitals:",
    type: "table",
    data: {
      headers: ["Facility", "Unit Serial", "Warranty Status", "Eligible", "Est. Claim Value"],
      rows: [
        ["Mercy Hills Medical Center", "SN-C17L-0094", "Active (2+ years remaining)", "Yes", "$12,500"],
        ["Iowa Heart Hospital", "SN-C17L-0097", "Active (2+ years remaining)", "Yes", "$12,500"],
        ["Cedar Rapids Regional", "SN-C17L-0101", "Active (2+ years remaining)", "Yes", "$12,500"],
        ["Dubuque Medical Center", "SN-C17L-0103", "Active (2+ years remaining)", "Yes", "$12,500"],
        ["Sioux City Healthcare", "SN-C17L-0106", "Active (1+ year remaining)", "Yes", "$12,500"],
        ["Waterloo General Hospital", "SN-C17L-0109", "Active (1+ year remaining)", "Yes", "$12,500"],
        ["Iowa City University Hospital", "SN-C17L-0111", "Active (1+ year remaining)", "Yes", "$12,500"]
      ]
    },
    sources: ["Warranty Registry", "Claims Processing System", "Component Pricing Database"]
  }
]

export const suggestedPrompts = [
  "Trace the supplier for the alternator in Generator SN-C17L-0094",
  "Show commission details for Mercy Hills Medical Center",
  "What is the full service history for unit SN-C17L-0094?",
  "List all quality inspections for the Stamford S-Range lot STA-2023-B4",
  "What warranty coverage applies to the affected CENTUM units?",
  "Where else has the Stamford S-Range alternator from lot STA-2023-B4 been installed?",
  "Which customers are at cohort risk from the Stamford lot STA-2023-B4 defect?",
  "Show inspection records at goods reception for PO-STM-7741"
]

export function findMatchingResponse(query: string): AIResponse | null {
  for (const response of aiResponses) {
    if (response.pattern.test(query)) {
      return response
    }
  }
  return null
}

export function getDefaultResponse(): AIResponse {
  return {
    pattern: /.*/,
    response: "I understand you're asking about equipment traceability. To help you better, try asking about:\n\n- **Supplier information** for a specific component or unit\n- **Service history** for a generator serial number\n- **Warranty status** for affected units\n- **Cohort risk** analysis for a defective lot\n- **Quality inspection** records across the supply chain\n\nYou can also click on one of the suggested prompts above to get started.",
    type: "text",
    sources: []
  }
}
