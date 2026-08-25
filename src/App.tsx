import { Route, Routes } from "react-router"

import { CreateEntityProvider } from "@/components/create-entity"
import { RequireAuth } from "@/components/require-auth"
import {
  AppLayout,
  Landing,
  NetworkLayout,
  NetworkList,
  NetworkDetail,
  OrganizationList,
  OrganizationUserList,
  OrganizationUserDetail,
  SchemaList,
  SchemaDetail,
  WorkflowDefinitionList,
  WorkflowDefinitionDetail,
  NodeDefinitionList,
  NodeDefinitionDetail,
  WorkflowList,
  WorkflowRunDetail,
  PipelineDefinitionList,
  PipelineDefinitionDetail,
  PipelineList,
  PipelineRunDetail,
  RecordsPage,
  RecordDetail,
  FilesPage,
  FileDetail,
  Signup,
  Login,
  Home,
  Account,
  Billing,
  Notifications,
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
      <Route path="node-definitions" element={<NodeDefinitionList />} />
      <Route
        path="node-definitions/:nodeDefinitionId"
        element={<NodeDefinitionDetail />}
      />
      <Route path="pipeline-definitions" element={<PipelineDefinitionList />} />
      <Route
        path="pipeline-definitions/:pipelineDefinitionId"
        element={<PipelineDefinitionDetail />}
      />
      <Route path="workflows" element={<WorkflowList />} />
      <Route path="workflows/:workflowRunId" element={<WorkflowRunDetail />} />
      <Route path="pipelines" element={<PipelineList />} />
      <Route path="pipelines/:pipelineRunId" element={<PipelineRunDetail />} />
      <Route path="organizations" element={<OrganizationList />} />
      <Route path="organization-users" element={<OrganizationUserList />} />
      <Route
        path="organization-users/:organizationUserId"
        element={<OrganizationUserDetail />}
      />
      <Route path="records" element={<RecordsPage />} />
      <Route path="records/:recordId" element={<RecordDetail />} />
      <Route path="files" element={<FilesPage />} />
      <Route path="files/:fileId" element={<FileDetail />} />
    </>
  )
}

export function App() {
  return (
    <CreateEntityProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/signup" element={<Signup />} />
        <Route path="/app/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/app/home" element={<Home />} />
            <Route path="/app/networks" element={<NetworkList />} />
            <Route path="/app/account" element={<Account />} />
            <Route path="/app/billing" element={<Billing />} />
            <Route path="/app/notifications" element={<Notifications />} />
          </Route>
          <Route path="/app/networks/:networkId" element={<NetworkLayout />}>
            {networkWorkspaceRoutes()}
            <Route path="organizations/:organizationId">
              {networkWorkspaceRoutes()}
            </Route>
          </Route>
        </Route>
      </Routes>
    </CreateEntityProvider>
  )
}

export default App
