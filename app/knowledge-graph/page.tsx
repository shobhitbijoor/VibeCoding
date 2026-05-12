"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Box,
  Cog,
  Building2,
  Truck,
  Package,
  Users,
  MapPin,
  ShieldCheck,
  FileText,
  Wrench,
  Filter,
  AlertTriangle,
  ClipboardCheck,
  Factory,
  RefreshCw,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

// Node type for the graph visualization
interface GraphNode {
  id: string
  label: string
  nodeType: string
  x: number
  y: number
  properties: Record<string, unknown>
  connections: string[]
}

// API response types
interface ApiNode {
  id: string
  label: string
  properties: Record<string, unknown>
}

interface ApiRelationship {
  id: string
  type: string
  fromId: string
  toId: string
  properties: Record<string, unknown>
}

// Node type mapping for visualization
type NodeDisplayType = "supplier" | "batch" | "component" | "product" | "plant" | "customer" | "site" | "inspection" | "service" | "warranty"

// Map Kuzu labels to display types
const labelToDisplayType: Record<string, NodeDisplayType> = {
  Supplier: "supplier",
  SupplierPO: "batch",
  Part: "component",
  Assembly: "product",
  Plant: "plant",
  Customer: "customer",
  CustomerLocation: "site",
  QualityInspection: "inspection",
  ServiceRecord: "service",
  Warranty: "warranty",
  Deviation: "inspection",
  Failure: "component",
  RootCause: "inspection",
}

// Node type descriptions for the filter
const nodeTypeDescriptions: Record<string, string> = {
  Supplier: "Supplier",
  SupplierPO: "Supplier PO/Lot",
  Part: "Failed Part (Component)",
  Assembly: "Assembly (Product)",
  Plant: "Plant (Assembly Location)",
  Customer: "Customer",
  CustomerLocation: "Customer Site",
  QualityInspection: "Inspection Records",
  ServiceRecord: "Service Records",
  Warranty: "Warranty Records",
}

// Color palette for node types
const nodeColors: Record<NodeDisplayType, { bg: string; border: string; text: string; fill: string; stroke: string; iconColor: string }> = {
  product: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", fill: "#3b82f6", stroke: "#60a5fa", iconColor: "#ffffff" },
  component: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", fill: "#f59e0b", stroke: "#fbbf24", iconColor: "#000000" },
  plant: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", fill: "#10b981", stroke: "#34d399", iconColor: "#ffffff" },
  supplier: { bg: "bg-violet-500/20", border: "border-violet-500/50", text: "text-violet-400", fill: "#8b5cf6", stroke: "#a78bfa", iconColor: "#ffffff" },
  batch: { bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-400", fill: "#f43f5e", stroke: "#fb7185", iconColor: "#ffffff" },
  customer: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400", fill: "#06b6d4", stroke: "#22d3ee", iconColor: "#000000" },
  site: { bg: "bg-teal-500/20", border: "border-teal-500/50", text: "text-teal-400", fill: "#14b8a6", stroke: "#2dd4bf", iconColor: "#000000" },
  warranty: { bg: "bg-indigo-500/20", border: "border-indigo-500/50", text: "text-indigo-400", fill: "#6366f1", stroke: "#818cf8", iconColor: "#ffffff" },
  inspection: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400", fill: "#f97316", stroke: "#fb923c", iconColor: "#000000" },
  service: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-400", fill: "#ec4899", stroke: "#f472b6", iconColor: "#ffffff" },
}

// Icon mapping for each node type
const nodeIcons: Record<NodeDisplayType, typeof Box> = {
  product: Box,
  component: Cog,
  plant: Factory,
  supplier: Truck,
  batch: Package,
  customer: Users,
  site: MapPin,
  warranty: ShieldCheck,
  inspection: ClipboardCheck,
  service: Wrench,
}

export default function KnowledgeGraphPage() {
  // Filter states
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [selectedComponent, setSelectedComponent] = useState<string>("")
  const [selectedSupplierPO, setSelectedSupplierPO] = useState<string>("")
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([])
  const [selectedFailureId, setSelectedFailureId] = useState<string>("")

  // Data states
  const [products, setProducts] = useState<ApiNode[]>([])
  const [customers, setCustomers] = useState<ApiNode[]>([])
  const [suppliers, setSuppliers] = useState<ApiNode[]>([])
  const [components, setComponents] = useState<ApiNode[]>([])
  const [supplierPOs, setSupplierPOs] = useState<ApiNode[]>([])
  const [failures, setFailures] = useState<ApiNode[]>([])
  
  // Graph states
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filtersApplied, setFiltersApplied] = useState(false)
  const [showBOM, setShowBOM] = useState(false)
  const [bomData, setBomData] = useState<ApiNode[]>([])

  // Available node types for the filter
  const availableNodeTypes = [
    "Supplier",
    "SupplierPO",
    "Part",
    "Assembly",
    "Plant",
    "Customer",
    "CustomerLocation",
    "QualityInspection",
    "ServiceRecord",
    "Warranty",
  ]

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/graph')
        const data = await response.json()
        
        if (data.nodes) {
          const nodes = data.nodes as ApiNode[]
          setProducts(nodes.filter(n => n.label === 'Assembly'))
          setCustomers(nodes.filter(n => n.label === 'Customer'))
          setSuppliers(nodes.filter(n => n.label === 'Supplier'))
          setComponents(nodes.filter(n => n.label === 'Part'))
          setSupplierPOs(nodes.filter(n => n.label === 'SupplierPO'))
          setFailures(nodes.filter(n => n.label === 'Failure'))
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }
    
    fetchFilterOptions()
  }, [])

  // Calculate node positions in a force-directed-like layout
  const calculateNodePositions = useCallback((nodes: ApiNode[], relationships: ApiRelationship[]): GraphNode[] => {
    if (nodes.length === 0) return []

    // Group nodes by type for layered layout
    const nodesByType: Record<string, ApiNode[]> = {}
    nodes.forEach(node => {
      const type = node.label
      if (!nodesByType[type]) nodesByType[type] = []
      nodesByType[type].push(node)
    })

    // Define layer order (left to right)
    const layerOrder = [
      'Supplier',
      'SupplierPO',
      'Part',
      'Plant',
      'Assembly',
      'Customer',
      'CustomerLocation',
      'QualityInspection',
      'ServiceRecord',
      'Warranty',
    ]

    // Calculate positions
    const graphNodes: GraphNode[] = []
    const viewWidth = 900
    const viewHeight = 500
    const padding = 80
    
    // Get active layers (layers that have nodes)
    const activeLayers = layerOrder.filter(type => nodesByType[type]?.length > 0)
    const layerWidth = (viewWidth - 2 * padding) / Math.max(activeLayers.length - 1, 1)

    // Build connection map for each node
    const connectionMap: Record<string, string[]> = {}
    nodes.forEach(node => {
      connectionMap[node.id] = []
    })
    relationships.forEach(rel => {
      if (connectionMap[rel.fromId]) {
        connectionMap[rel.fromId].push(rel.toId)
      }
      if (connectionMap[rel.toId]) {
        connectionMap[rel.toId].push(rel.fromId)
      }
    })

    activeLayers.forEach((type, layerIndex) => {
      const layerNodes = nodesByType[type] || []
      const layerHeight = (viewHeight - 2 * padding) / Math.max(layerNodes.length - 1, 1)
      
      layerNodes.forEach((node, nodeIndex) => {
        const x = padding + layerIndex * layerWidth
        const y = layerNodes.length === 1 
          ? viewHeight / 2 
          : padding + nodeIndex * layerHeight

        // Get display label
        let displayLabel = ''
        if (node.properties.name) {
          displayLabel = String(node.properties.name)
        } else if (node.properties.serialNumber) {
          displayLabel = String(node.properties.serialNumber)
        } else if (node.properties.poNumber) {
          displayLabel = String(node.properties.poNumber)
        } else if (node.properties.partNumber) {
          displayLabel = String(node.properties.partNumber)
        } else if (node.properties.inspectionId) {
          displayLabel = String(node.properties.inspectionId)
        } else if (node.properties.warrantyId) {
          displayLabel = String(node.properties.warrantyId)
        } else if (node.properties.serviceId) {
          displayLabel = String(node.properties.serviceId)
        } else {
          displayLabel = node.id
        }

        graphNodes.push({
          id: node.id,
          label: displayLabel,
          nodeType: node.label,
          x,
          y,
          properties: node.properties,
          connections: connectionMap[node.id] || [],
        })
      })
    })

    return graphNodes
  }, [])

  // Apply filters and fetch graph data
  const handleApplyFilters = useCallback(async () => {
    setIsLoading(true)
    setFiltersApplied(true)
    
    try {
      // Build query parameters based on filters
      const params = new URLSearchParams()
      
      if (selectedProduct) params.append('assemblyId', selectedProduct)
      if (selectedCustomer) params.append('customerId', selectedCustomer)
      if (selectedSupplier) params.append('supplierId', selectedSupplier)
      if (selectedComponent) params.append('partId', selectedComponent)
      if (selectedSupplierPO) params.append('poId', selectedSupplierPO)
      if (selectedFailureId) params.append('failureId', selectedFailureId)
      if (selectedNodeTypes.length > 0) params.append('nodeTypes', selectedNodeTypes.join(','))

      const response = await fetch(`/api/graph/query?${params.toString()}`)
      const data = await response.json()

      if (data.nodes && data.relationships) {
        const positions = calculateNodePositions(data.nodes, data.relationships)
        setGraphNodes(positions)
      }
    } catch (error) {
      console.error('Error fetching graph data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProduct, selectedCustomer, selectedSupplier, selectedComponent, selectedSupplierPO, selectedNodeTypes, selectedFailureId, calculateNodePositions])

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSelectedProduct("")
    setSelectedCustomer("")
    setSelectedSupplier("")
    setSelectedComponent("")
    setSelectedSupplierPO("")
    setSelectedNodeTypes([])
    setSelectedFailureId("")
    setGraphNodes([])
    setFiltersApplied(false)
    setSelectedNode(null)
  }, [])

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
  }, [])

  // Handle connected node click
  const handleConnectionClick = useCallback((nodeId: string) => {
    const node = graphNodes.find((n) => n.id === nodeId)
    if (node) {
      setSelectedNode(node)
    }
  }, [graphNodes])

  // Handle view BOM
  const handleViewBOM = useCallback(async (assemblyId: string) => {
    try {
      const response = await fetch(`/api/graph/bom?assemblyId=${assemblyId}`)
      const data = await response.json()
      if (data.parts) {
        setBomData(data.parts)
        setShowBOM(true)
      }
    } catch (error) {
      console.error('Error fetching BOM:', error)
    }
  }, [])

  // Toggle node type selection
  const toggleNodeType = useCallback((nodeType: string) => {
    setSelectedNodeTypes(prev => 
      prev.includes(nodeType) 
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
    )
  }, [])

  // Get unique node types in the current graph
  const usedNodeTypes = useMemo(() => {
    const types = new Set(graphNodes.map(n => labelToDisplayType[n.nodeType] || "component"))
    return Array.from(types) as NodeDisplayType[]
  }, [graphNodes])

  // Check if any filter is selected
  const hasFiltersSelected = selectedProduct || selectedCustomer || selectedSupplier || 
    selectedComponent || selectedSupplierPO || selectedNodeTypes.length > 0 || selectedFailureId

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore manufacturing traceability through the graph database
        </p>
      </div>

      {/* Filters Card */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-7 gap-4">
            {/* Product Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {String(p.properties.serialNumber || p.properties.assemblyNumber || p.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {String(c.properties.name || c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {String(s.properties.name || s.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Component Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Component</Label>
              <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  {components.slice(0, 50).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {String(c.properties.partNumber || c.id)} - {String(c.properties.name || '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier PO Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier PO</Label>
              <Select value={selectedSupplierPO} onValueChange={setSelectedSupplierPO}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All POs</SelectItem>
                  {supplierPOs.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {String(po.properties.poNumber || po.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Failure ID Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Failure ID</Label>
              <Select value={selectedFailureId} onValueChange={setSelectedFailureId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select failure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Failures</SelectItem>
                  {failures.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {String(f.properties.failureId || f.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply Filters Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Button 
                onClick={handleApplyFilters} 
                disabled={!hasFiltersSelected || isLoading}
                className="h-8 text-xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Apply Filters"
                )}
              </Button>
            </div>
          </div>

          {/* Node Types Selection */}
          <div className="mt-4 pt-4 border-t border-border">
            <Label className="text-xs mb-2 block">Node Types to Display</Label>
            <div className="flex flex-wrap gap-2">
              {availableNodeTypes.map(nodeType => (
                <Badge
                  key={nodeType}
                  variant="outline"
                  className={cn(
                    "text-xs cursor-pointer transition-colors",
                    selectedNodeTypes.includes(nodeType)
                      ? "bg-primary/20 border-primary text-primary"
                      : "hover:bg-secondary"
                  )}
                  onClick={() => toggleNodeType(nodeType)}
                >
                  {nodeTypeDescriptions[nodeType] || nodeType}
                </Badge>
              ))}
            </div>
          </div>

          {/* Reset Filters */}
          {filtersApplied && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs">
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graph Visualization */}
      {!filtersApplied ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Filters Applied</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Please select at least one filter above and click &quot;Apply Filters&quot; to view the knowledge graph.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-4">
              {/* Graph Area */}
              <div className="col-span-3">
                <div className="relative bg-secondary/30 rounded-lg border border-border h-[500px] overflow-hidden">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : graphNodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No nodes found for the selected filters</p>
                    </div>
                  ) : (
                    <svg width="100%" height="100%" viewBox="0 0 900 500">
                      {/* Connections */}
                      {graphNodes.map((node) =>
                        node.connections.map((connId) => {
                          const targetNode = graphNodes.find((n) => n.id === connId)
                          if (!targetNode || node.id > connId) return null
                          
                          const isHighlighted = 
                            selectedNode?.id === node.id || 
                            selectedNode?.id === connId ||
                            !selectedNode

                          return (
                            <line
                              key={`${node.id}-${connId}`}
                              x1={node.x}
                              y1={node.y}
                              x2={targetNode.x}
                              y2={targetNode.y}
                              stroke="currentColor"
                              strokeWidth={isHighlighted ? 2 : 1}
                              className={cn(
                                "transition-opacity",
                                isHighlighted ? "text-muted-foreground/40" : "text-border opacity-20"
                              )}
                            />
                          )
                        })
                      )}

                      {/* Nodes */}
                      {graphNodes.map((node) => {
                        const displayType = labelToDisplayType[node.nodeType] || "component"
                        const colors = nodeColors[displayType]
                        const IconComponent = nodeIcons[displayType]
                        const isSelected = selectedNode?.id === node.id
                        const isConnected = selectedNode?.connections.includes(node.id)
                        const isFaded = selectedNode && !isSelected && !isConnected
                        const size = isSelected ? 28 : 24
                        const outerSize = isSelected ? 32 : 28

                        return (
                          <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            onClick={() => handleNodeClick(node)}
                            className="cursor-pointer"
                            style={{ opacity: isFaded ? 0.3 : 1 }}
                          >
                            {/* Outer border/glow */}
                            <rect
                              x={-outerSize}
                              y={-outerSize}
                              width={outerSize * 2}
                              height={outerSize * 2}
                              rx={10}
                              ry={10}
                              fill="var(--card)"
                              stroke={colors.stroke}
                              strokeWidth={2}
                              className="transition-all"
                            />
                            {/* Inner colored fill */}
                            <rect
                              x={-size}
                              y={-size}
                              width={size * 2}
                              height={size * 2}
                              rx={8}
                              ry={8}
                              fill={colors.fill}
                              className="transition-all"
                            />
                            {/* Icon */}
                            <foreignObject
                              x={-12}
                              y={-12}
                              width={24}
                              height={24}
                              className="pointer-events-none"
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <IconComponent 
                                  size={16} 
                                  color={colors.iconColor}
                                  strokeWidth={2}
                                />
                              </div>
                            </foreignObject>
                            {/* Label below node */}
                            <text
                              textAnchor="middle"
                              y={outerSize + 14}
                              className="text-[9px] font-medium fill-foreground pointer-events-none"
                            >
                              {node.label.length > 16 
                                ? node.label.substring(0, 14) + "..."
                                : node.label
                              }
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  )}
                </div>

                {/* Legend */}
                {graphNodes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {usedNodeTypes.map((type) => {
                      const colors = nodeColors[type]
                      const IconComponent = nodeIcons[type]
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center"
                            style={{ backgroundColor: colors.fill }}
                          >
                            <IconComponent size={12} color={colors.iconColor} strokeWidth={2} />
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{type}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Details Panel */}
              <div className="col-span-2">
                <div className="bg-secondary/30 rounded-lg border border-border h-[500px] p-3 overflow-auto">
                  {selectedNode ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: nodeColors[labelToDisplayType[selectedNode.nodeType] || "component"].fill }}
                          >
                            {(() => {
                              const displayType = labelToDisplayType[selectedNode.nodeType] || "component"
                              const IconComponent = nodeIcons[displayType]
                              return <IconComponent size={14} color={nodeColors[displayType].iconColor} strokeWidth={2} />
                            })()}
                          </div>
                          <h4 className="text-sm font-medium">{selectedNode.label}</h4>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            nodeColors[labelToDisplayType[selectedNode.nodeType] || "component"].bg,
                            nodeColors[labelToDisplayType[selectedNode.nodeType] || "component"].text,
                            nodeColors[labelToDisplayType[selectedNode.nodeType] || "component"].border
                          )}
                        >
                          {selectedNode.nodeType}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Properties</p>
                        <div className="space-y-1.5">
                          {Object.entries(selectedNode.properties).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{key}</span>
                              <span className="font-medium text-right max-w-[60%] truncate">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedNode.connections.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Connected Nodes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedNode.connections.map((connId) => {
                              const connNode = graphNodes.find((n) => n.id === connId)
                              if (!connNode) return null
                              const connDisplayType = labelToDisplayType[connNode.nodeType] || "component"
                              const connColors = nodeColors[connDisplayType]
                              const ConnIcon = nodeIcons[connDisplayType]
                              return (
                                <Badge
                                  key={connId}
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] cursor-pointer hover:bg-secondary gap-1",
                                    connColors.border
                                  )}
                                  onClick={() => handleConnectionClick(connId)}
                                >
                                  <ConnIcon size={10} className={connColors.text} />
                                  {connNode.label.length > 12 ? connNode.label.substring(0, 10) + "..." : connNode.label}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* View BOM button for Assembly nodes */}
                      {selectedNode.nodeType === "Assembly" && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs p-0 h-auto text-primary"
                          onClick={() => handleViewBOM(selectedNode.id)}
                        >
                          View Bill of Materials (BOM)
                        </Button>
                      )}

                      {/* View Inspection Records button for inspection nodes */}
                      {selectedNode.nodeType === "QualityInspection" && (
                        <Button
                          size="sm"
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          View Inspection Records
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        Click a node to view details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM Dialog */}
      <Dialog open={showBOM} onOpenChange={setShowBOM}>
        <DialogContent className="max-w-[85vw] w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Bill of Materials</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Part Number</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Material</TableHead>
                    <TableHead className="text-xs">Lot Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomData.map((part, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs font-mono">{String(part.properties.partNumber || '-')}</TableCell>
                      <TableCell className="text-xs">{String(part.properties.name || '-')}</TableCell>
                      <TableCell className="text-xs">{String(part.properties.category || '-')}</TableCell>
                      <TableCell className="text-xs">{String(part.properties.material || '-')}</TableCell>
                      <TableCell className="text-xs font-mono">{String(part.properties.lotNumber || '-')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
