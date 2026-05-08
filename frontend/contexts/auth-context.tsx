"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

interface User {
  username: string
  name: string
  role: string
  initials: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo credentials
const DEMO_USER: User = {
  username: "JohnDoe",
  name: "John Doe",
  role: "Field Service Manager",
  initials: "JD"
}

const DEMO_PASSWORD = "demo123"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check for existing session on mount
  useEffect(() => {
    if (!mounted) return
    
    try {
      const storedUser = localStorage.getItem("cfi_user")
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoading(false)
  }, [mounted])

  // Protect routes
  useEffect(() => {
    if (!mounted || isLoading) return
    
    if (!user && pathname !== "/login") {
      router.push("/login")
    }
  }, [user, isLoading, pathname, router, mounted])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check demo credentials (case-insensitive username)
    if (username.toLowerCase() === DEMO_USER.username.toLowerCase() && password === DEMO_PASSWORD) {
      setUser(DEMO_USER)
      try {
        localStorage.setItem("cfi_user", JSON.stringify(DEMO_USER))
      } catch {
        // Ignore localStorage errors
      }
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem("cfi_user")
    } catch {
      // Ignore localStorage errors
    }
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
