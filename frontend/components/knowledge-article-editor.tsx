"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

interface KnowledgeArticleEditorProps {
  onClose: () => void
}

const generatedArticle = `# Voltage Spike Detection in CENTUM 17L Generator Sets

## Issue Summary
A critical voltage deviation pattern has been identified in CENTUM Series 17L generator sets (600KW to 1000KW) equipped with Stamford S-Range alternators from manufacturing batch SR-2024-0847.

## Root Cause
The root cause has been traced to a manufacturing defect in the alternator winding resistance, causing:
- Voltage regulation deviation: ±3.2% (expected: ±1.0%)
- Winding resistance: 0.52Ω (expected: 0.45Ω)

## Affected Products
- Model: CENTUM 17L Series (600KW - 1000KW)
- Component: Stamford S-Range Alternator
- Batch: SR-2024-0847
- Manufacturing Date: June 15, 2024
- Total Units Affected: 150 units (7 confirmed in Iowa healthcare facilities)

## Resolution Steps
1. Dispatch field technicians for emergency inspection
2. Issue safety advisory to facility managers
3. Order replacement alternators (Part: ALT-SR-750-R)
4. Schedule preventive maintenance for all units with similar components

## Prevention Measures
- Enhanced QC inspection for alternator winding resistance
- Updated acceptance criteria for voltage regulation testing
- Supplier quality audit scheduled for Stamford UK facility

## Related Articles
- KB-2024-0892: Alternator Maintenance Guidelines
- KB-2024-0756: Voltage Regulation Troubleshooting
- KB-2024-0634: Generator Emergency Protocols for Healthcare

---
*Article ID: KB-2026-0312*
*Category: Critical Alert / Component Defect*
*Last Updated: March 11, 2026*`

export function KnowledgeArticleEditor({ onClose }: KnowledgeArticleEditorProps) {
  const [content, setContent] = useState(generatedArticle)
  const [isPublished, setIsPublished] = useState(false)

  const handlePublish = () => {
    setIsPublished(true)
  }

  if (isPublished) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div className="text-center">
          <h4 className="font-medium text-foreground">Article Published Successfully</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Knowledge article KB-2026-0312 has been published to the knowledge base.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-primary/20 text-primary border-primary/30">
          Auto-Generated
        </Badge>
        <Badge variant="outline">KB-2026-0312</Badge>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[400px] font-mono text-xs bg-secondary/50 border-border"
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handlePublish} className="bg-primary hover:bg-primary/90">
          Publish Article
        </Button>
      </div>
    </div>
  )
}
