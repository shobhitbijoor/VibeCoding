"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, UserCheck, FileText, Shield, Send, Truck, AlertCircle } from "lucide-react"
import { KnowledgeGraph } from "@/components/knowledge-graph"
import { ActivityLog } from "@/components/activity-log"
import { KnowledgeArticleEditor } from "@/components/knowledge-article-editor"
import { WarrantyClaimsList } from "@/components/warranty-claims-list"

const correctiveActions = [
  {
    id: 1,
    title: "Dispatch Field Technicians",
    description: "Deploy service teams to all 7 affected facilities for emergency inspection",
    icon: Truck,
  },
  {
    id: 2,
    title: "Issue Safety Advisory",
    description: "Send critical alert to facility managers with interim safety protocols",
    icon: AlertCircle,
  },
  {
    id: 3,
    title: "Order Replacement Parts",
    description: "Initiate expedited procurement of 7 replacement alternators",
    icon: Send,
  },
  {
    id: 4,
    title: "Schedule Preventive Maintenance",
    description: "Book maintenance slots for all units with similar components",
    icon: FileText,
  },
]

export function CorrectiveActionsStage() {
  const [activeTab, setActiveTab] = useState("processing")
  const [actionStatus, setActionStatus] = useState<Record<number, "pending" | "auto" | "manual">>({})
  const [optionalTab, setOptionalTab] = useState<"article" | "warranty" | null>(null)
  const [showKnowledgeArticle, setShowKnowledgeArticle] = useState(false)
  const [showWarrantyClaims, setShowWarrantyClaims] = useState(false)

  const handleExecuteAuto = (id: number) => {
    setActionStatus((prev) => ({ ...prev, [id]: "auto" }))
  }

  const handleConfirmManual = (id: number) => {
    setActionStatus((prev) => ({ ...prev, [id]: "manual" }))
  }

  const allActionsComplete = correctiveActions.every((action) => actionStatus[action.id])

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
                  <CardTitle className="text-sm font-medium">Corrective Actions</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {correctiveActions.map((action) => {
                    const Icon = action.icon
                    const status = actionStatus[action.id]
                    const isComplete = !!status

                    return (
                      <div
                        key={action.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isComplete
                            ? "bg-success/5 border-success/30"
                            : "bg-secondary/50 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center ${
                              isComplete ? "bg-success text-success-foreground" : "bg-muted"
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isComplete ? (
                            <Badge className="bg-success/10 text-success border-success/30">
                              {status === "auto" ? "Executed Automatically" : "Confirmed Manual"}
                            </Badge>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleExecuteAuto(action.id)}
                              >
                                Execute Automatically
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-chart-2 text-chart-2 hover:bg-chart-2/10 hover:text-chart-2"
                                onClick={() => handleConfirmManual(action.id)}
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                Confirm Manually Executed
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Optional Next Steps */}
                  {allActionsComplete && (
                    <div className="border-t border-border pt-4 mt-4">
                      <h4 className="text-sm font-medium mb-3">Optional Next Steps</h4>
                      <div className="flex gap-2">
                        <Button
                          variant={optionalTab === "article" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setOptionalTab("article")
                            setShowKnowledgeArticle(true)
                          }}
                          className="text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Update Knowledge Article
                        </Button>
                        <Button
                          variant={optionalTab === "warranty" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setOptionalTab("warranty")
                            setShowWarrantyClaims(true)
                          }}
                          className="text-xs"
                        >
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          Assess Warranty Impact
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="knowledge-graph" className="mt-0">
              <KnowledgeGraph />
            </TabsContent>
            
            <TabsContent value="affected-units" className="mt-0">
              <Card className="bg-card border-border">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">Affected Units - Action Status</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    All corrective actions have been initiated for the 7 affected healthcare facilities in Iowa.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
        </div>

        <div className="col-span-1">
          <ActivityLog stage="corrective-actions" />
        </div>
      </div>

      {/* Knowledge Article Dialog */}
      <Dialog open={showKnowledgeArticle} onOpenChange={setShowKnowledgeArticle}>
        <DialogContent className="max-w-[85vw] w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Knowledge Article</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <KnowledgeArticleEditor onClose={() => setShowKnowledgeArticle(false)} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Warranty Claims Dialog */}
      <Dialog open={showWarrantyClaims} onOpenChange={setShowWarrantyClaims}>
        <DialogContent className="max-w-[90vw] w-[1100px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Potential Warranty Claims</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="overflow-x-auto">
              <WarrantyClaimsList />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
