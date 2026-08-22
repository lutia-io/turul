import type { JsonObject } from "@/lib/json-definition"
import { api } from "@/store/api"

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

const recordApi = api.injectEndpoints({
  endpoints: (build) => ({
    listRecords: build.query<ApiRecord[], void>({
      query: () => "/record",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Record" as const, id })),
              { type: "Record", id: "LIST" },
            ]
          : [{ type: "Record", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const record of data) {
            dispatch(api.util.upsertQueryData("getRecord", record.id, record))
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
      invalidatesTags: [{ type: "Record", id: "LIST" }],
    }),
    updateRecord: build.mutation<UpdateRecordResponse, UpdateRecordRequest>({
      query: ({ id, ...body }) => ({
        url: `/record/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
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
