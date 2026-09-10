import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router"
import { FileJsonIcon, Loader } from "lucide-react"

import { EnabledField } from "@/components/checkbox-field"
import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
import { NodeDefinitionDialog } from "@/components/node-definition-dialog"
import { PipelineLevelsEditor } from "@/components/pipeline-levels-editor"
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
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
} from "@/lib/network-workspace"
import { pipelineTemplateContextForLevel } from "@/lib/node-definition"
import {
  emptyPipelineLevels,
  insertCreatedNode,
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineDraftSentence,
  replacePipelineNode,
  type CreatePipelineNodeTarget,
  type PipelineDefinitionBody,
  type PipelineLevelDraft,
  type PipelineNodeConfig,
  type PipelineNodeEditorTarget,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useCreatePipelineDefinitionMutation } from "@/store/pipeline-slice"

const entireNetworkValue = "__network__"

function pipelineDefinitionError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON must be a pipeline definition object"
    }
    if (!parsePipelineDefinition(parsed as JsonObject)) {
      return "JSON must include at least one level with a node"
    }
    return null
  } catch {
    return "Invalid JSON"
  }
}

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
  const [definitionView, setDefinitionView] = useState<"levels" | "json">(
    "levels"
  )
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
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [nodeDialogKey, setNodeDialogKey] = useState(0)
  const [nodeDialogNode, setNodeDialogNode] = useState<PipelineNodeConfig>()
  const [nodeDialogContext, setNodeDialogContext] = useState(
    pipelineTemplateContextForLevel(0, [])
  )
  const createNodeTargetRef = useRef<PipelineNodeEditorTarget | null>(null)
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
      setNodeDialogOpen(false)
      setNodeDialogNode(undefined)
      createNodeTargetRef.current = null
      return
    }

    setName("")
    setDescription("")
    setSelectedOrganizationId(organizationId ?? "")
    setActive(true)
    setDefinitionView("levels")
    jsonSourceRef.current = "builder"
    setJsonError(null)
    setLevels(emptyPipelineLevels())
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
  const generatedJson = stringifyDefinition(definition ?? { nodes: [] })

  useEffect(() => {
    if (jsonSourceRef.current === "json") {
      return
    }
    setJsonText(generatedJson)
    setJsonError(null)
  }, [generatedJson])

  function markBuilderSource() {
    jsonSourceRef.current = "builder"
  }

  function applyPipelineDefinition(body: PipelineDefinitionBody) {
    jsonSourceRef.current = "json"
    setLevels(levelsFromApi(body))
  }

  function handleJsonChange(text: string) {
    jsonSourceRef.current = "json"
    setJsonText(text)
    const parsed = parseJsonObject(text)
    if (!parsed) {
      setJsonError(pipelineDefinitionError(text))
      return
    }
    const body = parsePipelineDefinition(parsed)
    if (!body) {
      setJsonError("JSON must include at least one level with a node")
      return
    }
    setJsonError(null)
    applyPipelineDefinition(body)
  }

  function handleJsonBlur() {
    if (!jsonText.trim()) {
      jsonSourceRef.current = "builder"
      setJsonText(generatedJson)
      setJsonError(null)
      return
    }
    const parsed = parseJsonObject(jsonText)
    const body = parsed ? parsePipelineDefinition(parsed) : undefined
    if (!parsed || !body) {
      setJsonError(pipelineDefinitionError(jsonText))
      return
    }
    jsonSourceRef.current = "json"
    setJsonError(null)
    applyPipelineDefinition(body)
    setJsonText(stringifyDefinition(parsed))
  }

  function templateContextForLevelIndex(levelIndex: number) {
    const index = Math.max(0, levelIndex)
    return pipelineTemplateContextForLevel(
      index,
      levels[index - 1]?.nodes ?? []
    )
  }

  function openNodeDialog(options: {
    node?: PipelineNodeConfig
    levelIndex: number
    target: PipelineNodeEditorTarget
  }) {
    createNodeTargetRef.current = options.target
    setNodeDialogNode(options.node)
    setNodeDialogContext(templateContextForLevelIndex(options.levelIndex))
    setNodeDialogKey((key) => key + 1)
    setNodeDialogOpen(true)
  }

  function openCreateNode(target: CreatePipelineNodeTarget) {
    const levelIndex =
      target.kind === "level"
        ? levels.findIndex((level) => level.key === target.levelKey)
        : 0
    const level = levels[Math.max(0, levelIndex)]
    openNodeDialog({
      levelIndex,
      target: {
        levelKey:
          level?.key ??
          (target.kind === "level" ? target.levelKey : (levels[0]?.key ?? "")),
      },
    })
  }

  function openEditNode(nodeKey: string, levelKey: string) {
    const levelIndex = levels.findIndex((level) => level.key === levelKey)
    const node = levels[levelIndex]?.nodes.find((item) => item.key === nodeKey)
    openNodeDialog({
      node,
      levelIndex,
      target: { levelKey, nodeKey },
    })
  }

  function handleNodeSave(node: PipelineNodeConfig) {
    const target = createNodeTargetRef.current
    createNodeTargetRef.current = null
    if (!target) {
      return
    }
    markBuilderSource()
    if (target.nodeKey) {
      setLevels((current) =>
        replacePipelineNode(current, target.levelKey, target.nodeKey!, node)
      )
      return
    }
    setLevels((current) =>
      insertCreatedNode(current, node, {
        kind: "level",
        levelKey: target.levelKey,
      })
    )
  }

  const showNetwork = networks.length > 0 && !lockNetwork
  const showOrganization = true
  const sentence = pipelineDraftSentence(levels)
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(selectedNetworkId) &&
    Boolean(definition) &&
    !jsonError

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition) {
      return
    }

    const parsed = parseJsonObject(jsonText)
    const body = parsed ? parsePipelineDefinition(parsed) : definition
    if (!body) {
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
        if (!nextOpen && nodeDialogOpen) {
          setNodeDialogOpen(false)
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size="full"
        className="sm:inset-x-[8vw] lg:inset-x-16 xl:inset-x-[12vw]"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>Create a pipeline</DialogTitle>
              <DialogDescription>{sentence}</DialogDescription>
            </div>
            <Button
              type="button"
              variant={definitionView === "json" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setDefinitionView((view) =>
                  view === "levels" ? "json" : "levels"
                )
              }
            >
              <FileJsonIcon />
              {definitionView === "json" ? "Levels" : "JSON"}
            </Button>
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
                        markBuilderSource()
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

            {definitionView === "json" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
                <DefinitionJsonPane
                  id={`${formId}-json`}
                  title="JSON definition"
                  description="Updates as you edit. Paste a definition to fill the builder."
                  value={jsonText}
                  onChange={handleJsonChange}
                  onBlur={handleJsonBlur}
                  error={jsonError}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
                <div className="rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8">
                  <PipelineLevelsEditor
                    levels={levels}
                    onChange={(next) => {
                      markBuilderSource()
                      setLevels(next)
                    }}
                    onCreateNode={openCreateNode}
                    onEditNode={openEditNode}
                  />
                </div>
              </div>
            )}
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
      <NodeDefinitionDialog
        key={nodeDialogKey}
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        node={nodeDialogNode}
        onSave={handleNodeSave}
        pipelineTemplateContext={nodeDialogContext}
      />
    </Dialog>
  )
}
