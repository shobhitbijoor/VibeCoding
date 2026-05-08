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

interface DatabaseStats {
  Customer?: number
  CustomerLocation?: number
  Assembly?: number
  Part?: number
  Warranty?: number
  ServiceRecord?: number
  Failure?: number
  RootCause?: number
  Plant?: number
  Station?: number
  Warehouse?: number
  Supplier?: number
  SupplierPO?: number
  QualityInspection?: number
  Deviation?: number
  current_version?: number
  available_versions?: number
}

interface Version {
  version: number
  created_at: string
  description: string
}

export default function DataManagementPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersion, setCurrentVersion] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchVersions = async () => {
    try {
      const response = await fetch("/api/versions")
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
        setCurrentVersion(data.current_version || 1)
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchVersions()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch("/api/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const contentDisposition = response.headers.get("Content-Disposition")
        const filename = contentDisposition?.match(/filename=(.+)/)?.[1] || "kuzu_export.xlsx"
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage({ type: "success", text: "Data exported successfully! Check your downloads folder." })
      } else {
        setMessage({ type: "error", text: "Failed to export data. Please try again." })
      }
    } catch (error) {
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

    const formData = new FormData()
    formData.append("file", file)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage({ 
            type: "success", 
            text: `Data imported successfully! New version: ${result.new_version}` 
          })
          await Promise.all([fetchStats(), fetchVersions()])
        } else {
          setMessage({ type: "error", text: result.message || "Import failed." })
        }
      } else {
        setMessage({ type: "error", text: "Failed to import data. Please check the file format." })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Import failed. Please check your connection." })
    } finally {
      setImporting(false)
      setImportProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRollback = async () => {
    if (selectedVersion === null) return

    setRollingBack(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/versions/rollback/${selectedVersion}`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage({ type: "success", text: `Successfully rolled back to version ${selectedVersion}` })
          await Promise.all([fetchStats(), fetchVersions()])
        } else {
          setMessage({ type: "error", text: result.message || "Rollback failed." })
        }
      } else {
        setMessage({ type: "error", text: "Failed to rollback. Please try again." })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Rollback failed. Please check your connection." })
    } finally {
      setRollingBack(false)
      setRollbackDialogOpen(false)
      setSelectedVersion(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const statCategories = [
    { label: "Customers", key: "Customer", color: "bg-blue-500/20 text-blue-400" },
    { label: "Locations", key: "CustomerLocation", color: "bg-blue-500/20 text-blue-400" },
    { label: "Assemblies", key: "Assembly", color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Parts", key: "Part", color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Warranties", key: "Warranty", color: "bg-purple-500/20 text-purple-400" },
    { label: "Service Records", key: "ServiceRecord", color: "bg-purple-500/20 text-purple-400" },
    { label: "Failures", key: "Failure", color: "bg-red-500/20 text-red-400" },
    { label: "Root Causes", key: "RootCause", color: "bg-red-500/20 text-red-400" },
    { label: "Plants", key: "Plant", color: "bg-amber-500/20 text-amber-400" },
    { label: "Stations", key: "Station", color: "bg-amber-500/20 text-amber-400" },
    { label: "Warehouses", key: "Warehouse", color: "bg-amber-500/20 text-amber-400" },
    { label: "Suppliers", key: "Supplier", color: "bg-cyan-500/20 text-cyan-400" },
    { label: "Supplier POs", key: "SupplierPO", color: "bg-cyan-500/20 text-cyan-400" },
    { label: "Quality Inspections", key: "QualityInspection", color: "bg-green-500/20 text-green-400" },
    { label: "Deviations", key: "Deviation", color: "bg-orange-500/20 text-orange-400" },
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
          Promise.all([fetchStats(), fetchVersions()]).then(() => setLoading(false))
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
              <span className="text-muted-foreground">Current Version</span>
              <Badge variant="secondary" className="text-lg">v{currentVersion}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Available Snapshots</span>
              <Badge variant="outline">{versions.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                stats ? Object.entries(stats)
                  .filter(([key]) => !["current_version", "available_versions"].includes(key))
                  .reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0)
                : 0
              )}
            </div>
            <p className="text-sm text-muted-foreground">across all node tables</p>
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
              <CardTitle>Export Database to Excel</CardTitle>
              <CardDescription>
                Download all graph database data as an Excel file. This file can also be used as a template for importing data.
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
                    Export to Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card className="border-sidebar-border bg-card">
            <CardHeader>
              <CardTitle>Import Data from Excel</CardTitle>
              <CardDescription>
                Upload an Excel file to replace the current database. Use the exported file as a template for the correct format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Importing data will create a backup of the current data as a new version before replacing it. 
                  You can always rollback to a previous version if needed.
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
                  accept=".xlsx,.xls"
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
                          Select Excel File
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-muted-foreground">
                  Supported formats: .xlsx, .xls
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollback" className="mt-4">
          <Card className="border-sidebar-border bg-card">
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                View and restore previous versions of your data. Each import creates a new version snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <History className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p>No version history available yet.</p>
                  <p className="text-sm">Versions are created when you import data.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <TableRow key={version.version}>
                        <TableCell>
                          <Badge variant={version.version === currentVersion - 1 ? "default" : "secondary"}>
                            v{version.version}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(version.created_at)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {version.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVersion(version.version)
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
              {statCategories.map(({ label, key, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Badge className={color}>
                    {stats?.[key as keyof DatabaseStats] ?? 0}
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
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback to version {selectedVersion}? 
              This will replace the current database with the data from that version.
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
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Confirm Rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
