import { AppShell } from "@/components/app-shell"

export default function DataManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
