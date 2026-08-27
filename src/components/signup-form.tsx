import { type SubmitEvent } from "react"
import { Link, useNavigate } from "react-router"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getHumaErrorMessage, useCreateUserMutation } from "@/store/api"
import { Loader } from "lucide-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [createUser, { isLoading, error }] = useCreateUserMutation()
  const navigate = useNavigate()

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const firstName = String(form.get("firstName") ?? "").trim()
    const lastName = String(form.get("lastName") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    try {
      await createUser({ firstName, lastName, email, password }).unwrap()
      navigate("/app/login", { replace: true })
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <FieldDescription>
              Enter your details below to create your account
            </FieldDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
              />
            </Field>
          </div>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john.doe@example.com"
              autoComplete="email"
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
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          {error ? <FieldError>{getHumaErrorMessage(error)}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader className="size-4 animate-spin" /> : "Create Account"}
            </Button>
          </Field>
          <FieldDescription className="text-center">
            Already have an account? <Link to="/app/login">Sign in</Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}
