import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  LayersIcon,
  ListIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { LandingProductPreview } from "@/components/landing-product-preview"
import { MarketingHeader } from "@/components/marketing-header"
import { buttonVariants } from "@/components/ui/button"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"

const steps = [
  {
    title: "Stand up a network",
    body: "Group partner organizations into one workspace. Each member keeps its own users, files, and records while sharing the same contracts.",
  },
  {
    title: "Publish a schema",
    body: "JSON Schema is the contract. Define fields, types, and required properties at network or organization scope, then publish when they are ready.",
  },
  {
    title: "Keep records in that shape",
    body: "Every row and file lives against a schema. Teams inspect, filter, and share the same structured data instead of one-off spreadsheets.",
  },
  {
    title: "Automate what happens next",
    body: "Workflows watch records for matching criteria and run actions. Pipelines ingest, validate, transform, and publish data into those workflows.",
  },
]

const capabilities: {
  title: string
  body: string
  color: BadgeColor
  icon: LucideIcon
}[] = [
  {
    title: "Networks",
    body: "Model the partner ecosystem—coverage, organizations, and the definitions they share.",
    color: "purple",
    icon: ListIcon,
  },
  {
    title: "Organizations",
    body: "Invite carriers, warehouses, brokers, and operators into the same network with scoped access.",
    color: "orange",
    icon: Building2Icon,
  },
  {
    title: "Schemas",
    body: "Publish JSON Schema contracts so every partner writes and reads the same structured shape.",
    color: "blue",
    icon: FileJsonIcon,
  },
  {
    title: "Records & files",
    body: "Store typed rows against those schemas and keep the documents that travel with the work.",
    color: "cyan",
    icon: TableIcon,
  },
  {
    title: "Workflows",
    body: "When a record matches criteria, create or update another record—or trigger a pipeline.",
    color: "teal",
    icon: WorkflowIcon,
  },
  {
    title: "Pipelines",
    body: "Ingest from APIs, files, and streams. Validate against a schema, transform, then publish.",
    color: "pink",
    icon: LayersIcon,
  },
]

function CapabilityIcon({
  color,
  icon: Icon,
}: {
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        tone.bg,
        tone.text
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}

export default function Landing() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingHeader />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_58%)]" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-16 pb-10 text-center md:pt-24">
            <p className="text-sm font-medium tracking-widest text-primary uppercase">
              Partner data orchestration
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
              Orchestrate structured data across your partner network.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">
              Lutia is the workspace where organizations share JSON Schema
              contracts, keep records and files in that shape, and run workflows
              and pipelines when the data changes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/app/signup"
                className={buttonVariants({
                  size: "lg",
                  className: "h-11 px-6",
                })}
              >
                Get started
                <ArrowRightIcon />
              </Link>
              <a
                href="#product"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-11 px-6",
                })}
              >
                See the product
              </a>
            </div>
          </div>
        </section>

        <section
          id="product"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 pb-20"
        >
          <LandingProductPreview />
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-y bg-muted/40"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-widest text-primary uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                From contract to automation, in one loop.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Lutia is built for multi-organization work. Partners do not bolt
                together inboxes and spreadsheets—they share a schema, then let
                workflows and pipelines move the data.
              </p>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex flex-col rounded-xl border bg-background p-5 shadow-xs"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest text-primary uppercase">
              The workspace
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Everything a network needs to stay in the same shape.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Definitions live next to the data they describe. Publish a schema,
              collect records, then attach workflows and pipelines without
              leaving the network.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
              >
                <CapabilityIcon
                  color={capability.color}
                  icon={capability.icon}
                />
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    {capability.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {capability.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight">
                Put your partner network on a shared contract.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Create a network, publish a schema, and start orchestrating
                records, files, workflows, and pipelines in minutes.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/app/signup"
                className={buttonVariants({
                  size: "lg",
                  className: "h-11 px-6",
                })}
              >
                Create your workspace
                <ArrowRightIcon />
              </Link>
              <Link
                to="/app/login"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-11 px-6",
                })}
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Lutia</span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <FileIcon className="size-3.5" />
            Structured data for partner networks
          </span>
        </div>
      </footer>
    </div>
  )
}
