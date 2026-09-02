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
    title: "Make a network",
    body: "Invite the teams that share data — warehouses, shops, clinics, funds.",
  },
  {
    title: "Agree on a shape",
    body: "A schema is the shared form: fields, types, and what’s required.",
  },
  {
    title: "Keep data in shape",
    body: "Records are the rows and files, in one table instead of spreadsheets.",
  },
  {
    title: "Run the next step",
    body: "A workflow runs when a row matches. A pipeline brings data in.",
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
    body: "The group that shares data.",
    color: "purple",
    icon: ListIcon,
  },
  {
    title: "Organizations",
    body: "Teams in the network, each with their own people and files.",
    color: "orange",
    icon: Building2Icon,
  },
  {
    title: "Schemas",
    body: "The shared form: fields, types, and what’s required.",
    color: "blue",
    icon: FileJsonIcon,
  },
  {
    title: "Records & files",
    body: "The rows and documents in that shape.",
    color: "cyan",
    icon: TableIcon,
  },
  {
    title: "Workflows",
    body: "When a row matches, Lutia does the next steps.",
    color: "teal",
    icon: WorkflowIcon,
  },
  {
    title: "Pipelines",
    body: "How data gets in, then gets saved.",
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
              Structured data for any network
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
              Keep every team on the same shape.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">
              Structured data in one place, all teams on the same shape.
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
                Group, shape, data, then the next step.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Warehouses and carriers, cafes and roasteries, funds and
                investors — they share one shape, then Lutia moves the work.
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
              Everything in one place.
            </h2>
            <p className="mt-3 text-muted-foreground">
              The group, the teams, the shape, the rows, and what happens next.
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
                Put your teams on one shared shape.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Create a network, invite teams, agree on a schema. Lutia keeps
                the rest in shape.
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
            Shared data for every team
          </span>
        </div>
      </footer>
    </div>
  )
}
