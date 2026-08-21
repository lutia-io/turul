import { type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { FishIcon, SearchIcon } from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLogoutMutation } from "@/store/api"
import {
  clearCredentials,
  selectAuthEmail,
  selectRefreshToken,
} from "@/store/auth-slice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

function displayName(email: string | null) {
  if (!email) {
    return "Account"
  }

  return email.split("@")[0] || email
}

export function AppHeader() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const email = useAppSelector(selectAuthEmail)
  const refreshToken = useAppSelector(selectRefreshToken)
  const [logout] = useLogoutMutation()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  async function handleLogout() {
    if (refreshToken) {
      try {
        await logout({ refreshToken }).unwrap()
      } catch {
        // Local session is cleared in the logout mutation.
      }
    } else {
      dispatch(clearCredentials())
    }
    navigate("/app/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Link
            to="/app/home"
            className="flex items-center gap-1.5 text-xl font-semibold"
          >
            <FishIcon className="size-6" />
          </Link>
        </div>
        <form
          onSubmit={handleSearch}
          className="mx-auto flex w-full max-w-md flex-1"
        >
          <div className="relative w-full">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              autoComplete="off"
              className="h-9 pl-8"
            />
          </div>
        </form>
        <NavUser
          user={{
            name: displayName(email),
            email: email ?? "",
            avatar: "",
          }}
          onLogout={handleLogout}
        />
      </div>
      <Separator />
    </header>
  )
}
