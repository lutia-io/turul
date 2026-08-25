import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  parseJsonObject,
  stringifyDefinition,
} from "@/lib/json-definition"
import { networkWorkspacePath } from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useCreatePipelineMutation } from "@/store/pipeline-slice"

const emptyInput = stringifyDefinition({})

export function RunPipelineDialog({
  open,
  onOpenChange,
  pipelineDefinitionId,
  networkId,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelineDefinitionId: string
  networkId: string
  organizationId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const [startPipeline, { isLoading, error }] = useCreatePipelineMutation()
  const [jsonText, setJsonText] = useState(emptyInput)
  const parsed = parseJsonObject(jsonText)
  const jsonError = parsed ? null : "Input must be a JSON object"

  useEffect(() => {
    if (open) {
      setJsonText(emptyInput)
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!parsed) {
      return
    }
    try {
      const created = await startPipeline({
        pipelineDefinitionId,
        input: parsed,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId,
          organizationId,
          rest: `pipelines/${created.id}`,
        })
      )
    } catch {
      // RTK Query error is shown below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run pipeline</DialogTitle>
          <DialogDescription>
            Starts a run with this JSON as level 0 input. Requires an
            organization-user session.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${formId}-input`}>Input</FieldLabel>
              <Textarea
                id={`${formId}-input`}
                className="min-h-40 font-mono text-xs"
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
              />
              <FieldDescription>
                Named fields on the first level, for example {"{{ .Input.orgId }}"}.
              </FieldDescription>
            </Field>
            {jsonError ? <FieldError>{jsonError}</FieldError> : null}
            {error ? (
              <FieldError>
                {getHumaErrorMessage(error, "Failed to start pipeline")}
              </FieldError>
            ) : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isLoading} />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={isLoading || Boolean(jsonError)}
          >
            {isLoading ? "Starting..." : "Start run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
