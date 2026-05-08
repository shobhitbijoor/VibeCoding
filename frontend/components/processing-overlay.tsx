"use client"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface ProcessingOverlayProps {
  isVisible: boolean
}

export function ProcessingOverlay({ isVisible }: ProcessingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-sm text-muted-foreground">Processing...</p>
      </div>
    </div>
  )
}
