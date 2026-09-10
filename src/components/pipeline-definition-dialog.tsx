import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate, useParams } from "react-router"
import { FileJsonIcon, Loader } from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
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
  useWorkspaceNodes,
} from "@/lib/network-workspace"
import { pipelineTemplateContextForLevel } from "@/lib/node-definition"
import {
  emptyPipelineLevels,
  insertCreatedNode,
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineDraftSentence,
  type CreatePipelineNodeTarget,
  type PipelineDefinitionBody,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useCreatePipelineDefinitionMutation } from "@/store/pipeline-slice"

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { organizationId } = useParams()
  const { networks } = useWorkspaceNetworkList()
  const { nodes } = useWorkspaceNodes({ skip: !open })
  const [createPipeline, createState] = useCreatePipelineDefinitionMutation()
  const isLoading = createState.isLoading
  const error = createState.error
  const lockNetwork = Boolean(networkId)
  const [definitionView, setDefinitionView] = useState<"levels" | "json">(
    "levels"
  )
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [active, setActive] = useState(true)
  const [levels, setLevels] =
    useState<PipelineLevelDraft[]>(emptyPipelineLevels)
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [nodeDialogKey, setNodeDialogKey] = useState(0)
  const [nodeDialogId, setNodeDialogId] = useState<string>()
  const [nodeDialogContext, setNodeDialogContext] = useState(
    pipelineTemplateContextForLevel(0, [], () => undefined)
  )
  const createNodeTargetRef = useRef<CreatePipelineNodeTarget | null>(null)
  const firstNetworkId = networks[0]?.id ?? ""

  const networkNodes = useMemo(
    () => nodes.filter((node) => node.networkId === selectedNetworkId),
    [nodes, selectedNetworkId]
  )
  const nodeName = (id: string) =>
    networkNodes.find((node) => node.id === id)?.name

  useEffect(() => {
    createState.reset()
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      setNodeDialogOpen(false)
      setNodeDialogId(undefined)
      createNodeTargetRef.current = null
      return
    }

    setName("")
    setActive(true)
    setDefinitionView("levels")
    jsonSourceRef.current = "builder"
    setJsonError(null)
    setLevels(emptyPipelineLevels())
  }, [open])

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
      levels[index - 1]?.nodeIds ?? [],
      nodeName
    )
  }

  function openNodeDialog(options: {
    nodeDefinitionId?: string
    levelIndex: number
    createTarget?: CreatePipelineNodeTarget | null
  }) {
    createNodeTargetRef.current = options.createTarget ?? null
    setNodeDialogId(options.nodeDefinitionId)
    setNodeDialogContext(templateContextForLevelIndex(options.levelIndex))
    setNodeDialogKey((key) => key + 1)
    setNodeDialogOpen(true)
  }

  function openCreateNode(target: CreatePipelineNodeTarget) {
    const levelIndex =
      target.kind === "level"
        ? levels.findIndex((level) => level.key === target.levelKey)
        : levels.findIndex((level) => level.nodeIds.some((id) => !id))
    openNodeDialog({
      levelIndex,
      createTarget: target,
    })
  }

  function openEditNode(nodeId: string, levelKey: string) {
    openNodeDialog({
      nodeDefinitionId: nodeId,
      levelIndex: levels.findIndex((level) => level.key === levelKey),
    })
  }

  function handleNodeCreated(nodeId: string) {
    const target = createNodeTargetRef.current
    createNodeTargetRef.current = null
    if (!target) {
      return
    }
    markBuilderSource()
    setLevels((current) => insertCreatedNode(current, nodeId, target))
  }

  const showNetwork = networks.length > 0 && !lockNetwork
  const sentence = pipelineDraftSentence(levels, nodeName)
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
        active,
        definition: body,
        networkId: selectedNetworkId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organizationId || undefined,
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
            <FieldGroup className="shrink-0 gap-4 rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
              {showNetwork ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
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
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field>
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
                <Field className="sm:pb-1">
                  <CheckboxField
                    id={`${formId}-active`}
                    checked={active}
                    onChange={setActive}
                    label="Enabled"
                  />
                </Field>
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
                    nodes={networkNodes}
                    onChange={(next) => {
                      markBuilderSource()
                      setLevels(next)
                    }}
                    onCreateNode={openCreateNode}
                    onEditNode={openEditNode}
                    createDisabled={!selectedNetworkId}
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
        networkId={selectedNetworkId || undefined}
        nodeDefinitionId={nodeDialogId}
        onCreated={handleNodeCreated}
        pipelineTemplateContext={nodeDialogContext}
      />
    </Dialog>
  )
}
