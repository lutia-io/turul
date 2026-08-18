import { Route } from "react-router"
import { Routes } from "react-router"
import {
  AppLayout,
  Landing,
  NetworkList,
  NetworkDetail,
  OrganizationList,
  OrganizationDetail,
  SchemaList,
  SchemaDetail,
  WorkflowDefinitionList,
  WorkflowDefinitionDetail,
  PipelineDefinitionList,
  PipelineDefinitionDetail,
  Signup,
  Login,
  Home,
} from "./pages"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/signup" element={<Signup />} />
      <Route path="/app/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/app/home" element={<Home />} />
        <Route path="/app/networks" element={<NetworkList />} />
        <Route path="/app/networks/:networkId" element={<NetworkDetail />} />
        <Route path="/app/organizations" element={<OrganizationList />} />
        <Route
          path="/app/organizations/:organizationId"
          element={<OrganizationDetail />}
        />
        <Route path="/app/schemas" element={<SchemaList />} />
        <Route path="/app/schemas/:schemaId" element={<SchemaDetail />} />
        <Route
          path="/app/workflow-definitions"
          element={<WorkflowDefinitionList />}
        />
        <Route
          path="/app/workflow-definitions/:workflowDefinitionId"
          element={<WorkflowDefinitionDetail />}
        />
        <Route
          path="/app/pipeline-definitions"
          element={<PipelineDefinitionList />}
        />
        <Route
          path="/app/pipeline-definitions/:pipelineDefinitionId"
          element={<PipelineDefinitionDetail />}
        />
      </Route>
    </Routes>
  )
}

export default App
