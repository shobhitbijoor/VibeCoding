"use client"

import { Search, GitBranch, Target, Wrench, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/app/page"
import { AnalyzeStage } from "@/components/stages/analyze-stage"
import { RootCauseStage } from "@/components/stages/root-cause-stage"
import { AssessImpactStage } from "@/components/stages/assess-impact-stage"
import { CorrectiveActionsStage } from "@/components/stages/corrective-actions-stage"

interface AgentPipelineProps {
  currentStage: Stage
  onNextStage: (stage: Stage) => void
  alertClicked: boolean
}

const stages = [
  { id: "analyze" as const, label: "Analyze", icon: Search },
  { id: "root-cause" as const, label: "Root Cause Analysis", icon: GitBranch },
  { id: "assess-impact" as const, label: "Assess Impact", icon: Target },
  { id: "corrective-actions" as const, label: "Corrective Actions", icon: Wrench },
]

const stageOrder: Stage[] = ["idle", "analyze", "root-cause", "assess-impact", "corrective-actions"]

function getStageIndex(stage: Stage): number {
  return stageOrder.indexOf(stage)
}

export function AgentPipeline({ currentStage, onNextStage, alertClicked }: AgentPipelineProps) {
  const currentIndex = getStageIndex(currentStage)

  return (
    <div className="space-y-4">
      {/* Pipeline Steps */}
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => {
          const stageIdx = getStageIndex(stage.id)
          const isCompleted = currentIndex > stageIdx
          const isActive = currentStage === stage.id
          const Icon = stage.icon

          return (
            <div key={stage.id} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 transition-all",
                  isCompleted && "bg-success/10 border-success/30",
                  isActive && "bg-primary/10 border-primary/50 ring-1 ring-primary/30",
                  !isCompleted && !isActive && "bg-secondary border-border"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    isCompleted && "bg-success text-success-foreground",
                    isActive && "bg-primary text-primary-foreground",
                    !isCompleted && !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    isCompleted && "text-success",
                    isActive && "text-primary",
                    !isCompleted && !isActive && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "w-4 h-0.5",
                    currentIndex > stageIdx + 1 ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Stage Content */}
      {alertClicked && currentStage !== "idle" && (
        <div className="mt-4">
          {currentStage === "analyze" && (
            <AnalyzeStage onNext={() => onNextStage("root-cause")} />
          )}
          {currentStage === "root-cause" && (
            <RootCauseStage onNext={() => onNextStage("assess-impact")} />
          )}
          {currentStage === "assess-impact" && (
            <AssessImpactStage onNext={() => onNextStage("corrective-actions")} />
          )}
          {currentStage === "corrective-actions" && (
            <CorrectiveActionsStage />
          )}
        </div>
      )}
    </div>
  )
}
