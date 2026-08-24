import type { JsonObject } from "@/lib/json-definition"
import { setNumberFilterParam, setStringFilterParam } from "@/lib/list-query"
import { api } from "@/store/api"

export type ApiSchema = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: JsonObject
  networkId: string
  organizationId?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateSchemaRequest = {
  name: string
  active: boolean
  definition: JsonObject
  networkId: string
  organizationId?: string
}

export type CreateSchemaResponse = {
  id: string
}

export type UpdateSchemaRequest = {
  id: string
  name: string
  active: boolean
  definition: JsonObject
}

export type UpdateSchemaResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NumberFilterOp = "eq" | "gte" | "lte" | "empty"
export type SchemaListSort =
  | "name"
  | "slug"
  | "status"
  | "scope"
  | "properties"
  | "createdAt"
  | "updatedAt"

export type ListSchemasParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: SchemaListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  scope?: "network" | "organization"
  active?: boolean
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  properties?: number
  propertiesOp?: NumberFilterOp
}

export type ApiSchemaList = {
  items: ApiSchema[]
  total: number
  page: number
  pageSize: number
}

function listSchemaQueryParams(params?: ListSchemasParams) {
  if (!params) {
    return undefined
  }

  const query: Record<string, string | number> = {}
  if (params.page != null) {
    query.page = params.page
  }
  if (params.pageSize != null) {
    query.pageSize = params.pageSize
  }
  if (params.q) {
    query.q = params.q
  }
  if (params.sort) {
    query.sort = params.sort
  }
  if (params.order) {
    query.order = params.order
  }
  if (params.networkId) {
    query.networkId = params.networkId
  }
  if (params.organizationId) {
    query.organizationId = params.organizationId
  }
  if (params.scope) {
    query.scope = params.scope
  }
  if (params.active != null) {
    query.active = String(params.active)
  }
  setStringFilterParam(query, "name", params.name, params.nameOp)
  setStringFilterParam(query, "slug", params.slug, params.slugOp)
  setNumberFilterParam(query, "properties", params.properties, params.propertiesOp)

  return query
}

const schemaApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSchemas: build.query<ApiSchemaList, ListSchemasParams | void>({
      query: (params) => ({
        url: "/schema",
        params: listSchemaQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Schema" as const,
                id,
              })),
              { type: "Schema", id: "LIST" },
            ]
          : [{ type: "Schema", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const schema of data.items) {
            dispatch(api.util.upsertQueryData("getSchema", schema.id, schema))
          }
        } catch {
          // List failed; getSchema cache stays unchanged.
        }
      },
    }),
    getSchema: build.query<ApiSchema, string>({
      query: (id) => `/schema/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Schema", id }],
    }),
    createSchema: build.mutation<CreateSchemaResponse, CreateSchemaRequest>({
      query: (body) => ({
        url: "/schema",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Schema", id: "LIST" }],
    }),
    updateSchema: build.mutation<UpdateSchemaResponse, UpdateSchemaRequest>({
      query: ({ id, ...body }) => ({
        url: `/schema/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Schema", id },
        { type: "Schema", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useListSchemasQuery,
  useGetSchemaQuery,
  useCreateSchemaMutation,
  useUpdateSchemaMutation,
} = schemaApi
