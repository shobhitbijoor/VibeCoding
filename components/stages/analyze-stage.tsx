"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertTriangle, Zap, Thermometer, Gauge, Clock, ArrowRight } from "lucide-react"
import { KnowledgeGraph } from "@/components/knowledge-graph"
import { ActivityLog } from "@/components/activity-log"

interface AnalyzeStageProps {
  onNext: () => void
}

const analyzedElements = [
  { label: "Voltage Reading", value: "+15.3% deviation", status: "critical", icon: Zap },
  { label: "Temperature", value: "Normal range", status: "normal", icon: Thermometer },
  { label: "Frequency", value: "59.8 Hz", status: "warning", icon: Gauge },
  { label: "Last Service", value: "45 days ago", status: "normal", icon: Clock },
]

const keyFindings = [
  "Voltage spike pattern matches known alternator failure signature",
  "Affected unit: CENTUM 17L-750KW at Mercy Hills Medical Center",
  "Component identified: Stamford S-Range Alternator (Batch: SR-2024-0847)",
  "Similar anomalies detected in 6 other Iowa healthcare facilities",
]

export function AnalyzeStage({ onNext }: AnalyzeStageProps) {
  const [activeTab, setActiveTab] = useState("processing")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      {/* Header Row with Tabs and Activity Log Label */}
      <div className="flex items-center justify-between">
        <TabsList className="bg-secondary">
          <TabsTrigger value="processing">
            Processing
          </TabsTrigger>
          <TabsTrigger value="knowledge-graph">
            Knowledge Graph
          </TabsTrigger>
          <TabsTrigger value="affected-units">
            Affected Units
          </TabsTrigger>
        </TabsList>
        <span className="text-sm font-medium text-muted-foreground">Activity Log</span>
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TabsContent value="processing" className="mt-0">
              <Card className="bg-card border-border">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">Analyzed Elements</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {analyzedElements.map((element) => {
                      const Icon = element.icon
                      return (
                        <div
                          key={element.label}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                        >
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">{element.label}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{element.value}</span>
                              <Badge
                                variant="outline"
                                className={
                                  element.status === "critical"
                                    ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                                    : element.status === "warning"
                                    ? "bg-warning/10 text-warning border-warning/30 text-[10px]"
                                    : "bg-success/10 text-success border-success/30 text-[10px]"
                                }
                              >
                                {element.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Key Findings
                    </h4>
                    <ul className="space-y-2">
                      {keyFindings.map((finding, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="knowledge-graph" className="mt-0">
              <KnowledgeGraph />
            </TabsContent>
            
            <TabsContent value="affected-units" className="mt-0">
              <Card className="bg-card border-border">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">Preliminary Affected Units</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Full impact assessment will be available in the Assess Impact stage.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
        </div>

        <div className="col-span-1">
          <ActivityLog stage="analyze" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90">
          View Root Cause Analysis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Tabs>
  )
}
