import type { StoredFile } from "@/data/files"
import { api } from "@/store/api"

export type ApiFile = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  organizationId: string
  organizationUserId: string
  networkId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateFileRequest = {
  file: File
  filename?: string
  contentType?: string
  idempotencyKey?: string
}

export type CreateFileResponse = {
  id: string
}

export type FileContent = {
  objectUrl: string
  blob: Blob
}

const fileApi = api.injectEndpoints({
  endpoints: (build) => ({
    listFiles: build.query<ApiFile[], void>({
      query: () => "/file",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "File" as const, id })),
              { type: "File", id: "LIST" },
            ]
          : [{ type: "File", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const file of data) {
            dispatch(api.util.upsertQueryData("getFile", file.id, file))
          }
        } catch {
          // List failed; getFile cache stays unchanged.
        }
      },
    }),
    getFile: build.query<ApiFile, string>({
      query: (id) => `/file/${id}/metadata`,
      providesTags: (_result, _error, id) => [{ type: "File", id }],
    }),
    getFileContent: build.query<FileContent, string>({
      query: (id) => ({
        url: `/file/${id}`,
        responseHandler: async (response) => {
          const blob = await response.blob()
          return {
            objectUrl: URL.createObjectURL(blob),
            blob,
          } satisfies FileContent
        },
      }),
      providesTags: (_result, _error, id) => [{ type: "File", id }],
      async onCacheEntryAdded(_id, { cacheDataLoaded, cacheEntryRemoved }) {
        try {
          const { data } = await cacheDataLoaded
          await cacheEntryRemoved
          URL.revokeObjectURL(data.objectUrl)
        } catch {
          // Query failed before content loaded.
        }
      },
    }),
    createFile: build.mutation<CreateFileResponse, CreateFileRequest>({
      query: ({ file, filename, contentType, idempotencyKey }) => {
        const body = new FormData()
        body.append("file", file)
        if (filename) {
          body.append("filename", filename)
        }
        if (contentType) {
          body.append("contentType", contentType)
        }
        if (idempotencyKey) {
          body.append("idempotencyKey", idempotencyKey)
        }
        return {
          url: "/file",
          method: "POST",
          body,
        }
      },
      invalidatesTags: [{ type: "File", id: "LIST" }],
    }),
    deleteFile: build.mutation<void, string>({
      query: (id) => ({
        url: `/file/${id}`,
        method: "DELETE",
        responseHandler: (response) => response.text(),
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "File", id },
        { type: "File", id: "LIST" },
      ],
    }),
  }),
})

export function fileFromApi(file: ApiFile): StoredFile {
  return {
    id: file.id,
    filename: file.filename,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    organizationId: file.organizationId,
    organizationUserId: file.organizationUserId,
    networkId: file.networkId,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }
}

export const {
  useListFilesQuery,
  useGetFileQuery,
  useGetFileContentQuery,
  useCreateFileMutation,
  useDeleteFileMutation,
} = fileApi
