import { type SubmitEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getHumaErrorMessage, useLoginUserMutation } from "@/store/api"
import { Loader } from "lucide-react"

export function LoginForm() {
  const [loginUser, { isLoading, error }] = useLoginUserMutation()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname: string } } }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    try {
      await loginUser({ email, password }).unwrap()
      const from = location.state?.from?.pathname
      navigate(from && from.startsWith("/app") ? from : "/app/home", { replace: true })
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Welcome to Lutia</h1>
            <FieldDescription>
              Enter your email below to login to your account
            </FieldDescription>
          </div>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              disabled={isLoading}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              disabled={isLoading}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          {error ? <FieldError>{getHumaErrorMessage(error)}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader className="size-4 animate-spin" /> : "Login"}
            </Button>
          </Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account? <Link to="/app/signup">Sign up</Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}
