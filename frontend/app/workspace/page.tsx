"use client"

import { useState, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { AlertCard } from "@/components/alert-card"
import { AgentPipeline } from "@/components/agent-pipeline"
import { ProcessingOverlay } from "@/components/processing-overlay"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getIssueById, formatDate, getStageLabel } from "@/data/issues"
import { cn } from "@/lib/utils"

export type Stage = "idle" | "analyze" | "root-cause" | "assess-impact" | "corrective-actions"

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const issueId = searchParams.get("issue")
  const issue = issueId ? getIssueById(issueId) : null

  const [currentStage, setCurrentStage] = useState<Stage>("idle")
  const [isProcessing, setIsProcessing] = useState(false)
  const [alertClicked, setAlertClicked] = useState(false)
  const pipelineRef = useRef<HTMLDivElement>(null)

  const scrollToPipeline = useCallback(() => {
    pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleAlertClick = () => {
    setAlertClicked(true)
    scrollToPipeline()
  }

  const handleStartAnalysis = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setCurrentStage("analyze")
    }, 1000)
  }

  const handleNextStage = (nextStage: Stage) => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setCurrentStage(nextStage)
      scrollToPipeline()
    }, 1000)
  }

  // If no issue is loaded, show idle state
  if (!issue) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Workspace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Agent pipeline for equipment fault analysis and resolution
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Issue Selected</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Select an issue from the Dashboard to begin the agent pipeline analysis, 
              or click on the alert card below to start the demo scenario.
            </p>
            <Link 
              href="/dashboard" 
              className="text-primary hover:underline text-sm font-medium"
            >
              Go to Dashboard
            </Link>
          </CardContent>
        </Card>

        {/* Show demo alert card even without issue context */}
        <div className="mt-6">
          <AlertCard 
            onClick={handleAlertClick} 
            isClicked={alertClicked}
            onStartAnalysis={handleStartAnalysis}
          />
          
          <div ref={pipelineRef} className="scroll-mt-20">
            <AgentPipeline 
              currentStage={currentStage} 
              onNextStage={handleNextStage}
              alertClicked={alertClicked}
            />
          </div>
        </div>

        <ProcessingOverlay isVisible={isProcessing} />
      </div>
    )
  }

  // Issue context loaded
  return (
    <div className="p-6">
      {/* Issue Context Banner */}
      <div className={cn(
        "mb-6 p-4 rounded-lg border",
        issue.isActiveScenario 
          ? "bg-warning/5 border-warning/30" 
          : "bg-card border-border"
      )}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{issue.id}</span>
              <Badge variant="outline" className="capitalize">
                {issue.alertType}
              </Badge>
              {issue.isActiveScenario && (
                <Badge variant="outline" className="border-warning text-warning">
                  Active Scenario
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Facility: </span>
              <span className="font-medium">{issue.facility}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Detected: </span>
              <span>{formatDate(issue.detected)}</span>
            </div>
            <Badge variant="outline">
              {getStageLabel(issue.stage)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Alert Card and Pipeline */}
      <AlertCard 
        onClick={handleAlertClick} 
        isClicked={alertClicked}
        onStartAnalysis={handleStartAnalysis}
      />
      
      <div ref={pipelineRef} className="scroll-mt-20">
        <AgentPipeline 
          currentStage={currentStage} 
          onNextStage={handleNextStage}
          alertClicked={alertClicked}
        />
      </div>

      <ProcessingOverlay isVisible={isProcessing} />
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <WorkspaceContent />
    </Suspense>
  )
}
