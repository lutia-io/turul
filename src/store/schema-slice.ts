import type { JsonObject } from "@/lib/json-definition"
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

const schemaApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSchemas: build.query<ApiSchema[], void>({
      query: () => "/schema",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Schema" as const, id })),
              { type: "Schema", id: "LIST" },
            ]
          : [{ type: "Schema", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const schema of data) {
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
