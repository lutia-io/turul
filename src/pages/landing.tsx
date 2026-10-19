import { Link } from "react-router"
import { ArrowRightIcon } from "lucide-react"

import { LandingProductPreview } from "@/components/landing-product-preview"
import { MarketingHeader } from "@/components/marketing-header"
import { buttonVariants } from "@/components/ui/button"

const ideas = [
  {
    title: "Network",
    body: "The shared workspace. Warehouses and carriers, cafes and a roastery, campuses in a district — whoever needs the same data.",
  },
  {
    title: "Tables",
    body: "The agreed shape: columns, types, and what’s required. Every team writes into the same form.",
  },
  {
    title: "Records & files",
    body: "The rows and documents that fill that shape — instead of scattered spreadsheets.",
  },
  {
    title: "Pipelines & workflows",
    body: "Pipelines bring data in. Workflows run the next step when a row matches.",
  },
]

export default function Landing() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            Structured data for partner teams
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Keep every team on the same shape.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">
            Lutia is where partner organizations share tables, keep records in
            that shape, and let automation handle what happens next.
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
              See how it works
            </a>
          </div>
        </section>

        <section
          id="product"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 pb-20"
        >
          <LandingProductPreview />
        </section>

        <section className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-widest text-primary uppercase">
                The idea
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Four things. One loop.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Group the teams, agree on a shape, put the data in, then run what
                comes next. That is the whole product.
              </p>
            </div>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2">
              {ideas.map((idea, index) => (
                <li key={idea.title} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      {idea.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {idea.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight">
                Put your teams on one shared shape.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Create a network, invite organizations, agree on tables. Lutia
                keeps the rest in shape.
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
        </div>
      </footer>
    </div>
  )
}
