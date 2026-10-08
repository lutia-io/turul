import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react"

import { DefinitionCard } from "@/components/definition-detail"
import {
  NodeDefinitionEditor,
  type NodeDefinitionEditorHandle,
} from "@/components/node-definition-editor"
import { PipelineFlowCanvas } from "@/components/pipeline-flow"
import { PipelineLevelsEditor } from "@/components/pipeline-levels-editor"
import type { PipelineView } from "@/components/pipeline-view-menu"
import {
  pipelineTemplateContextForLevel,
  type NodeType,
  type PipelineTemplateContext,
} from "@/lib/node-definition"
import {
  insertCreatedNode,
  replacePipelineNode,
  type CreatePipelineNodeTarget,
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
  onNodeSessionChange,
  className,
}: {
  ref?: Ref<PipelineDefinitionBuilderHandle>
  levels: PipelineLevelDraft[]
  onChange: (levels: PipelineLevelDraft[]) => void
  view: PipelineView
  sentence?: string
  onNodeSessionChange?: (open: boolean) => void
  className?: string
}) {
  const editorRef = useRef<NodeDefinitionEditorHandle>(null)
  const sessionIdRef = useRef(0)
  const [session, setSession] = useState<NodeSession | null>(null)

  const publish = useCallback(
    (next: PipelineLevelDraft[]) => {
      onChange(next)
    },
    [onChange]
  )

  useEffect(() => {
    onNodeSessionChange?.(session !== null)
  }, [onNodeSessionChange, session])

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
    publish(next)
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
        publish(next)
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
      ) : view === "levels" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DefinitionCard>
            <PipelineLevelsEditor
              levels={levels}
              onChange={publish}
              onCreateNode={openCreate}
              onEditNode={openEdit}
            />
          </DefinitionCard>
        </div>
      ) : (
        <PipelineFlowCanvas
          className="h-full min-h-[28rem] flex-1"
          levels={levels}
          onChange={publish}
          onCreateNode={openCreate}
          onEditNode={openEdit}
          sentence={sentence}
        />
      )}
    </div>
  )
}
