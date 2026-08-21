import { Link } from "react-router"
import { FishIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import hero from "@/assets/hero.svg"

export default function Landing() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-1.5 text-xl font-semibold">
            <FishIcon className="size-6" />
            <span className="hidden md:inline">Lutia</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link to="/app/login" />}>
              Log in
            </Button>
            <Button render={<Link to="/app/signup" />}>Sign up</Button>
          </div>
        </div>
      </header>
      <Separator />

      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-12">
          <div className="flex flex-col gap-6 md:col-span-7">
            <p className="text-sm font-medium tracking-widest uppercase">
              Launch your app in minutes
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              The structured, data orchestration platform for modern teams.
            </h1>
            <p className="text-xl text-muted-foreground">
              We provide the tools you need to integrate your workflow.
            </p>
            <div className="mt-2 flex gap-3">
              <Button size="lg" className="h-11 px-6" render={<Link to="/app/signup" />}>
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6"
                render={<Link to="" />}
              >
                Learn more
              </Button>
            </div>
          </div>
          <div className="md:col-span-5">
            <img src={hero} alt="Hero" className="w-full" />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Lutia
        </div>
      </footer>
    </div>
  )
}
