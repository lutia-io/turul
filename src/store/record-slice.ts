import type { JsonObject } from "@/lib/json-definition"
import { setStringFilterParam } from "@/lib/list-query"
import { api } from "@/store/api"

export type RelatedRecord = {
  id: string
  schemaId: string
  title: string
}

export type ApiRecord = {
  id: string
  data: JsonObject
  schemaId: string
  organizationId: string
  organizationUserId: string
  networkId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  related?: Record<string, RelatedRecord>
}

export type CreateRecordRequest = {
  schemaId: string
  data: JsonObject
}

export type CreateRecordResponse = {
  id: string
}

export type UpdateRecordRequest = {
  id: string
  data: JsonObject
}

export type UpdateRecordResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NumberFilterOp = "eq" | "gte" | "lte" | "empty"
export type RecordListSort = "organization" | "createdAt" | "updatedAt" | (string & {})

export type RecordFieldFilter = {
  name: string
  value?: string
  op?: StringFilterOp | NumberFilterOp
}

export type ListRecordsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: RecordListSort
  order?: "asc" | "desc"
  schemaId?: string
  networkId?: string
  organizationId?: string
  organization?: string
  organizationOp?: StringFilterOp
  fields?: RecordFieldFilter[]
}

export type ApiRecordList = {
  items: ApiRecord[]
  related?: Record<string, RelatedRecord>
  total: number
  page: number
  pageSize: number
}

function listRecordQueryParams(params?: ListRecordsParams) {
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
  if (params.schemaId) {
    query.schemaId = params.schemaId
  }
  if (params.networkId) {
    query.networkId = params.networkId
  }
  if (params.organizationId) {
    query.organizationId = params.organizationId
  }
  setStringFilterParam(
    query,
    "organization",
    params.organization,
    params.organizationOp
  )
  for (const field of params.fields ?? []) {
    if (field.op === "empty") {
      query[`fieldOp.${field.name}`] = "empty"
      continue
    }
    if (field.value) {
      query[`field.${field.name}`] = field.value
      if (field.op) {
        query[`fieldOp.${field.name}`] = field.op
      }
    }
  }

  return query
}

const recordApi = api.injectEndpoints({
  endpoints: (build) => ({
    listRecords: build.query<ApiRecordList, ListRecordsParams | void>({
      query: (params) => ({
        url: "/record",
        params: listRecordQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Record" as const, id })),
              { type: "Record", id: "LIST" },
            ]
          : [{ type: "Record", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const record of data.items) {
            const related: Record<string, RelatedRecord> = {}
            for (const value of Object.values(record.data)) {
              if (typeof value === "string" && data.related?.[value]) {
                related[value] = data.related[value]
              }
            }
            dispatch(
              api.util.upsertQueryData("getRecord", record.id, {
                ...record,
                related,
              })
            )
          }
        } catch {
          // List failed; getRecord cache stays unchanged.
        }
      },
    }),
    getRecord: build.query<ApiRecord, string>({
      query: (id) => `/record/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Record", id }],
    }),
    createRecord: build.mutation<CreateRecordResponse, CreateRecordRequest>({
      query: (body) => ({
        url: "/record",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Record", id: "LIST" }],
    }),
    updateRecord: build.mutation<UpdateRecordResponse, UpdateRecordRequest>({
      query: ({ id, ...body }) => ({
        url: `/record/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error
          ? []
          : [
              { type: "Record", id },
              { type: "Record", id: "LIST" },
            ],
    }),
  }),
})

export const {
  useListRecordsQuery,
  useGetRecordQuery,
  useCreateRecordMutation,
  useUpdateRecordMutation,
} = recordApi
