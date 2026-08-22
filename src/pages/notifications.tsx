import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"

const notificationPreferences = [
  {
    id: "product",
    title: "Product updates",
    description: "New features, improvements, and release notes.",
  },
  {
    id: "workflows",
    title: "Workflow alerts",
    description: "Failures, completions, and runs that need attention.",
  },
  {
    id: "billing",
    title: "Billing",
    description: "Invoices, receipts, and plan changes.",
  },
  {
    id: "security",
    title: "Security",
    description: "Sign-ins from new devices and password changes.",
  },
] as const

export default function Notifications() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    product: true,
    workflows: true,
    billing: true,
    security: true,
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Choose which email updates you want to receive.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            These preferences apply to the address on your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {notificationPreferences.map((preference) => (
            <Field
              key={preference.id}
              orientation="horizontal"
              className="py-3 first:pt-0 last:pb-0"
            >
              <FieldContent>
                <FieldTitle>{preference.title}</FieldTitle>
                <FieldDescription>{preference.description}</FieldDescription>
              </FieldContent>
              <button
                type="button"
                role="switch"
                aria-checked={enabled[preference.id]}
                onClick={() =>
                  setEnabled((current) => ({
                    ...current,
                    [preference.id]: !current[preference.id],
                  }))
                }
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors",
                  enabled[preference.id]
                    ? "border-primary bg-primary"
                    : "border-input bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 size-3.5 rounded-full bg-background shadow-xs transition-transform",
                    enabled[preference.id] && "translate-x-4"
                  )}
                />
                <span className="sr-only">
                  {enabled[preference.id] ? "Disable" : "Enable"}{" "}
                  {preference.title}
                </span>
              </button>
            </Field>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
