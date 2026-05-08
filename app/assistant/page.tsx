"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Copy, Download, ChevronDown, ChevronRight, Sparkles, MessageSquarePlus, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
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

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: "New Conversation",
      messages: [],
      createdAt: new Date()
    }
    setConversations(prev => [newConversation, ...prev].slice(0, 20))
    setActiveConversationId(newConversation.id)
    setShowHistory(false)
  }

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading) return

    // Create conversation if none exists
    let conversationId = activeConversationId
    if (!conversationId) {
      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: query.slice(0, 50),
        messages: [],
        createdAt: new Date()
      }
      setConversations(prev => [newConversation, ...prev].slice(0, 20))
      conversationId = newConversation.id
      setActiveConversationId(conversationId)
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date()
    }

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, userMessage]
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.messages.length === 0 ? query.slice(0, 50) : conv.title
        }
      }
      return conv
    }))
    
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

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, assistantMessage]
        }
      }
      return conv
    }))
    
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

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation History Sidebar */}
      <div className={cn(
        "w-64 border-r border-border bg-card flex flex-col transition-all duration-200",
        showHistory ? "translate-x-0" : "-translate-x-full absolute md:relative md:translate-x-0"
      )}>
        <div className="p-4 border-b border-border">
          <Button onClick={createNewConversation} className="w-full gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            New Conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id)
                  setShowHistory(false)
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm truncate",
                  "hover:bg-secondary transition-colors",
                  activeConversationId === conv.id && "bg-secondary"
                )}
              >
                {conv.title}
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">AI Assistant</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground hidden md:block">
            Query the Knowledge Fabric for equipment traceability and cohort risk analysis
          </p>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Knowledge Fabric AI Assistant</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Ask me about equipment traceability, supplier information, service history, 
                  warranty details, quality inspections, or cohort risk analysis.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
                  Try asking
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(prompt)}
                      className="text-sm px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
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
                      "max-w-[85%] rounded-lg p-4",
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
                      <div className="mt-3 pt-3 border-t border-border/50">
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
                          <ul className="mt-2 space-y-1">
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
                  <div className="bg-secondary rounded-lg p-4">
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
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about traceability, service history, warranties, cohort risk..."
              className="min-h-[52px] max-h-[120px] resize-none"
              aria-label="Ask the AI Assistant"
            />
            <Button 
              onClick={() => handleSubmit(input)} 
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[52px] w-[52px]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

// Table Data Types
interface TableData {
  headers: string[]
  rows: string[][]
}

function ResponseTable({ data }: { data: TableData }) {
  return (
    <Card className="mt-4 bg-background/50">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {data.headers.map((header, idx) => (
                  <th key={idx} scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/50 last:border-0">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export CSV
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
    <Card className="mt-4 bg-background/50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {data.events.map((event, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary" />
                {idx < data.events.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{event.type || event.stage}</span>
                  {event.result && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
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
                  <p className="text-sm mt-2">{event.findings || event.details}</p>
                )}
                {event.partsReplaced && event.partsReplaced.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {event.partsReplaced.map((part, pIdx) => (
                      <Badge key={pIdx} variant="secondary" className="text-xs">
                        {part}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
