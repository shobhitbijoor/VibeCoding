"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Check } from "lucide-react"

const warrantyClaims = [
  {
    id: "WC-001",
    facility: "Mercy Hills Medical Center",
    unit: "CENTUM 17L-750KW",
    serialNumber: "CTM-17L-2024-0892",
    warrantyStatus: "Active",
    expiryDate: "Jul 10, 2027",
    estimatedClaim: "$18,500",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
  {
    id: "WC-002",
    facility: "Iowa Heart Hospital",
    unit: "CENTUM 17L-600KW",
    serialNumber: "CTM-17L-2024-0915",
    warrantyStatus: "Active",
    expiryDate: "Aug 15, 2027",
    estimatedClaim: "$15,200",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
  {
    id: "WC-003",
    facility: "Cedar Rapids Regional",
    unit: "CENTUM 17L-850KW",
    serialNumber: "CTM-17L-2024-0878",
    warrantyStatus: "Active",
    expiryDate: "Jun 28, 2027",
    estimatedClaim: "$21,800",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
  {
    id: "WC-004",
    facility: "Des Moines General",
    unit: "CENTUM 17L-750KW",
    serialNumber: "CTM-17L-2024-0934",
    warrantyStatus: "Active",
    expiryDate: "Sep 05, 2027",
    estimatedClaim: "$18,500",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
  {
    id: "WC-005",
    facility: "Dubuque Medical Center",
    unit: "CENTUM 17L-600KW",
    serialNumber: "CTM-17L-2024-0856",
    warrantyStatus: "Extended",
    expiryDate: "Jun 15, 2028",
    estimatedClaim: "$15,200",
    coverage: "Parts Only",
    supplier: "Stamford",
  },
  {
    id: "WC-006",
    facility: "Sioux City Healthcare",
    unit: "CENTUM 17L-1000KW",
    serialNumber: "CTM-17L-2024-0967",
    warrantyStatus: "Active",
    expiryDate: "Oct 20, 2027",
    estimatedClaim: "$24,500",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
  {
    id: "WC-007",
    facility: "Waterloo Memorial",
    unit: "CENTUM 17L-750KW",
    serialNumber: "CTM-17L-2024-0823",
    warrantyStatus: "Active",
    expiryDate: "May 22, 2027",
    estimatedClaim: "$18,500",
    coverage: "Full Parts & Labor",
    supplier: "Stamford",
  },
]

const totalEstimatedValue = warrantyClaims.reduce(
  (sum, claim) => sum + parseFloat(claim.estimatedClaim.replace(/[$,]/g, "")),
  0
)

export function WarrantyClaimsList() {
  const [submittedClaims, setSubmittedClaims] = useState<Set<string>>(new Set())

  const handleSubmitClaim = (claimId: string) => {
    setSubmittedClaims(prev => new Set(prev).add(claimId))
  }

  const handleSubmitAll = () => {
    setSubmittedClaims(new Set(warrantyClaims.map(c => c.id)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Potential warranty claims for affected units with manufacturer defect coverage
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Estimated Value</p>
            <p className="text-lg font-bold text-foreground">
              ${totalEstimatedValue.toLocaleString()}
            </p>
          </div>
          <Button 
            onClick={handleSubmitAll}
            disabled={submittedClaims.size === warrantyClaims.length}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit All Claims
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Facility</TableHead>
              <TableHead className="text-xs">Unit</TableHead>
              <TableHead className="text-xs">Serial Number</TableHead>
              <TableHead className="text-xs">Supplier</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Coverage</TableHead>
              <TableHead className="text-xs text-right">Est. Claim</TableHead>
              <TableHead className="text-xs text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warrantyClaims.map((claim) => {
              const isSubmitted = submittedClaims.has(claim.id)
              return (
                <TableRow key={claim.id}>
                  <TableCell className="text-xs font-medium">{claim.facility}</TableCell>
                  <TableCell className="text-xs">{claim.unit}</TableCell>
                  <TableCell className="text-xs font-mono">{claim.serialNumber}</TableCell>
                  <TableCell className="text-xs">{claim.supplier}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        claim.warrantyStatus === "Active"
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-primary/10 text-primary border-primary/30"
                      }`}
                    >
                      {claim.warrantyStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{claim.coverage}</TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {claim.estimatedClaim}
                  </TableCell>
                  <TableCell className="text-center">
                    {isSubmitted ? (
                      <Badge className="bg-success/20 text-success border-success/30 text-[10px]">
                        <Check className="w-3 h-3 mr-1" />
                        Submitted
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs border-primary text-primary hover:bg-primary/10"
                        onClick={() => handleSubmitClaim(claim.id)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Submit Claim
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="bg-secondary/50 rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> These are potential warranty claims pending formal assessment. 
          All claims are subject to manufacturer review and approval based on defect verification 
          and warranty terms.
        </p>
      </div>
    </div>
  )
}
