import { AppShell } from "@/components/app-shell"

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
