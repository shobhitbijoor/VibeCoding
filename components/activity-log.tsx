"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, Circle, AlertTriangle, Database, Search, GitBranch } from "lucide-react"

type Stage = "analyze" | "root-cause" | "assess-impact" | "corrective-actions"

interface ActivityLogProps {
  stage: Stage
}

const activityLogs: Record<Stage, Array<{ time: string; event: string; type: "success" | "info" | "warning" }>> = {
  analyze: [
    { time: "14:32:15", event: "Alert received from IoT gateway", type: "warning" },
    { time: "14:32:16", event: "Parsing sensor telemetry data", type: "info" },
    { time: "14:32:17", event: "Voltage spike pattern identified", type: "warning" },
    { time: "14:32:18", event: "Querying Knowledge Fabric...", type: "info" },
    { time: "14:32:19", event: "Equipment profile retrieved", type: "success" },
    { time: "14:32:20", event: "Historical data analysis started", type: "info" },
    { time: "14:32:22", event: "Similar patterns found in database", type: "success" },
    { time: "14:32:23", event: "Component correlation identified", type: "success" },
    { time: "14:32:24", event: "Analysis complete", type: "success" },
  ],
  "root-cause": [
    { time: "14:33:01", event: "Initiating root cause analysis", type: "info" },
    { time: "14:33:02", event: "Traversing service history graph", type: "info" },
    { time: "14:33:03", event: "Service records retrieved (3 entries)", type: "success" },
    { time: "14:33:04", event: "Analyzing commissioning data", type: "info" },
    { time: "14:33:05", event: "Commissioning timeline loaded", type: "success" },
    { time: "14:33:06", event: "Querying manufacturing genealogy", type: "info" },
    { time: "14:33:07", event: "Batch SR-2024-0847 identified", type: "warning" },
    { time: "14:33:08", event: "Engineering specs comparison", type: "info" },
    { time: "14:33:10", event: "Spec deviations detected", type: "warning" },
    { time: "14:33:11", event: "Root cause confirmed: Alternator defect", type: "success" },
  ],
  "assess-impact": [
    { time: "14:34:01", event: "Initiating impact assessment", type: "info" },
    { time: "14:34:02", event: "Querying product installation base", type: "info" },
    { time: "14:34:03", event: "Filtering by component batch", type: "info" },
    { time: "14:34:04", event: "Geographic filter applied: Iowa", type: "info" },
    { time: "14:34:05", event: "Healthcare facilities identified", type: "success" },
    { time: "14:34:06", event: "7 affected units confirmed", type: "warning" },
    { time: "14:34:07", event: "Priority scoring applied", type: "info" },
    { time: "14:34:08", event: "1 Critical, 4 High, 2 Medium", type: "warning" },
    { time: "14:34:09", event: "Impact assessment complete", type: "success" },
  ],
  "corrective-actions": [
    { time: "14:35:01", event: "Generating corrective action plan", type: "info" },
    { time: "14:35:02", event: "Checking technician availability", type: "info" },
    { time: "14:35:03", event: "Service teams identified (4 teams)", type: "success" },
    { time: "14:35:04", event: "Parts inventory checked", type: "info" },
    { time: "14:35:05", event: "7 replacement units available", type: "success" },
    { time: "14:35:06", event: "Routing optimization complete", type: "success" },
    { time: "14:35:07", event: "Action plan ready for execution", type: "success" },
  ],
}

export function ActivityLog({ stage }: ActivityLogProps) {
  const logs = activityLogs[stage] || []

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <ScrollArea className="h-[320px] pr-2">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground font-mono shrink-0 w-14">{log.time}</span>
                <div className="shrink-0 mt-0.5">
                  {log.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : log.type === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-muted-foreground">{log.event}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
