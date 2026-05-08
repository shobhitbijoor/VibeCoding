"use client"

import { ReactNode, useEffect, useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { AIAssistantPanel } from "@/components/ai-assistant-panel"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/contexts/auth-context"
import { Spinner } from "@/components/ui/spinner"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const isMobile = useIsMobile()
  const [sidebarDefaultOpen, setSidebarDefaultOpen] = useState(true)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)

  // Initialize sidebar state from localStorage and responsive defaults
  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed")
    if (stored !== null) {
      setSidebarDefaultOpen(stored !== "true")
    } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarDefaultOpen(false)
    }
  }, [])

  const handleSidebarChange = (open: boolean) => {
    localStorage.setItem("sidebar_collapsed", String(!open))
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render shell if not authenticated (redirect handled by auth context)
  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      onOpenChange={handleSidebarChange}
      style={{
        "--sidebar-width": "240px",
        "--sidebar-width-icon": "64px",
      } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header onOpenAIAssistant={() => setIsAIAssistantOpen(true)} />
        <main className="flex-1 overflow-auto pt-16">
          {children}
        </main>
      </SidebarInset>
      
      {/* AI Assistant Slide-in Panel */}
      <AIAssistantPanel 
        isOpen={isAIAssistantOpen} 
        onClose={() => setIsAIAssistantOpen(false)} 
      />

      {/* Floating AI Assistant Trigger */}
      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        aria-label="Open AI Assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
        </svg>
      </button>
    </SidebarProvider>
  )
}
