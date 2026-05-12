"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  HelpCircle,
  ChevronLeft,
  Zap,
  Database,
  MessageSquare,
  Share2,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const mainNavItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    disabled: false,
  },
  {
    title: "Workspace",
    icon: Briefcase,
    href: "/workspace",
    disabled: false,
  },
  {
    title: "Knowledge Graph",
    icon: Share2,
    href: "/knowledge-graph",
    disabled: false,
  },
  {
    title: "Data Import/Export",
    icon: Database,
    href: "/data-management",
    disabled: false,
  },
  {
    title: "Copilot",
    icon: MessageSquare,
    href: "/copilot",
    disabled: false,
  },
]

const secondaryNavItems = [
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    disabled: true,
    tooltip: "Coming Soon",
  },
  {
    title: "Help & Docs",
    icon: HelpCircle,
    href: "/help",
    disabled: true,
    tooltip: "Coming Soon",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleNavigation = (href: string, disabled: boolean) => {
    if (!disabled) {
      router.push(href)
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-[#1E3A5F]"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">CFI Portal</span>
              <span className="text-xs text-white/60">Knowledge Fabric</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === "/workspace" && pathname.startsWith("/workspace"))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.href, item.disabled)}
                      isActive={isActive}
                      tooltip={isCollapsed ? item.title : undefined}
                      className={cn(
                        "text-white/80 hover:bg-white/10 hover:text-white",
                        isActive && "bg-white/15 text-white font-medium"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-white/10" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          disabled
                          className="text-white/40 cursor-not-allowed opacity-50"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.href, item.disabled)}
                      isActive={pathname === item.href}
                      tooltip={isCollapsed ? item.title : undefined}
                      className="text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center justify-center w-full p-2 rounded-md",
            "text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isCollapsed && "rotate-180"
            )}
          />
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}
