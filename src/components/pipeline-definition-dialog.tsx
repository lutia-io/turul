import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router"

import { CheckboxField } from "@/components/checkbox-field"
import {
  DefinitionDialogBody,
  DefinitionJsonPane,
  definitionDialogClassName,
} from "@/components/definition-dialog-layout"
import { NodeDefinitionDialog } from "@/components/node-definition-dialog"
import {
  PipelineLevelsEditor,
  insertCreatedNode,
  newPipelineLevel,
  type CreatePipelineNodeTarget,
  type PipelineLevelDraft,
} from "@/components/pipeline-levels-editor"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { stringifyDefinition } from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceNodes,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import {
  parsePipelineDefinition,
  type PipelineDefinitionBody,
} from "@/lib/pipeline-definition"
import { slugifyId } from "@/lib/slug"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreatePipelineDefinitionMutation,
  useGetPipelineDefinitionQuery,
  useUpdatePipelineDefinitionMutation,
} from "@/store/pipeline-slice"

function draftsFromDefinition(
  definition?: PipelineDefinitionBody
): PipelineLevelDraft[] {
  if (!definition || definition.nodes.length === 0) {
    return [newPipelineLevel()]
  }
  return definition.nodes.map((level, index) => ({
    key: `level-${index}-${level.map((node) => node.id).join("-")}`,
    nodeIds: level.map((node) => node.id),
  }))
}

function definitionFromDrafts(
  levels: PipelineLevelDraft[]
): PipelineDefinitionBody | undefined {
  const nodes = levels.map((level) =>
    level.nodeIds.filter(Boolean).map((id) => ({ id }))
  )
  if (nodes.length === 0 || nodes.some((level) => level.length === 0)) {
    return undefined
  }
  return { nodes }
}

export function PipelineDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  pipelineDefinitionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  pipelineDefinitionId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { nodes } = useWorkspaceNodes({ skip: !open })
  const [createPipeline, createState] = useCreatePipelineDefinitionMutation()
  const [updatePipeline, updateState] = useUpdatePipelineDefinitionMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const existingQuery = useGetPipelineDefinitionQuery(
    pipelineDefinitionId ?? "",
    { skip: !open || !pipelineDefinitionId }
  )
  const editing = Boolean(pipelineDefinitionId)
  const firstNetworkId = networks[0]?.id ?? ""
  const [selectedNetworkId, setSelectedNetworkId] = useState(networkId ?? "")
  const [name, setName] = useState("")
  const [active, setActive] = useState(true)
  const [levels, setLevels] = useState<PipelineLevelDraft[]>([
    newPipelineLevel(),
  ])
  const [createNodeOpen, setCreateNodeOpen] = useState(false)
  const [createNodeKey, setCreateNodeKey] = useState(0)
  const createNodeTargetRef = useRef<CreatePipelineNodeTarget | null>(null)

  useEffect(() => {
    if (!open) {
      setCreateNodeOpen(false)
      createNodeTargetRef.current = null
      return
    }
    const current =
      pipelineDefinitionId && existingQuery.currentData
        ? workspacePipelineFromApi(existingQuery.currentData)
        : undefined
    const parsed = current
      ? parsePipelineDefinition(current.definition)
      : undefined
    setSelectedNetworkId(networkId ?? current?.networkId ?? firstNetworkId)
    setName(current?.name ?? "")
    setActive(current?.active ?? true)
    setLevels(draftsFromDefinition(parsed))
  }, [
    existingQuery.currentData,
    firstNetworkId,
    networkId,
    open,
    pipelineDefinitionId,
  ])

  const networkNodes = useMemo(
    () => nodes.filter((node) => node.networkId === selectedNetworkId),
    [nodes, selectedNetworkId]
  )
  const definition = definitionFromDrafts(levels)
  const preview = stringifyDefinition(definition ?? { nodes: [] })
  const networkItems = networks.map((item) => ({
    value: item.id,
    label: item.name,
  }))

  function openCreateNode(target: CreatePipelineNodeTarget) {
    createNodeTargetRef.current = target
    setCreateNodeKey((key) => key + 1)
    setCreateNodeOpen(true)
  }

  function handleNodeCreated(nodeId: string) {
    const target = createNodeTargetRef.current ?? { kind: "empty" }
    createNodeTargetRef.current = null
    setLevels((current) => insertCreatedNode(current, nodeId, target))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId || !definition) {
      return
    }
    try {
      if (editing && pipelineDefinitionId) {
        await updatePipeline({
          id: pipelineDefinitionId,
          name: name.trim(),
          active,
          definition,
        }).unwrap()
        onOpenChange(false)
        return
      }
      const created = await createPipeline({
        name: name.trim(),
        active,
        definition,
        networkId: selectedNetworkId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          rest: `pipeline-definitions/${created.id}`,
        })
      )
    } catch {
      // RTK Query error is shown below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && createNodeOpen) {
          setCreateNodeOpen(false)
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent size="full" className={definitionDialogClassName}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>
            {editing
              ? "Edit pipeline definition"
              : "Create a pipeline definition"}
          </DialogTitle>
          <DialogDescription>
            Orchestrate nodes in BFS levels. Every node in a level runs; the
            next level receives those outputs by index.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <DefinitionDialogBody
            json={
              <DefinitionJsonPane
                title="JSON definition"
                description="Persisted as levels of node IDs. Templates live on the nodes, not this graph."
                value={preview}
                readOnly
              />
            }
          >
            <FieldGroup className="gap-4">
              {!editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <Select
                    value={selectedNetworkId}
                    disabled={Boolean(networkId) || isLoading}
                    required
                    modal={false}
                    items={networkItems}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedNetworkId(value)
                      }
                    }}
                  >
                    <SelectTrigger id={`${formId}-network`}>
                      <SelectValue placeholder="Select a network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
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
                />
                <FieldDescription>
                  Slug {slugifyId(name) || "is generated from the name"}.
                </FieldDescription>
              </Field>
              <Field>
                <CheckboxField
                  id={`${formId}-active`}
                  checked={active}
                  onChange={setActive}
                  label="Published"
                />
                <FieldDescription>
                  Published pipelines can be started. Drafts are saved but do
                  not run.
                </FieldDescription>
              </Field>
              {error ? (
                <FieldError>
                  {getHumaErrorMessage(
                    error,
                    "Failed to save pipeline definition"
                  )}
                </FieldError>
              ) : null}
            </FieldGroup>

            <div className="flex flex-col gap-2">
              <div>
                <h3 className="text-sm font-medium">Levels</h3>
                <p className="text-xs text-muted-foreground">
                  All nodes in a level run. After the barrier, later levels read
                  previous outputs as {"{{ .Input.0 }}"}, {"{{ .Input.1 }}"}.
                </p>
              </div>
              <PipelineLevelsEditor
                levels={levels}
                nodes={networkNodes}
                onChange={setLevels}
                onCreateNode={openCreateNode}
                createDisabled={!selectedNetworkId}
              />
            </div>
          </DefinitionDialogBody>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                isLoading || !name.trim() || !selectedNetworkId || !definition
              }
            >
              {isLoading
                ? editing
                  ? "Saving..."
                  : "Creating..."
                : editing
                  ? "Save pipeline"
                  : "Create pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <NodeDefinitionDialog
        key={createNodeKey}
        open={createNodeOpen}
        onOpenChange={setCreateNodeOpen}
        networkId={selectedNetworkId || undefined}
        onCreated={handleNodeCreated}
      />
    </Dialog>
  )
}
