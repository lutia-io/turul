import { type FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Loader } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getHumaErrorMessage,
  useLogoutMutation,
  useMeQuery,
  useUpdatePasswordMutation,
  useUpdateUserMutation,
} from "@/store/api"
import { clearCredentials, selectRefreshToken } from "@/store/auth-slice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { useUpdateOrganizationUserMutation } from "@/store/organization-user-slice"

export default function Account() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const refreshToken = useAppSelector(selectRefreshToken)
  const { data: me, isLoading, isError, error } = useMeQuery()
  const [updateUser, userProfileState] = useUpdateUserMutation()
  const [updateOrganizationUser, orgProfileState] =
    useUpdateOrganizationUserMutation()
  const [updatePassword, passwordState] = useUpdatePasswordMutation()
  const [logout] = useLogoutMutation()
  const profileState =
    me?.principalType === "organization_user"
      ? orgProfileState
      : userProfileState
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    if (!me) {
      return
    }
    setFirstName(me.firstName)
    setLastName(me.lastName)
  }, [me])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileSaved(false)
    if (!me) {
      return
    }
    try {
      if (me.principalType === "organization_user") {
        await updateOrganizationUser({
          id: me.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: me.email,
        }).unwrap()
      } else {
        await updateUser({
          id: me.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }).unwrap()
      }
      setProfileSaved(true)
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match")
      return
    }
    setPasswordError(null)
    if (!me) {
      return
    }
    try {
      await updatePassword({
        id: me.id,
        principalType: me.principalType,
        currentPassword,
        newPassword,
      }).unwrap()
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
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  const profileError = profileState.error
    ? getHumaErrorMessage(profileState.error)
    : null
  const passwordSubmitError = passwordError
    ? passwordError
    : passwordState.error
      ? getHumaErrorMessage(passwordState.error)
      : null

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Manage your profile and sign-in details.
        </p>
      </div>

      {isLoading ? (
        <AccountSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load account")}
        </p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          <form onSubmit={handleProfileSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  This is how your name appears across Lutia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={profileError ? true : undefined}>
                      <FieldLabel htmlFor="account-first-name">
                        First name
                      </FieldLabel>
                      <Input
                        id="account-first-name"
                        name="firstName"
                        value={firstName}
                        onChange={(event) => {
                          setFirstName(event.target.value)
                          setProfileSaved(false)
                        }}
                        autoComplete="given-name"
                        disabled={profileState.isLoading}
                        aria-invalid={profileError ? true : undefined}
                      />
                    </Field>
                    <Field data-invalid={profileError ? true : undefined}>
                      <FieldLabel htmlFor="account-last-name">
                        Last name
                      </FieldLabel>
                      <Input
                        id="account-last-name"
                        name="lastName"
                        value={lastName}
                        onChange={(event) => {
                          setLastName(event.target.value)
                          setProfileSaved(false)
                        }}
                        autoComplete="family-name"
                        disabled={profileState.isLoading}
                        aria-invalid={profileError ? true : undefined}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="account-email">Email</FieldLabel>
                    <Input
                      id="account-email"
                      name="email"
                      type="email"
                      value={me?.email ?? ""}
                      autoComplete="email"
                      disabled
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-between gap-4">
                {profileError ? (
                  <FieldError>{profileError}</FieldError>
                ) : profileSaved ? (
                  <p className="text-sm text-muted-foreground">Profile saved.</p>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={profileState.isLoading}>
                  {profileState.isLoading ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>

          <form onSubmit={handlePasswordSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Choose a new password for your account. You will be signed out
                  after this change and will need to sign in again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-invalid={passwordSubmitError ? true : undefined}>
                    <FieldLabel htmlFor="current-password">
                      Current password
                    </FieldLabel>
                    <Input
                      id="current-password"
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value)
                        setPasswordError(null)
                      }}
                      disabled={passwordState.isLoading}
                      aria-invalid={passwordSubmitError ? true : undefined}
                    />
                  </Field>
                  <Field data-invalid={passwordSubmitError ? true : undefined}>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        setPasswordError(null)
                      }}
                      disabled={passwordState.isLoading}
                      aria-invalid={passwordSubmitError ? true : undefined}
                    />
                  </Field>
                  <Field data-invalid={passwordSubmitError ? true : undefined}>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setPasswordError(null)
                      }}
                      disabled={passwordState.isLoading}
                      aria-invalid={passwordSubmitError ? true : undefined}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-between gap-4">
                {passwordSubmitError ? (
                  <FieldError>{passwordSubmitError}</FieldError>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={passwordState.isLoading}>
                  {passwordState.isLoading ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    "Update password"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      )}
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
