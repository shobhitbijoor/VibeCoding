"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Database, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface GraphSnapshot {
  id: string
  timestamp: string
  description: string
}

interface GraphStats {
  totalNodes: number
  totalRelationships: number
  totalSnapshots: number
  [key: string]: number
}

export default function DataManagementPage() {
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/graph?action=statistics")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchSnapshots = async () => {
    try {
      const response = await fetch("/api/graph?action=snapshots")
      if (response.ok) {
        const data = await response.json()
        setSnapshots(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch snapshots:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchSnapshots()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch("/api/graph?action=export")
      if (response.ok) {
        const data = await response.json()
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `kuzu_graph_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage({ type: "success", text: "Data exported successfully! Check your downloads folder." })
      } else {
        setMessage({ type: "error", text: "Failed to export data. Please try again." })
      }
    } catch (error) {
      console.error("Export error:", error)
      setMessage({ type: "error", text: "Export failed. Please check your connection." })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportProgress(0)
    setMessage(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const response = await fetch("/api/graph?action=import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage({ 
            type: "success", 
            text: "Data imported successfully! A backup snapshot was created before import." 
          })
          await Promise.all([fetchStats(), fetchSnapshots()])
        } else {
          setMessage({ type: "error", text: result.error || "Import failed." })
        }
      } else {
        setMessage({ type: "error", text: "Failed to import data. Please check the file format." })
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Import error:", error)
      setMessage({ type: "error", text: "Import failed. Please ensure the file is valid JSON." })
    } finally {
      setImporting(false)
      setImportProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRollback = async () => {
    if (!selectedSnapshot) return

    setRollingBack(true)
    setMessage(null)

    try {
      const response = await fetch("/api/graph?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: selectedSnapshot }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage({ type: "success", text: "Successfully restored from snapshot!" })
          await Promise.all([fetchStats(), fetchSnapshots()])
        } else {
          setMessage({ type: "error", text: result.error || "Rollback failed." })
        }
      } else {
        setMessage({ type: "error", text: "Failed to rollback. Please try again." })
      }
    } catch (error) {
      console.error("Rollback error:", error)
      setMessage({ type: "error", text: "Rollback failed. Please check your connection." })
    } finally {
      setRollingBack(false)
      setRollbackDialogOpen(false)
      setSelectedSnapshot(null)
    }
  }

  const handleCreateSnapshot = async () => {
    try {
      const response = await fetch("/api/graph?action=snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Manual snapshot" }),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Snapshot created successfully!" })
        await fetchSnapshots()
      } else {
        setMessage({ type: "error", text: "Failed to create snapshot." })
      }
    } catch (error) {
      console.error("Snapshot error:", error)
      setMessage({ type: "error", text: "Failed to create snapshot." })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const nodeCategories = [
    { label: "Customers", key: "nodes_Customer", color: "bg-blue-500/20 text-blue-400" },
    { label: "Locations", key: "nodes_CustomerLocation", color: "bg-blue-500/20 text-blue-400" },
    { label: "Assemblies", key: "nodes_Assembly", color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Parts", key: "nodes_Part", color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Warranties", key: "nodes_Warranty", color: "bg-purple-500/20 text-purple-400" },
    { label: "Service Records", key: "nodes_ServiceRecord", color: "bg-purple-500/20 text-purple-400" },
    { label: "Failures", key: "nodes_Failure", color: "bg-red-500/20 text-red-400" },
    { label: "Root Causes", key: "nodes_RootCause", color: "bg-red-500/20 text-red-400" },
    { label: "Plants", key: "nodes_Plant", color: "bg-amber-500/20 text-amber-400" },
    { label: "Stations", key: "nodes_Station", color: "bg-amber-500/20 text-amber-400" },
    { label: "Warehouses", key: "nodes_Warehouse", color: "bg-amber-500/20 text-amber-400" },
    { label: "Suppliers", key: "nodes_Supplier", color: "bg-cyan-500/20 text-cyan-400" },
    { label: "Supplier POs", key: "nodes_SupplierPO", color: "bg-cyan-500/20 text-cyan-400" },
    { label: "Quality Inspections", key: "nodes_QualityInspection", color: "bg-green-500/20 text-green-400" },
    { label: "Deviations", key: "nodes_Deviation", color: "bg-orange-500/20 text-orange-400" },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Import/Export</h1>
          <p className="text-muted-foreground">
            Manage your Kuzu graph database data with import, export, and versioning
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setLoading(true)
          Promise.all([fetchStats(), fetchSnapshots()]).then(() => setLoading(false))
        }}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "border-green-500/50 bg-green-500/10" : ""}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{message.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Nodes</span>
              <Badge variant="secondary" className="text-lg">{stats?.totalNodes || 0}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Total Relationships</span>
              <Badge variant="outline">{stats?.totalRelationships || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              Snapshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                stats?.totalSnapshots || 0
              )}
            </div>
            <p className="text-sm text-muted-foreground">available for rollback</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-amber-500" />
              Graph Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">Kuzu</div>
            <p className="text-sm text-muted-foreground">Embedded graph database for manufacturing traceability</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="rollback" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Rollback Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4">
          <Card className="border-sidebar-border bg-card">
            <CardHeader>
              <CardTitle>Export Database to JSON</CardTitle>
              <CardDescription>
                Download all graph database data as a JSON file. This file can also be used as a template for importing data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-2 font-medium">Export includes:</h4>
                <ul className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                  <li>- Customers and Locations</li>
                  <li>- Assemblies and Parts</li>
                  <li>- Warranties and Service Records</li>
                  <li>- Failures and Root Causes</li>
                  <li>- Plants, Stations, Warehouses</li>
                  <li>- Suppliers and Purchase Orders</li>
                  <li>- Quality Inspections and Deviations</li>
                  <li>- All Relationship Data</li>
                </ul>
              </div>
              <Button 
                onClick={handleExport} 
                disabled={exporting}
                className="w-full md:w-auto"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export to JSON
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card className="border-sidebar-border bg-card">
            <CardHeader>
              <CardTitle>Import Data from JSON</CardTitle>
              <CardDescription>
                Upload a JSON file to replace the current database. Use the exported file as a template for the correct format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Importing data will create a backup snapshot of the current data before replacing it. 
                  You can always rollback to a previous snapshot if needed.
                </AlertDescription>
              </Alert>

              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing data...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  ref={fileInputRef}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button 
                    asChild
                    disabled={importing}
                    variant="default"
                  >
                    <span>
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Select JSON File
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-muted-foreground">
                  Supported format: .json
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollback" className="mt-4">
          <Card className="border-sidebar-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Snapshot History</CardTitle>
                  <CardDescription>
                    View and restore previous snapshots of your data. Each import creates a new snapshot.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCreateSnapshot}>
                  <History className="mr-2 h-4 w-4" />
                  Create Snapshot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {snapshots.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <History className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p>No snapshots available yet.</p>
                  <p className="text-sm">Snapshots are created when you import data or manually.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Snapshot ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snapshot, index) => (
                      <TableRow key={snapshot.id}>
                        <TableCell>
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {snapshot.id.substring(0, 15)}...
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(snapshot.timestamp)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {snapshot.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSnapshot(snapshot.id)
                              setRollbackDialogOpen(true)
                            }}
                          >
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-sidebar-border bg-card">
        <CardHeader>
          <CardTitle>Database Statistics</CardTitle>
          <CardDescription>Current record counts for each node type in the graph database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {nodeCategories.map(({ label, key, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Badge className={color}>
                    {stats?.[key] || 0}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from Snapshot</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore from this snapshot? Current data will be replaced with the snapshot data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRollback} disabled={rollingBack}>
              {rollingBack ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
