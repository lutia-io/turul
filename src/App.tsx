import { Route, Routes } from "react-router"
import {
  AppLayout,
  Landing,
  NetworkLayout,
  NetworkList,
  OrganizationList,
  NetworkDetail,
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

function networkWorkspaceRoutes() {
  return (
    <>
      <Route index element={<NetworkDetail />} />
      <Route path="schemas" element={<SchemaList />} />
      <Route path="schemas/:schemaId" element={<SchemaDetail />} />
      <Route path="workflow-definitions" element={<WorkflowDefinitionList />} />
      <Route
        path="workflow-definitions/:workflowDefinitionId"
        element={<WorkflowDefinitionDetail />}
      />
      <Route path="pipeline-definitions" element={<PipelineDefinitionList />} />
      <Route
        path="pipeline-definitions/:pipelineDefinitionId"
        element={<PipelineDefinitionDetail />}
      />
    </>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/signup" element={<Signup />} />
      <Route path="/app/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/app/home" element={<Home />} />
        <Route path="/app/networks" element={<NetworkList />} />
        <Route path="/app/organizations" element={<OrganizationList />} />
      </Route>
      <Route path="/app/networks/:networkId" element={<NetworkLayout />}>
        {networkWorkspaceRoutes()}
        <Route path="organizations/:organizationId">
          {networkWorkspaceRoutes()}
        </Route>
      </Route>
    </Routes>
  )
}

export default App
