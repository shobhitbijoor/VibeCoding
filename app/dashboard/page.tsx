"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ExternalLink,
  Eye,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { issues, getIssueStats, formatDate, getStageLabel, type Issue, type IssueSeverity, type IssueStage } from "@/data/issues"
import { cn } from "@/lib/utils"

const severityColors: Record<IssueSeverity, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-muted"
}

const stageColors: Record<IssueStage, string> = {
  "analyze": "bg-chart-1/10 text-chart-1 border-chart-1/30",
  "root-cause": "bg-chart-2/10 text-chart-2 border-chart-2/30",
  "assess-impact": "bg-chart-3/10 text-chart-3 border-chart-3/30",
  "corrective-actions": "bg-chart-4/10 text-chart-4 border-chart-4/30"
}

export default function DashboardPage() {
  const router = useRouter()
  const stats = getIssueStats()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>("all")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)

  // Get unique alert types for filter
  const alertTypes = [...new Set(issues.map(i => i.alertType))]

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.facility.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.equipment.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter
    const matchesStage = stageFilter === "all" || issue.stage === stageFilter
    const matchesAlertType = alertTypeFilter === "all" || issue.alertType === alertTypeFilter

    return matchesSearch && matchesSeverity && matchesStage && matchesAlertType
  })

  const clearFilters = () => {
    setSearchQuery("")
    setSeverityFilter("all")
    setStageFilter("all")
    setAlertTypeFilter("all")
  }

  const hasActiveFilters = searchQuery || severityFilter !== "all" || stageFilter !== "all" || alertTypeFilter !== "all"

  const openInWorkspace = (issueId: string) => {
    router.push(`/workspace?issue=${issueId}`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-balance">Operations Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time overview of detected equipment issues across all facilities
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Open Issues
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOpen}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all facilities
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical / High Priority
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.criticalHigh}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Dispatch
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingDispatch}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting technician assignment
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved (30 Days)
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.resolvedLast30Days}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, facility, or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="analyze">Analyze</SelectItem>
            <SelectItem value="root-cause">Root Cause Analysis</SelectItem>
            <SelectItem value="assess-impact">Assess Impact</SelectItem>
            <SelectItem value="corrective-actions">Corrective Actions</SelectItem>
          </SelectContent>
        </Select>

        <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {alertTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Issues Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Issue ID</TableHead>
                <TableHead>Alert Type</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Facility / Site</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead className="w-[160px]">Stage</TableHead>
                <TableHead className="w-[160px]">Detected</TableHead>
                <TableHead className="w-[140px]">Assigned To</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => (
                <TableRow 
                  key={issue.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    issue.isActiveScenario && "border-l-4 border-l-warning bg-warning/5"
                  )}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {issue.id}
                      {issue.isActiveScenario && (
                        <Badge variant="outline" className="text-[10px] border-warning text-warning">
                          Active Scenario
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{issue.alertType}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{issue.equipment}</div>
                      <div className="text-xs text-muted-foreground">{issue.equipmentSerial}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{issue.facility}</div>
                      <div className="text-xs text-muted-foreground">{issue.location}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", severityColors[issue.severity])}
                    >
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={cn(stageColors[issue.stage])}
                    >
                      {getStageLabel(issue.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(issue.detected)}
                  </TableCell>
                  <TableCell>
                    {issue.assignedTo || (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openInWorkspace(issue.id)}
                        title="Open in Workspace"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedIssue(issue)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issue Detail Drawer */}
      <Sheet open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedIssue && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedIssue.id}
                  {selectedIssue.isActiveScenario && (
                    <Badge variant="outline" className="border-warning text-warning">
                      Active Scenario
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedIssue.alertType} detected at {selectedIssue.facility}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Severity</p>
                    <Badge variant="outline" className={cn("capitalize", severityColors[selectedIssue.severity])}>
                      {selectedIssue.severity}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stage</p>
                    <Badge variant="outline" className={stageColors[selectedIssue.stage]}>
                      {getStageLabel(selectedIssue.stage)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Equipment</p>
                  <p className="font-medium">{selectedIssue.equipment}</p>
                  <p className="text-sm text-muted-foreground">{selectedIssue.equipmentSerial}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Facility</p>
                  <p className="font-medium">{selectedIssue.facility}</p>
                  <p className="text-sm text-muted-foreground">{selectedIssue.location}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Detected</p>
                  <p className="text-sm">{formatDate(selectedIssue.detected)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Assigned To</p>
                  <p className="text-sm">{selectedIssue.assignedTo || "Unassigned"}</p>
                </div>

                {selectedIssue.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm">{selectedIssue.description}</p>
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setSelectedIssue(null)
                      openInWorkspace(selectedIssue.id)
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Workspace
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
