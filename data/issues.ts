export type IssueSeverity = "critical" | "high" | "medium" | "low"
export type IssueStage = "analyze" | "root-cause" | "assess-impact" | "corrective-actions"

export interface Issue {
  id: string
  alertType: string
  equipment: string
  equipmentSerial: string
  facility: string
  location: string
  severity: IssueSeverity
  stage: IssueStage
  detected: string
  assignedTo: string | null
  isActiveScenario?: boolean
  description?: string
}

export const issues: Issue[] = [
  {
    id: "ISS-2024-0047",
    alertType: "Voltage Spike",
    equipment: "CENTUM 17L 600KW",
    equipmentSerial: "SN-C17L-0094",
    facility: "Mercy Hills Medical Center",
    location: "IA",
    severity: "critical",
    stage: "corrective-actions",
    detected: "2024-03-10T14:32:00Z",
    assignedTo: "John Martinez",
    isActiveScenario: true,
    description: "Intermittent voltage spikes detected on alternator output. Potential impact to backup power reliability for critical care units."
  },
  {
    id: "ISS-2024-0051",
    alertType: "Bearing Wear",
    equipment: "CENTUM 17L 800KW",
    equipmentSerial: "SN-C17L-0112",
    facility: "Iowa Heart Hospital",
    location: "IA",
    severity: "high",
    stage: "assess-impact",
    detected: "2024-03-09T08:15:00Z",
    assignedTo: "Sarah Chen",
    description: "Elevated vibration levels indicating potential bearing wear on main generator shaft."
  },
  {
    id: "ISS-2024-0038",
    alertType: "Coolant Leak",
    equipment: "CENTUM X15 1000KW",
    equipmentSerial: "SN-CX15-0078",
    facility: "Cedar Rapids Regional",
    location: "IA",
    severity: "medium",
    stage: "root-cause",
    detected: "2024-03-08T16:45:00Z",
    assignedTo: "Mike Thompson",
    description: "Minor coolant leak detected in radiator assembly. No immediate impact to operations."
  },
  {
    id: "ISS-2024-0029",
    alertType: "Overtemperature",
    equipment: "CENTUM 17L 600KW",
    equipmentSerial: "SN-C17L-0089",
    facility: "Des Moines General",
    location: "IA",
    severity: "high",
    stage: "analyze",
    detected: "2024-03-07T11:20:00Z",
    assignedTo: null,
    description: "Engine operating above normal temperature range under standard load conditions."
  },
  {
    id: "ISS-2024-0019",
    alertType: "Output Frequency Drift",
    equipment: "CENTUM X15 800KW",
    equipmentSerial: "SN-CX15-0065",
    facility: "Dubuque Medical Center",
    location: "IA",
    severity: "medium",
    stage: "analyze",
    detected: "2024-03-06T09:30:00Z",
    assignedTo: null,
    description: "Output frequency showing minor deviation from 60Hz standard during load transitions."
  },
  {
    id: "ISS-2024-0012",
    alertType: "Fuel Pressure Drop",
    equipment: "CENTUM 17L 1000KW",
    equipmentSerial: "SN-C17L-0156",
    facility: "Sioux City Healthcare",
    location: "IA",
    severity: "low",
    stage: "root-cause",
    detected: "2024-03-05T14:10:00Z",
    assignedTo: "David Lee",
    description: "Intermittent fuel pressure drops observed during extended run cycles."
  }
]

export function getIssueById(id: string): Issue | undefined {
  return issues.find(issue => issue.id === id)
}

export function getIssueStats() {
  const totalOpen = issues.length
  const criticalHigh = issues.filter(i => i.severity === "critical" || i.severity === "high").length
  const pendingDispatch = issues.filter(i => i.stage === "corrective-actions" && i.assignedTo === null).length
  const resolvedLast30Days = 12 // Mock number for demo

  return {
    totalOpen,
    criticalHigh,
    pendingDispatch,
    resolvedLast30Days
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 || 12
  
  return `${month} ${day}, ${year}, ${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`
}

export function getStageLabel(stage: IssueStage): string {
  const labels: Record<IssueStage, string> = {
    "analyze": "Analyze",
    "root-cause": "Root Cause Analysis",
    "assess-impact": "Assess Impact",
    "corrective-actions": "Corrective Actions"
  }
  return labels[stage]
}
