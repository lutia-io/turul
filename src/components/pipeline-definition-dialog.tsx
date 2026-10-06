import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router"
import { Loader } from "lucide-react"

import { EnabledField } from "@/components/checkbox-field"
import {
  PipelineDefinitionBuilder,
  type PipelineDefinitionBuilderHandle,
} from "@/components/pipeline-definition-builder"
import {
  PipelineViewMenu,
  type PipelineView,
} from "@/components/pipeline-view-menu"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
} from "@/lib/network-workspace"
import {
  emptyPipelineLevels,
  levelsToApi,
  pipelineDraftSentence,
  type PipelineDefinitionBody,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useCreatePipelineDefinitionMutation } from "@/store/pipeline-slice"

const entireNetworkValue = "__network__"

export function PipelineDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const [createPipeline, createState] = useCreatePipelineDefinitionMutation()
  const isLoading = createState.isLoading
  const error = createState.error
  const lockNetwork = Boolean(networkId)
  const lockOrganization = Boolean(organizationId)
  const builderRef = useRef<PipelineDefinitionBuilderHandle>(null)
  const [definitionView, setDefinitionView] = useState<PipelineView>("levels")
  const [builderKey, setBuilderKey] = useState(0)
  const [nodeOpen, setNodeOpen] = useState(false)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? ""
  )
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [active, setActive] = useState(true)
  const [levels, setLevels] =
    useState<PipelineLevelDraft[]>(emptyPipelineLevels)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const firstNetworkId = networks[0]?.id ?? ""
  const networkOrganizations = organizations.filter(
    (organization) => organization.networkId === selectedNetworkId
  )

  useEffect(() => {
    createState.reset()
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    setName("")
    setDescription("")
    setSelectedOrganizationId(organizationId ?? "")
    setActive(true)
    setDefinitionView("levels")
    setNodeOpen(false)
    setJsonError(null)
    setLevels(emptyPipelineLevels())
    setBuilderKey((key) => key + 1)
  }, [open, organizationId])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [firstNetworkId, networkId, open])

  const definition = useMemo(() => levelsToApi(levels), [levels])

  const showNetwork = networks.length > 0 && !lockNetwork
  const showOrganization = true
  const sentence = pipelineDraftSentence(levels)
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(selectedNetworkId) &&
    !jsonError &&
    (Boolean(definition) || nodeOpen)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const committed = builderRef.current?.commitOpenNode()
    if (!committed?.ok) {
      return
    }
    const body = levelsToApi(committed.levels)
    if (!name.trim() || !selectedNetworkId || !body || jsonError) {
      return
    }

    void submitDefinition(body)
  }

  async function submitDefinition(body: PipelineDefinitionBody) {
    try {
      const created = await createPipeline({
        name: name.trim(),
        description: description.trim(),
        active,
        definition: body,
        networkId: selectedNetworkId,
        organizationId: selectedOrganizationId || undefined,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: selectedOrganizationId || undefined,
          rest: `pipeline-definitions/${created.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && nodeOpen) {
          builderRef.current?.cancelNode()
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size="full"
        className="sm:inset-x-8 sm:inset-y-6 lg:inset-x-12 xl:inset-x-16"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>Create a pipeline</DialogTitle>
              <DialogDescription>{sentence}</DialogDescription>
            </div>
            {nodeOpen ? null : (
              <PipelineViewMenu
                value={definitionView}
                onChange={setDefinitionView}
              />
            )}
          </div>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-muted/40 px-6 py-5">
            <FieldGroup className="shrink-0 gap-3 rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
              <div
                className={cn(
                  "grid gap-3",
                  showNetwork
                    ? "sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                    : "sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
                )}
              >
                <Field className="gap-1">
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Fetch and summarize"
                    autoFocus
                    required
                    disabled={isLoading}
                    aria-invalid={error ? true : undefined}
                  />
                </Field>
                <Field className="gap-1">
                  <FieldLabel htmlFor={`${formId}-description`}>
                    Description
                  </FieldLabel>
                  <Input
                    id={`${formId}-description`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What this pipeline does"
                    disabled={isLoading}
                  />
                </Field>
                {showNetwork ? (
                  <Field className="gap-1">
                    <FieldLabel htmlFor={`${formId}-network`}>
                      Network
                    </FieldLabel>
                    <Select
                      value={selectedNetworkId}
                      disabled={isLoading}
                      required
                      modal={false}
                      items={networks.map((network) => ({
                        value: network.id,
                        label: network.name,
                      }))}
                      onValueChange={(value) => {
                        if (!value) {
                          return
                        }
                        setSelectedNetworkId(value)
                        if (!lockOrganization) {
                          setSelectedOrganizationId("")
                        }
                        builderRef.current?.cancelNode()
                        setLevels(emptyPipelineLevels())
                      }}
                    >
                      <SelectTrigger id={`${formId}-network`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks.map((network) => (
                          <SelectItem key={network.id} value={network.id}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
                {showOrganization ? (
                  <Field className="gap-1">
                    <FieldLabel htmlFor={`${formId}-organization`}>
                      Organization
                    </FieldLabel>
                    <Select
                      value={selectedOrganizationId || entireNetworkValue}
                      disabled={lockOrganization || isLoading}
                      modal={false}
                      items={[
                        {
                          value: entireNetworkValue,
                          label: "Entire network",
                        },
                        ...networkOrganizations.map((organization) => ({
                          value: organization.id,
                          label: organization.name,
                        })),
                      ]}
                      onValueChange={(value) => {
                        if (!value || value === entireNetworkValue) {
                          setSelectedOrganizationId("")
                          return
                        }
                        setSelectedOrganizationId(value)
                      }}
                    >
                      <SelectTrigger id={`${formId}-organization`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={entireNetworkValue}>
                          Entire network
                        </SelectItem>
                        {networkOrganizations.map((organization) => (
                          <SelectItem
                            key={organization.id}
                            value={organization.id}
                          >
                            {organization.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
                <EnabledField
                  formId={formId}
                  checked={active}
                  onChange={setActive}
                />
              </div>
              {error ? (
                <FieldError>{getHumaErrorMessage(error)}</FieldError>
              ) : null}
            </FieldGroup>

            <PipelineDefinitionBuilder
              key={builderKey}
              ref={builderRef}
              levels={levels}
              onChange={setLevels}
              view={definitionView}
              sentence={sentence}
              jsonInputId={`${formId}-json`}
              onNodeSessionChange={setNodeOpen}
              onJsonErrorChange={setJsonError}
            />
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading || !canSubmit || Boolean(jsonError)}
              aria-busy={isLoading}
              className={isLoading ? "disabled:opacity-100" : undefined}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" />
                  <span className="sr-only">Creating</span>
                </>
              ) : (
                "Create pipeline"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
