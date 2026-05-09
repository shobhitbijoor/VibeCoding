"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
  Info,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

// Available LLM models organized by provider
const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", envKey: "OPENAI_API_KEY" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", envKey: "OPENAI_API_KEY" },
  { id: "anthropic/claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", provider: "Anthropic", envKey: "ANTHROPIC_API_KEY" },
  { id: "anthropic/claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", provider: "Anthropic", envKey: "ANTHROPIC_API_KEY" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", envKey: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", envKey: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { id: "google/gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "Google", envKey: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "Google", envKey: "GOOGLE_GENERATIVE_AI_API_KEY" },
]

// Example questions for users
const EXAMPLE_QUESTIONS = [
  "Show me all customers in the database",
  "What assemblies does Acme Corporation have?",
  "List all parts supplied by Precision Parts Inc",
  "Show me the service history for assembly ASM-2024-001",
  "What are the recent failures and their root causes?",
  "What is the warranty status of our assemblies?",
  "Which parts were manufactured in lot LOT-2024-001?",
  "Show me all quality inspections and deviations",
  "Give me statistics about the graph database",
  "Which plant manufactured assembly ASM-2024-002?",
]

export default function CopilotPage() {
  const [input, setInput] = useState("")
  // Pending settings (what user is editing in the settings panel)
  const [pendingModel, setPendingModel] = useState(AVAILABLE_MODELS[0].id)
  const [pendingApiKey, setPendingApiKey] = useState("")
  // Applied settings (what's actually being used for requests)
  const [appliedModel, setAppliedModel] = useState(AVAILABLE_MODELS[0].id)
  const [appliedApiKey, setAppliedApiKey] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsApplied, setSettingsApplied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Track a session version that increments when settings are applied
  const [sessionVersion, setSessionVersion] = useState(0)
  
  // Create a unique session ID that changes when settings are applied
  const sessionId = `copilot-session-${sessionVersion}`

  // Check if there are pending changes that haven't been applied
  const hasUnappliedChanges = pendingModel !== appliedModel || pendingApiKey !== appliedApiKey

  // Apply settings handler
  const applySettings = () => {
    setAppliedModel(pendingModel)
    setAppliedApiKey(pendingApiKey)
    setSessionVersion(v => v + 1) // Force new session
    setSettingsApplied(true)
    setTimeout(() => setSettingsApplied(false), 2000)
  }

  // Create transport with applied settings
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/copilot",
      prepareSendMessagesRequest: ({ id, messages }) => {
        return {
          body: {
            messages,
            id,
            model: appliedModel,
            apiKey: appliedApiKey || undefined,
          },
        }
      },
    })
  }, [appliedModel, appliedApiKey])

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: sessionId,
    onError: (err) => {
      console.error("Chat error:", err)
      setError(err.message || "An error occurred while processing your request")
    },
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

  // Clear error when user types
  useEffect(() => {
    if (input) setError(null)
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    setError(null)
    sendMessage({ text: input })
    setInput("")
  }

  const handleExampleClick = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
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

  const appliedModelInfo = AVAILABLE_MODELS.find(m => m.id === appliedModel)
  const pendingModelInfo = AVAILABLE_MODELS.find(m => m.id === pendingModel)
  const needsApiKey = !appliedApiKey && appliedModelInfo

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

      {/* API Key Warning Banner */}
      {needsApiKey && messages.length === 0 && (
        <div className="border-b bg-amber-50 px-6 py-3 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>API Key Required:</strong> Please configure your {appliedModelInfo.provider} API key in Settings to use the Copilot.
              You need <code className="rounded bg-amber-200 px-1 dark:bg-amber-800">{appliedModelInfo.envKey}</code> set in your environment or enter it in the API Key tab.
            </p>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Messages */}
          <ScrollArea className="h-full flex-1 p-6">
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

          {/* Error Display */}
          {error && (
            <div className="mx-auto w-full max-w-3xl px-6 pb-2">
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setError(null)}
                >
                  &times;
                </Button>
              </div>
            </div>
          )}

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
              <span className="flex items-center gap-1">
                Using: <strong>{appliedModelInfo?.name}</strong> ({appliedModelInfo?.provider})
                {appliedApiKey && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </span>
              <span>{messages.length} messages in session</span>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l bg-card">
            <Tabs defaultValue="api" className="h-full">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="api" className="flex-1">API Key</TabsTrigger>
                <TabsTrigger value="model" className="flex-1">Model</TabsTrigger>
                <TabsTrigger value="examples" className="flex-1">Examples</TabsTrigger>
              </TabsList>
              
              <TabsContent value="api" className="p-4">
                <div className="space-y-4">
                  <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        To use the Copilot, you need an API key from your LLM provider. Enter it below and click Apply Settings.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Enter your API key for {pendingModelInfo?.provider || "the selected provider"}
                    </p>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="apiKey"
                        type="password"
                        value={pendingApiKey}
                        onChange={(e) => setPendingApiKey(e.target.value)}
                        placeholder={pendingModelInfo?.provider === "OpenAI" ? "sk-..." : "Enter API key..."}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Apply Settings Button */}
                  <Button 
                    onClick={applySettings}
                    disabled={!hasUnappliedChanges && appliedApiKey === pendingApiKey}
                    className="w-full"
                  >
                    {settingsApplied ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Settings Applied!
                      </>
                    ) : (
                      <>
                        Apply Settings
                        {hasUnappliedChanges && <Badge variant="secondary" className="ml-2">Changes pending</Badge>}
                      </>
                    )}
                  </Button>
                  
                  {appliedApiKey && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-700 dark:text-green-300">
                        API key is active for this session
                      </span>
                    </div>
                  )}
                  
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Environment Variables</CardTitle>
                      <CardDescription className="text-xs">
                        For production, set these in your .env file:
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 p-4 pt-0">
                      <code className="block rounded bg-muted p-2 text-xs">
                        # OpenAI<br/>
                        OPENAI_API_KEY=sk-...
                      </code>
                      <code className="block rounded bg-muted p-2 text-xs">
                        # Anthropic<br/>
                        ANTHROPIC_API_KEY=sk-ant-...
                      </code>
                      <code className="block rounded bg-muted p-2 text-xs">
                        # Google<br/>
                        GOOGLE_GENERATIVE_AI_API_KEY=...
                      </code>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Get API Keys:</Label>
                    <div className="flex flex-col gap-1">
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        OpenAI API Keys <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Anthropic API Keys <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Google AI API Keys <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="model" className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Select LLM Model</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Choose the AI model for querying the graph database
                    </p>
                    <Select value={pendingModel} onValueChange={setPendingModel}>
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

                  {/* Apply Settings Button */}
                  <Button 
                    onClick={applySettings}
                    disabled={!hasUnappliedChanges}
                    className="w-full"
                  >
                    {settingsApplied ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Settings Applied!
                      </>
                    ) : (
                      <>
                        Apply Settings
                        {hasUnappliedChanges && <Badge variant="secondary" className="ml-2">Changes pending</Badge>}
                      </>
                    )}
                  </Button>
                  
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Active Model</CardTitle>
                      <CardDescription className="text-xs">Currently being used for queries</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{appliedModelInfo?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Provider:</span>
                          <span>{appliedModelInfo?.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Env Variable:</span>
                          <code className="text-xs">{appliedModelInfo?.envKey}</code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 shrink-0 text-blue-500" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Different models have different capabilities and pricing. Gemini 2.5 Flash is great for quick queries, while GPT-4o and Claude 3.5 Sonnet are better for complex analysis.
                      </p>
                    </div>
                  </div>
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
