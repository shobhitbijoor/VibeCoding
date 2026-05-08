"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Copy, Download, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { 
  suggestedPrompts, 
  findMatchingResponse, 
  getDefaultResponse,
  type AIResponse 
} from "@/data/ai-responses"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  response?: AIResponse
  timestamp: Date
}

interface AIAssistantPanelProps {
  isOpen: boolean
  onClose: () => void
  issueContext?: string | null
}

export function AIAssistantPanel({ isOpen, onClose, issueContext }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))

    const matchedResponse = findMatchingResponse(query) || getDefaultResponse()
    
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: matchedResponse.response,
      response: matchedResponse,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(input)
    }
  }

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const clearContext = () => {
    setMessages([])
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-[800] transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[400px] bg-background border-l border-border z-[850]",
          "flex flex-col transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Context Banner */}
        {issueContext && (
          <div className="px-4 py-2 bg-primary/10 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Context:</span>
              <Badge variant="outline">{issueContext}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearContext} className="text-xs h-7">
              Clear
            </Button>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                Ask me about equipment traceability, service history, warranty details, or cohort risk analysis.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested queries
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.slice(0, 6).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(prompt)}
                      className="text-xs px-3 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Render data cards for assistant messages */}
                    {message.response?.type === "table" && message.response.data && (
                      <ResponseTable data={message.response.data as TableData} />
                    )}
                    
                    {message.response?.type === "timeline" && message.response.data && (
                      <ResponseTimeline data={message.response.data as TimelineData} />
                    )}

                    {/* Sources */}
                    {message.response?.sources && message.response.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <button
                          onClick={() => toggleSources(message.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedSources.has(message.id) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          Sources ({message.response.sources.length})
                        </button>
                        {expandedSources.has(message.id) && (
                          <ul className="mt-1 space-y-1">
                            {message.response.sources.map((source, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground pl-4">
                                • {source}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about traceability, service history, warranties..."
              className="min-h-[44px] max-h-[120px] resize-none"
              aria-label="Ask the AI Assistant"
            />
            <Button 
              onClick={() => handleSubmit(input)} 
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}

// Table Data Types
interface TableData {
  headers: string[]
  rows: string[][]
}

function ResponseTable({ data }: { data: TableData }) {
  return (
    <Card className="mt-3 bg-background/50">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {data.headers.map((header, idx) => (
                  <th key={idx} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/50 last:border-0">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 p-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Timeline Data Types
interface TimelineEvent {
  date: string
  type?: string
  stage?: string
  technician?: string
  inspector?: string
  findings?: string
  details?: string
  result?: string
  partsReplaced?: string[]
}

interface TimelineData {
  events: TimelineEvent[]
}

function ResponseTimeline({ data }: { data: TimelineData }) {
  return (
    <Card className="mt-3 bg-background/50">
      <CardContent className="p-3">
        <div className="space-y-3">
          {data.events.map((event, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {idx < data.events.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{event.type || event.stage}</span>
                  {event.result && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px]",
                        event.result.includes("Pass") ? "border-success text-success" : ""
                      )}
                    >
                      {event.result}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{event.date}</p>
                {(event.technician || event.inspector) && (
                  <p className="text-xs text-muted-foreground">
                    By: {event.technician || event.inspector}
                  </p>
                )}
                {(event.findings || event.details) && (
                  <p className="text-xs mt-1">{event.findings || event.details}</p>
                )}
                {event.partsReplaced && event.partsReplaced.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.partsReplaced.map((part, pIdx) => (
                      <Badge key={pIdx} variant="secondary" className="text-[10px]">
                        {part}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
