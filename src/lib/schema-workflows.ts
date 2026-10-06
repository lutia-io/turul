import { useAuthorization } from "@/lib/authorization"

export function useSchemaWorkflows() {
  const { canNetwork } = useAuthorization()

  return {
    canRead: canNetwork("workflow_definition", "read"),
    canCreate: canNetwork("workflow_definition", "create"),
  }
}
