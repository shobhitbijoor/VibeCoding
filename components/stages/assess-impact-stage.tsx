"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, MapPin, Calendar, AlertTriangle, ArrowRight } from "lucide-react"
import { KnowledgeGraph } from "@/components/knowledge-graph"
import { ActivityLog } from "@/components/activity-log"

interface AssessImpactStageProps {
  onNext: () => void
}

const affectedFacilities = [
  { 
    name: "Mercy Hills Medical Center", 
    location: "Iowa City, IA", 
    unit: "CENTUM 17L-750KW",
    lastService: "45 days ago",
    priority: "critical",
    alternator: "SR-2024-0847"
  },
  { 
    name: "Iowa Heart Hospital", 
    location: "Des Moines, IA", 
    unit: "CENTUM 17L-600KW",
    lastService: "30 days ago",
    priority: "high",
    alternator: "SR-2024-0851"
  },
  { 
    name: "Cedar Rapids Regional", 
    location: "Cedar Rapids, IA", 
    unit: "CENTUM 17L-850KW",
    lastService: "60 days ago",
    priority: "high",
    alternator: "SR-2024-0849"
  },
  { 
    name: "Des Moines General", 
    location: "Des Moines, IA", 
    unit: "CENTUM 17L-750KW",
    lastService: "15 days ago",
    priority: "medium",
    alternator: "SR-2024-0852"
  },
  { 
    name: "Dubuque Medical Center", 
    location: "Dubuque, IA", 
    unit: "CENTUM 17L-600KW",
    lastService: "90 days ago",
    priority: "high",
    alternator: "SR-2024-0848"
  },
  { 
    name: "Sioux City Healthcare", 
    location: "Sioux City, IA", 
    unit: "CENTUM 17L-1000KW",
    lastService: "20 days ago",
    priority: "medium",
    alternator: "SR-2024-0853"
  },
  { 
    name: "Waterloo Memorial", 
    location: "Waterloo, IA", 
    unit: "CENTUM 17L-750KW",
    lastService: "75 days ago",
    priority: "high",
    alternator: "SR-2024-0850"
  },
]

const impactSummary = [
  { label: "Total Affected Units", value: "7" },
  { label: "Critical Priority", value: "1" },
  { label: "High Priority", value: "4" },
  { label: "Medium Priority", value: "2" },
]

export function AssessImpactStage({ onNext }: AssessImpactStageProps) {
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
                  <CardTitle className="text-sm font-medium">Impact Assessment</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-4">
                  {/* Impact Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    {impactSummary.map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                        <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Affected Facilities List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Affected Healthcare Facilities
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {affectedFacilities.map((facility, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{facility.name}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {facility.location}
                                </span>
                                <span>{facility.unit}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Last Service</p>
                              <p className="text-xs">{facility.lastService}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                facility.priority === "critical"
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : facility.priority === "high"
                                  ? "bg-warning/10 text-warning border-warning/30"
                                  : "bg-primary/10 text-primary border-primary/30"
                              }`}
                            >
                              {facility.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Findings */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Key Findings
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        All 7 units contain Stamford S-Range alternators from batch SR-2024-08XX
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        Healthcare facilities identified across Iowa requiring immediate attention
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        Estimated 48-hour window before potential cascading failures
                      </li>
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
                  <CardTitle className="text-sm font-medium">Affected Units Detail</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="space-y-2">
                    {affectedFacilities.map((facility, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                        <div>
                          <p className="text-sm font-medium">{facility.name}</p>
                          <p className="text-xs text-muted-foreground">{facility.unit} | Alternator: {facility.alternator}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            facility.priority === "critical"
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : facility.priority === "high"
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-primary/10 text-primary border-primary/30"
                          }`}
                        >
                          {facility.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </div>

        <div className="col-span-1">
          <ActivityLog stage="assess-impact" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90">
          View Corrective Actions
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Tabs>
  )
}
