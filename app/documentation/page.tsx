'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, FileCode, FileJson, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

const documents = [
  {
    title: "Kuzu Graph Database Implementation",
    description: "Technical documentation explaining how the Kuzu Graph Database is implemented, from Copilot to LLM to graph queries.",
    filename: "KUZU_GRAPH_DATABASE_IMPLEMENTATION.md",
    icon: FileText,
    type: "Markdown",
  },
  {
    title: "Schema Definition (Cypher Format)",
    description: "Complete database schema in Cypher DDL format with CREATE NODE TABLE and CREATE REL TABLE statements.",
    filename: "KUZU_SCHEMA_CYPHER.cypher",
    icon: FileCode,
    type: "Cypher",
  },
  {
    title: "Schema Definition (JSON Format)",
    description: "Structured JSON schema definition with all node types, relationship types, properties, and constraints.",
    filename: "KUZU_SCHEMA_DEFINITION.json",
    icon: FileJson,
    type: "JSON",
  },
  {
    title: "Standard Operating Procedure",
    description: "Step-by-step guide for executing Cypher queries directly on the Kuzu database after downloading the project.",
    filename: "SOP_KUZU_DIRECT_QUERIES.md",
    icon: FileText,
    type: "Markdown",
  },
]

export default function DocumentationPage() {
  const handleDownload = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/docs/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
          <p className="mt-2 text-muted-foreground">
            Download technical documentation, schema definitions, and operating procedures for the Kuzu Graph Database implementation.
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.filename} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <doc.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <span className="text-xs text-muted-foreground">{doc.type}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.filename)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{doc.description}</CardDescription>
                <p className="mt-2 text-xs text-muted-foreground font-mono">{doc.filename}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/copilot" className="text-primary hover:underline">
              Open Graph Database Copilot
            </Link>
            <Link href="/data-management" className="text-primary hover:underline">
              Data Management Dashboard
            </Link>
            <Link href="/graph-explorer" className="text-primary hover:underline">
              Graph Explorer
            </Link>
            <Link href="/dashboard" className="text-primary hover:underline">
              Analytics Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
