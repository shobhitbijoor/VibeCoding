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

// Helper function to extract city from address
const extractCityFromAddress = (address: string): string => {
  // Address format: "123 Industrial Blvd, Detroit, MI 48201"
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[1].trim() // Return the city part
  }
  return address.split(' ')[0] // Fallback to first word
}

// Helper function to get display label for a node
const getNodeDisplayLabel = (node: ApiNode): string => {
  const props = node.properties
  
  switch (node.label) {
    case 'CustomerLocation':
      // Use siteName but extract city if it's a plant-like name, or use address city
      if (props.siteName) {
        const siteName = String(props.siteName)
        // If siteName contains city info, extract it
        if (siteName.includes('Plant') || siteName.includes('Factory') || siteName.includes('Center')) {
          // Extract city from siteName (e.g., "Detroit Plant" -> "Detroit")
          return siteName.replace(/ (Plant|Factory|Center|Facility|HQ|R&D|Assembly|MRO|Gigafactory|Service|Cleanroom|Manufacturing|Processing|Mine|Fab|Test|Depot|Wind|Solar|Battery).*$/i, '').trim()
        }
        return siteName
      }
      if (props.address) {
        return extractCityFromAddress(String(props.address))
      }
      return node.id
      
    case 'QualityInspection':
      // Show inspection type instead of part/serial number
      if (props.type) {
        return String(props.type)
      }
      if (props.stage) {
        return `${String(props.stage)} Inspection`
      }
      return 'Inspection'
      
    case 'ServiceRecord':
      // Show service type
      if (props.type) {
        return String(props.type)
      }
      if (props.serviceId) {
        return String(props.serviceId)
      }
      return 'Service'
      
    case 'Warranty':
      if (props.type) {
        return `${String(props.type)} Warranty`
      }
      if (props.warrantyId) {
        return String(props.warrantyId)
      }
      return 'Warranty'
      
    case 'Customer':
      return props.name ? String(props.name) : node.id
      
    case 'Supplier':
      return props.name ? String(props.name) : node.id
      
    case 'Assembly':
      // Prefer name over serial number for readability
      if (props.name) {
        return String(props.name)
      }
      return props.serialNumber ? String(props.serialNumber) : node.id
      
    case 'Part':
      if (props.name) {
        return String(props.name)
      }
      return props.partNumber ? String(props.partNumber) : node.id
      
    case 'SupplierPO':
      return props.poNumber ? String(props.poNumber) : node.id
      
    case 'Plant':
      if (props.name) {
        // Extract plant location (e.g., "Detroit Manufacturing Hub" -> "Detroit Mfg")
        const name = String(props.name)
        return name.length > 15 ? name.substring(0, 12) + '...' : name
      }
      return props.plantCode ? String(props.plantCode) : node.id
      
    case 'Deviation':
      // Show deviation type (Material, Process, Installation, etc.)
      if (props.type) {
        return `${String(props.type)} Deviation`
      }
      if (props.deviationId) {
        return String(props.deviationId)
      }
      return 'Deviation'
      
    case 'RootCause':
      if (props.category) {
        return String(props.category)
      }
      if (props.causeId) {
        return String(props.causeId)
      }
      return 'Root Cause'
      
    case 'Failure':
      if (props.failureId) {
        return String(props.failureId)
      }
      return 'Failure'
      
    default:
      return props.name ? String(props.name) : node.id
  }
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

  // Calculate node positions with clean grid-based hierarchical layout
  // Layout follows a strict grid to avoid diagonal edges and overlapping
  const calculateNodePositions = useCallback((nodes: ApiNode[], relationships: ApiRelationship[]): GraphNode[] => {
    if (nodes.length === 0) return []

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

    // Group nodes by type
    const nodesByType: Record<string, ApiNode[]> = {}
    nodes.forEach(node => {
      const type = node.label
      if (!nodesByType[type]) nodesByType[type] = []
      nodesByType[type].push(node)
    })

    const graphNodes: GraphNode[] = []
    
    // Grid layout configuration - larger spacing for bigger viewport (1200x700)
    const colWidth = 150  // Horizontal spacing between columns
    const rowHeight = 120 // Vertical spacing between rows
    const startX = 100
    const startY = 120
    
    // Define column positions (left to right flow)
    const columns = {
      supplier: 0,
      supplierPO: 1,
      part: 2,
      plant: 3,
      assembly: 4,
      customer: 5,
      warranty: 6,
    }
    
    // Define row positions (center row is 2, top is 0, bottom is 4+)
    const rows = {
      top: 0,
      upperMiddle: 1,
      center: 2,
      lowerMiddle: 3,
      bottom: 4,
    }

    // Position each node based on its type
    const positionedNodes: Record<string, { x: number; y: number }> = {}
    
    // Helper to calculate x,y from column and row
    const getPos = (col: number, row: number) => ({
      x: startX + col * colWidth,
      y: startY + row * rowHeight
    })

    // ROW 2 (CENTER) - Main supply chain flow: Supplier -> PO -> Part -> Plant -> Assembly -> Customer -> Warranty
    
    // Supplier (column 0, center row)
    if (nodesByType['Supplier']) {
      nodesByType['Supplier'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.supplier, rows.center + idx)
      })
    }

    // SupplierPO (column 1, center row)
    if (nodesByType['SupplierPO']) {
      nodesByType['SupplierPO'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.supplierPO, rows.center + idx)
      })
    }

    // Part (column 2, center row)
    if (nodesByType['Part']) {
      nodesByType['Part'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.part, rows.center + idx)
      })
    }

    // Plant (column 3, center row - slightly above if there's space)
    if (nodesByType['Plant']) {
      nodesByType['Plant'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.plant, rows.center)
      })
    }

    // Assembly (column 4, center row)
    if (nodesByType['Assembly']) {
      nodesByType['Assembly'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.assembly, rows.center)
      })
    }

    // Customer (column 5, upper middle - directly above CustomerLocation)
    if (nodesByType['Customer']) {
      nodesByType['Customer'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.customer, rows.upperMiddle)
      })
    }

    // CustomerLocation (column 5, center - below Customer, same column for vertical alignment)
    if (nodesByType['CustomerLocation']) {
      nodesByType['CustomerLocation'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.customer, rows.center)
      })
    }

    // Warranty (column 6, upper middle - same row as Customer for horizontal alignment)
    if (nodesByType['Warranty']) {
      nodesByType['Warranty'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.warranty, rows.upperMiddle + idx)
      })
    }

    // ROW 0-1 (TOP) - Inspections related to receiving and assembly (above the main flow)
    if (nodesByType['QualityInspection']) {
      const receivingInspections: ApiNode[] = []
      const assemblyInspections: ApiNode[] = []
      const commissioningInspections: ApiNode[] = []

      nodesByType['QualityInspection'].forEach(node => {
        const stage = String(node.properties.stage || '').toLowerCase()
        const type = String(node.properties.type || '').toLowerCase()
        
        if (stage === 'receiving' || type.includes('incoming')) {
          receivingInspections.push(node)
        } else if (stage === 'assembly' || type.includes('in-process')) {
          assemblyInspections.push(node)
        } else if (stage === 'commissioning' || type.includes('commissioning')) {
          commissioningInspections.push(node)
        }
      })

      // Receiving inspections - directly above Part (column 2, row 0-1)
      receivingInspections.forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.part, rows.top + idx)
      })

      // Assembly inspections - directly above Assembly (column 4, row 0-1)
      assemblyInspections.forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.assembly, rows.top + idx)
      })

      // Commissioning inspections - below CustomerLocation (column 5, row 3-4)
      commissioningInspections.forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.customer, rows.lowerMiddle + idx)
      })
    }

    // ROW 3-4 (BOTTOM) - Service records below Assembly (spread horizontally if multiple)
    if (nodesByType['ServiceRecord']) {
      const numServices = nodesByType['ServiceRecord'].length
      // Place service records below assembly, spread horizontally
      nodesByType['ServiceRecord'].forEach((node, idx) => {
        // Center the service records around the assembly column
        const offset = idx - Math.floor(numServices / 2)
        const col = Math.max(0, columns.assembly + offset)
        positionedNodes[node.id] = getPos(col, rows.lowerMiddle)
      })
    }

    // Deviation nodes - place near the related part (column 2, row 3)
    if (nodesByType['Deviation']) {
      nodesByType['Deviation'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.part, rows.lowerMiddle + idx)
      })
    }

    // RootCause nodes - place near deviation (column 1, row 3)
    if (nodesByType['RootCause']) {
      nodesByType['RootCause'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.supplierPO, rows.lowerMiddle + idx)
      })
    }

    // Failure nodes - place near assembly (column 4, row 3)
    if (nodesByType['Failure']) {
      nodesByType['Failure'].forEach((node, idx) => {
        positionedNodes[node.id] = getPos(columns.assembly, rows.bottom + idx)
      })
    }

    // Create GraphNode objects with calculated positions
    nodes.forEach(node => {
      const pos = positionedNodes[node.id] || getPos(columns.assembly, rows.center)
      
      graphNodes.push({
        id: node.id,
        label: getNodeDisplayLabel(node),
        nodeType: node.label,
        x: pos.x,
        y: pos.y,
        properties: node.properties,
        connections: connectionMap[node.id] || [],
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
            <div className="grid grid-cols-6 gap-3">
              {/* Graph Area */}
              <div className="col-span-5">
                <div className="relative bg-secondary/30 rounded-lg border border-border h-[600px] overflow-auto">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : graphNodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No nodes found for the selected filters</p>
                    </div>
                  ) : (
                    <svg width="1200" height="700" viewBox="0 0 1200 700" className="min-w-[1200px] min-h-[700px]">
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
              <div className="col-span-1">
                <div className="bg-secondary/30 rounded-lg border border-border h-[600px] p-3 overflow-auto">
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
