"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  Database, 
  Loader2,
  Trash2,
  Key,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

// Available LLM models
const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", requiresKey: false },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", requiresKey: false },
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", requiresKey: false },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", requiresKey: false },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "Anthropic", requiresKey: false },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", requiresKey: false },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", requiresKey: false },
]

// Example questions for users
const EXAMPLE_QUESTIONS = [
  "Show me all customers in the database",
  "What assemblies does Acme Corporation have?",
  "List all parts supplied by Precision Parts Inc",
  "Show me the bill of materials for assembly ASM-2024-001",
  "What are the recent failures and their root causes?",
  "Which parts are currently in stock?",
  "Show me the service history for all assemblies",
  "What is the warranty status of our assemblies?",
  "Trace the lineage of part PN-MOTOR-001",
  "Give me statistics about the graph database",
]

export default function CopilotPage() {
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)
  const [apiKey, setApiKey] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Create transport with selected model
  const transport = new DefaultChatTransport({
    api: "/api/copilot",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        messages,
        id,
        model: selectedModel,
        apiKey: apiKey || undefined,
      },
    }),
  })

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: "copilot-session",
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleExampleClick = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const clearChat = () => {
    setMessages([])
  }

  const getMessageText = (message: typeof messages[0]): string => {
    if (!message.parts || !Array.isArray(message.parts)) return ""
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
  }

  const hasToolCalls = (message: typeof messages[0]): boolean => {
    if (!message.parts || !Array.isArray(message.parts)) return false
    return message.parts.some((p) => p.type === "tool-invocation")
  }

  const getToolCalls = (message: typeof messages[0]) => {
    if (!message.parts || !Array.isArray(message.parts)) return []
    return message.parts.filter((p) => p.type === "tool-invocation")
  }

  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel)

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Graph Database Copilot</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about your manufacturing data in natural language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">Welcome to Graph Copilot</h2>
                <p className="mb-8 max-w-md text-muted-foreground">
                  Ask questions about your manufacturing supply chain data. 
                  I can help you explore customers, assemblies, parts, suppliers, and more.
                </p>
                
                <div className="w-full max-w-2xl">
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                    Try asking:
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {EXAMPLE_QUESTIONS.slice(0, 6).map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto justify-start whitespace-normal p-3 text-left text-sm"
                        onClick={() => handleExampleClick(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {/* Tool calls indicator */}
                      {hasToolCalls(message) && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {getToolCalls(message).map((toolCall, idx) => {
                            const tc = toolCall as { toolName?: string; state?: string }
                            return (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                <Database className="mr-1 h-3 w-3" />
                                {tc.toolName || "query"}
                                {tc.state === "output-available" && (
                                  <CheckCircle2 className="ml-1 h-3 w-3 text-green-500" />
                                )}
                                {(tc.state === "input-streaming" || tc.state === "input-available") && (
                                  <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                                )}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Message text */}
                      <div className="whitespace-pre-wrap text-sm">
                        {getMessageText(message)}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Querying graph database...
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-card p-4">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your manufacturing data..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between text-xs text-muted-foreground">
              <span>
                Using: <strong>{selectedModelInfo?.name}</strong> ({selectedModelInfo?.provider})
              </span>
              <span>{messages.length} messages in session</span>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l bg-card">
            <Tabs defaultValue="model" className="h-full">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="model" className="flex-1">Model</TabsTrigger>
                <TabsTrigger value="api" className="flex-1">API Key</TabsTrigger>
                <TabsTrigger value="examples" className="flex-1">Examples</TabsTrigger>
              </TabsList>
              
              <TabsContent value="model" className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Select LLM Model</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Choose the AI model for querying the graph database
                    </p>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Current Model</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{selectedModelInfo?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Provider:</span>
                          <span>{selectedModelInfo?.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Key:</span>
                          <span>{selectedModelInfo?.requiresKey ? "Required" : "Not Required"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 shrink-0 text-blue-500" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        All models use the Vercel AI Gateway which provides zero-config access to OpenAI, Anthropic, and Google models.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="api" className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">Custom API Key (Optional)</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Override the default API key for selected providers
                    </p>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {apiKey && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-700 dark:text-green-300">
                        Custom API key configured
                      </span>
                    </div>
                  )}
                  
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Environment Variables</CardTitle>
                      <CardDescription className="text-xs">
                        For production, configure these in your .env file
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <code className="block rounded bg-muted p-2 text-xs">
                        AI_GATEWAY_API_KEY=your_key_here
                      </code>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="examples" className="p-4">
                <div className="space-y-2">
                  <Label>Example Questions</Label>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Click any example to use it as your query
                  </p>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-4">
                      {EXAMPLE_QUESTIONS.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-auto w-full justify-start whitespace-normal p-3 text-left text-xs"
                          onClick={() => {
                            handleExampleClick(question)
                            setShowSettings(false)
                          }}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
