"use client"

import { AlertTriangle, Zap, MapPin, Clock, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AlertCardProps {
  onClick: () => void
  isClicked: boolean
  onStartAnalysis: () => void
}

export function AlertCard({ onClick, isClicked, onStartAnalysis }: AlertCardProps) {
  return (
    <Card 
      className={cn(
        "mb-4 cursor-pointer transition-all border-warning/50 bg-warning/5 hover:bg-warning/10",
        isClicked && "ring-2 ring-warning"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                Critical Alert
              </Badge>
              <Badge variant="outline" className="text-xs">
                IoT Sensor
              </Badge>
            </div>
            
            <h3 className="font-semibold text-foreground mb-1 text-balance">
              Voltage Spike Detected in CENTUM Series Generator Sets
            </h3>
            
            <p className="text-sm text-muted-foreground mb-3">
              Anomaly detected in CENTUM 17L units (600KW-1000KW) linked to Stamford S-Range Alternator component. 
              Immediate investigation required for healthcare facilities in Iowa.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-warning" />
                <span>Voltage: +15.3% deviation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Mercy Hills Medical Center, Iowa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>2 minutes ago</span>
              </div>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
        
        {isClicked && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                onStartAnalysis()
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Analyze Alert
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
