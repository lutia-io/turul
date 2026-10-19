import { useState, type SubmitEvent } from "react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  getHumaErrorMessage,
  useCreateUserMutation,
  useLoginUserMutation,
} from "@/store/api"
import { setCredentials } from "@/store/auth-slice"
import { useAppDispatch } from "@/store/hooks"
import { Loader } from "lucide-react"

const APP_HOME = "/app/networks"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName = "firstName" | "lastName" | "email" | "password"

export function SignupForm() {
  const dispatch = useAppDispatch()
  const [createUser, { isLoading: isCreating, error: createError, reset: resetCreate }] =
    useCreateUserMutation()
  const [loginUser, { isLoading: isLoggingIn, error: loginError, reset: resetLogin }] =
    useLoginUserMutation()
  const navigate = useNavigate()
  const [validationError, setValidationError] = useState<string | null>(null)
  const [invalidFields, setInvalidFields] = useState<Partial<Record<FieldName, true>>>(
    {}
  )
  const isLoading = isCreating || isLoggingIn
  const submitError = validationError
    ? validationError
    : createError || loginError
      ? getHumaErrorMessage(createError ?? loginError)
      : null

  function clearClientErrors() {
    if (validationError) {
      setValidationError(null)
    }
    if (Object.keys(invalidFields).length > 0) {
      setInvalidFields({})
    }
  }

  function fieldInvalid(name: FieldName) {
    return invalidFields[name] || createError || loginError ? true : undefined
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const firstName = String(form.get("firstName") ?? "").trim()
    const lastName = String(form.get("lastName") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    const nextInvalid: Partial<Record<FieldName, true>> = {}
    if (!firstName) nextInvalid.firstName = true
    if (!lastName) nextInvalid.lastName = true
    if (!email) nextInvalid.email = true
    if (!password) nextInvalid.password = true

    if (Object.keys(nextInvalid).length > 0) {
      resetCreate()
      resetLogin()
      setInvalidFields(nextInvalid)
      setValidationError("Please fill in all fields.")
      return
    }

    if (!EMAIL_PATTERN.test(email)) {
      resetCreate()
      resetLogin()
      setInvalidFields({ email: true })
      setValidationError("Enter a valid email address.")
      return
    }

    setValidationError(null)
    setInvalidFields({})

    try {
      await createUser({ firstName, lastName, email, password }).unwrap()
      const tokens = await loginUser({ email, password }).unwrap()
      dispatch(setCredentials({ ...tokens, email }))
      navigate(APP_HOME, { replace: true })
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <FieldDescription>
              Enter your details below to create your account
            </FieldDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={fieldInvalid("firstName")}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                disabled={isLoading}
                aria-invalid={fieldInvalid("firstName")}
                onChange={clearClientErrors}
              />
            </Field>
            <Field data-invalid={fieldInvalid("lastName")}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                disabled={isLoading}
                aria-invalid={fieldInvalid("lastName")}
                onChange={clearClientErrors}
              />
            </Field>
          </div>
          <Field data-invalid={fieldInvalid("email")}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              autoComplete="email"
              disabled={isLoading}
              aria-invalid={fieldInvalid("email")}
              onChange={clearClientErrors}
            />
          </Field>
          <Field data-invalid={fieldInvalid("password")}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={fieldInvalid("password")}
              onChange={clearClientErrors}
            />
          </Field>
          {submitError ? <FieldError>{submitError}</FieldError> : null}
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
