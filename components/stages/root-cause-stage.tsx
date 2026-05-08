"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CheckCircle2, ChevronDown, ArrowRight, Wrench, Package, Settings, FileText, AlertTriangle } from "lucide-react"
import { KnowledgeGraph } from "@/components/knowledge-graph"
import { ActivityLog } from "@/components/activity-log"

interface RootCauseStageProps {
  onNext: () => void
}

const serviceHistory = [
  { date: "Feb 15, 2026", type: "Preventive Maintenance", technician: "J. Morrison", notes: "Alternator inspection - no issues found" },
  { date: "Dec 08, 2025", type: "Component Replacement", technician: "R. Chen", notes: "Voltage regulator calibration performed" },
  { date: "Sep 22, 2025", type: "Emergency Repair", technician: "M. Johnson", notes: "Cooling fan replacement" },
]

const commissioningHistory = [
  { date: "Jul 10, 2024", event: "Initial Commissioning", location: "Mercy Hills Medical Center", status: "Completed" },
  { date: "Jul 05, 2024", event: "Site Installation", location: "Mercy Hills Medical Center", status: "Completed" },
  { date: "Jun 28, 2024", event: "Factory Acceptance Test", location: "CENTUM Manufacturing", status: "Passed" },
]

const manufacturingGenealogy = [
  { label: "Batch Number", value: "SR-2024-0847" },
  { label: "Lot ID", value: "LOT-847-A" },
  { label: "Manufacturing Date", value: "Jun 15, 2024" },
  { label: "Assembly Line", value: "Line 3, Stamford UK" },
  { label: "QC Inspector", value: "ID: QC-2847" },
  { label: "Units in Batch", value: "150 units" },
]

const engineeringSpecs = [
  { spec: "Rated Output", expected: "750 KW", actual: "742 KW", status: "warning" },
  { spec: "Voltage Regulation", expected: "±1.0%", actual: "±3.2%", status: "critical" },
  { spec: "Winding Resistance", expected: "0.45Ω", actual: "0.52Ω", status: "critical" },
  { spec: "Insulation Class", expected: "H (180°C)", actual: "H (180°C)", status: "normal" },
]

export function RootCauseStage({ onNext }: RootCauseStageProps) {
  const [activeTab, setActiveTab] = useState("processing")
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

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
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-medium">Root Cause Analysis</CardTitle>
                    <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                      Component Defect Confirmed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-2">
                  {/* Service History */}
                  <Collapsible open={openSections.includes("service")} onOpenChange={() => toggleSection("service")}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Service History</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.includes("service") ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="space-y-2 pl-6">
                        {serviceHistory.map((item, index) => (
                          <div key={index} className="p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{item.type}</span>
                              <span className="text-xs text-muted-foreground">{item.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Technician: {item.technician}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Commissioning History */}
                  <Collapsible open={openSections.includes("commissioning")} onOpenChange={() => toggleSection("commissioning")}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Commissioning History</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.includes("commissioning") ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="space-y-2 pl-6">
                        {commissioningHistory.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                            <div>
                              <span className="text-sm font-medium">{item.event}</span>
                              <p className="text-xs text-muted-foreground">{item.location}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">{item.date}</span>
                              <Badge variant="outline" className="ml-2 text-[10px] bg-success/10 text-success border-success/30">
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Manufacturing Genealogy */}
                  <Collapsible open={openSections.includes("manufacturing")} onOpenChange={() => toggleSection("manufacturing")}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Manufacturing Genealogy</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.includes("manufacturing") ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        {manufacturingGenealogy.map((item, index) => (
                          <div key={index} className="p-2 rounded-lg bg-muted/50 border border-border">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-medium">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Engineering Specifications */}
                  <Collapsible open={openSections.includes("engineering")} onOpenChange={() => toggleSection("engineering")}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Engineering Specifications</span>
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.includes("engineering") ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="space-y-2 pl-6">
                        {engineeringSpecs.map((item, index) => (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              item.status === "critical" 
                                ? "bg-destructive/5 border-destructive/30" 
                                : item.status === "warning"
                                ? "bg-warning/5 border-warning/30"
                                : "bg-muted/50 border-border"
                            }`}
                          >
                            <span className="text-sm font-medium">{item.spec}</span>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Expected</p>
                                <p className="text-sm">{item.expected}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Actual</p>
                                <p className={`text-sm font-medium ${
                                  item.status === "critical" ? "text-destructive" : 
                                  item.status === "warning" ? "text-warning" : ""
                                }`}>{item.actual}</p>
                              </div>
                              {item.status !== "normal" && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    item.status === "critical" 
                                      ? "bg-destructive/10 text-destructive border-destructive/30" 
                                      : "bg-warning/10 text-warning border-warning/30"
                                  }`}
                                >
                                  {item.status === "critical" ? "Out of Spec" : "Warning"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
          <ActivityLog stage="root-cause" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90">
          View Assess Impact
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Tabs>
  )
}
