import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react"

import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
import { DefinitionCard } from "@/components/definition-detail"
import {
  NodeDefinitionEditor,
  type NodeDefinitionEditorHandle,
} from "@/components/node-definition-editor"
import { PipelineFlowCanvas } from "@/components/pipeline-flow"
import { PipelineLevelsEditor } from "@/components/pipeline-levels-editor"
import type { PipelineView } from "@/components/pipeline-view-menu"
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  pipelineTemplateContextForLevel,
  type NodeType,
  type PipelineTemplateContext,
} from "@/lib/node-definition"
import {
  insertCreatedNode,
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  replacePipelineNode,
  type CreatePipelineNodeTarget,
  type PipelineDefinitionBody,
  type PipelineLevelDraft,
  type PipelineNodeConfig,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"

export type PipelineDefinitionBuilderHandle = {
  commitOpenNode: () =>
    { ok: true; levels: PipelineLevelDraft[] } | { ok: false }
  cancelNode: () => void
}

type NodeSession =
  | {
      id: number
      mode: "create"
      target: CreatePipelineNodeTarget
      initialType?: NodeType
      templateContext: PipelineTemplateContext
    }
  | {
      id: number
      mode: "edit"
      levelKey: string
      nodeKey: string
      node: PipelineNodeConfig
      templateContext: PipelineTemplateContext
    }

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

function levelIndexForTarget(
  levels: PipelineLevelDraft[],
  target: CreatePipelineNodeTarget
) {
  if (target.kind === "empty") {
    return 0
  }
  if (target.kind === "after-level") {
    const index = levels.findIndex(
      (level) => level.key === target.afterLevelKey
    )
    return index < 0 ? levels.length : index + 1
  }
  const index = levels.findIndex((level) => level.key === target.levelKey)
  return index < 0 ? 0 : index
}

function templateContextForTarget(
  levels: PipelineLevelDraft[],
  target: CreatePipelineNodeTarget
) {
  const levelIndex = levelIndexForTarget(levels, target)
  const previous =
    target.kind === "after-level"
      ? (levels.find((level) => level.key === target.afterLevelKey)?.nodes ??
        [])
      : (levels[levelIndex - 1]?.nodes ?? [])
  return pipelineTemplateContextForLevel(levelIndex, previous)
}

function applyNodeSession(
  session: NodeSession,
  levels: PipelineLevelDraft[],
  node: PipelineNodeConfig
) {
  if (session.mode === "edit") {
    return replacePipelineNode(levels, session.levelKey, session.nodeKey, node)
  }
  return insertCreatedNode(levels, node, session.target)
}

export function PipelineDefinitionBuilder({
  ref,
  levels,
  onChange,
  view,
  sentence,
  jsonInputId,
  onNodeSessionChange,
  onJsonErrorChange,
  className,
}: {
  ref?: Ref<PipelineDefinitionBuilderHandle>
  levels: PipelineLevelDraft[]
  onChange: (levels: PipelineLevelDraft[]) => void
  view: PipelineView
  sentence?: string
  jsonInputId?: string
  onNodeSessionChange?: (open: boolean) => void
  onJsonErrorChange?: (error: string | null) => void
  className?: string
}) {
  const fallbackJsonId = useId()
  const editorRef = useRef<NodeDefinitionEditorHandle>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")
  const emittedLevelsRef = useRef(levels)
  const sessionIdRef = useRef(0)
  const [session, setSession] = useState<NodeSession | null>(null)
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)

  const definition = useMemo(() => levelsToApi(levels), [levels])
  const generatedJson = stringifyDefinition(definition ?? { nodes: [] })

  const publish = useCallback(
    (next: PipelineLevelDraft[], source: "builder" | "json") => {
      jsonSourceRef.current = source
      emittedLevelsRef.current = next
      onChange(next)
    },
    [onChange]
  )

  useEffect(() => {
    if (levels === emittedLevelsRef.current) {
      return
    }
    emittedLevelsRef.current = levels
    jsonSourceRef.current = "builder"
  }, [levels])

  useEffect(() => {
    if (jsonSourceRef.current === "json") {
      return
    }
    setJsonText(generatedJson)
    setJsonError(null)
  }, [generatedJson])

  useEffect(() => {
    onNodeSessionChange?.(session !== null)
  }, [onNodeSessionChange, session])

  useEffect(() => {
    onJsonErrorChange?.(jsonError)
  }, [jsonError, onJsonErrorChange])

  function applyPipelineDefinition(body: PipelineDefinitionBody) {
    publish(levelsFromApi(body), "json")
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
    setJsonError(null)
    applyPipelineDefinition(body)
    setJsonText(stringifyDefinition(parsed))
  }

  function openCreate(target: CreatePipelineNodeTarget, type?: NodeType) {
    sessionIdRef.current += 1
    setSession({
      id: sessionIdRef.current,
      mode: "create",
      target,
      initialType: type,
      templateContext: templateContextForTarget(levels, target),
    })
  }

  function openEdit(nodeKey: string, levelKey: string) {
    const levelIndex = levels.findIndex((level) => level.key === levelKey)
    const node = levels[levelIndex]?.nodes.find((item) => item.key === nodeKey)
    if (!node) {
      return
    }
    sessionIdRef.current += 1
    setSession({
      id: sessionIdRef.current,
      mode: "edit",
      levelKey,
      nodeKey,
      node,
      templateContext: pipelineTemplateContextForLevel(
        Math.max(0, levelIndex),
        levels[levelIndex - 1]?.nodes ?? []
      ),
    })
  }

  function commitSession(current: NodeSession, node: PipelineNodeConfig) {
    const next = applyNodeSession(current, levels, node)
    publish(next, "builder")
    setSession(null)
    return next
  }

  useImperativeHandle(
    ref,
    () => ({
      commitOpenNode() {
        if (!session) {
          return { ok: true, levels }
        }
        const node = editorRef.current?.commit() ?? null
        if (!node) {
          return { ok: false }
        }
        const next = applyNodeSession(session, levels, node)
        publish(next, "builder")
        setSession(null)
        return { ok: true, levels: next }
      },
      cancelNode() {
        setSession(null)
      },
    }),
    [levels, publish, session]
  )

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {session ? (
        <NodeDefinitionEditor
          key={session.id}
          ref={editorRef}
          node={session.mode === "edit" ? session.node : undefined}
          initialType={
            session.mode === "create" ? session.initialType : undefined
          }
          pipelineTemplateContext={session.templateContext}
          onDone={(node) => commitSession(session, node)}
          onCancel={() => setSession(null)}
        />
      ) : view === "json" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
          <DefinitionJsonPane
            id={jsonInputId ?? fallbackJsonId}
            title="JSON definition"
            description="Updates as you edit. Paste a definition to fill the builder."
            value={jsonText}
            onChange={handleJsonChange}
            onBlur={handleJsonBlur}
            error={jsonError}
          />
        </div>
      ) : view === "levels" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DefinitionCard>
            <PipelineLevelsEditor
              levels={levels}
              onChange={(next) => publish(next, "builder")}
              onCreateNode={openCreate}
              onEditNode={openEdit}
            />
          </DefinitionCard>
        </div>
      ) : (
        <PipelineFlowCanvas
          className="h-full min-h-[28rem] flex-1"
          levels={levels}
          onChange={(next) => publish(next, "builder")}
          onCreateNode={openCreate}
          onEditNode={openEdit}
          sentence={sentence}
        />
      )}
    </div>
  )
}
