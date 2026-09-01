import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react"

import {
  clearCredentials,
  setCredentials,
  type AuthRootState,
  type TokenPair,
} from "@/store/auth-slice"

export type CreateUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
}

export type CreateUserResponse = {
  id: string
}

export type LoginUserRequest = {
  email: string
  password: string
}

export type LoginOrganizationUserRequest = {
  email: string
  password: string
  networkId: string
  organizationId: string
}

export type RefreshRequest = {
  refreshToken: string
}

export type LogoutRequest = {
  refreshToken: string
}

export type MeResponse = {
  principalType: string
  id: string
  firstName: string
  lastName: string
  email: string
  networkId?: string
  organizationId?: string
}

export type UpdateUserRequest = {
  id: string
  firstName: string
  lastName: string
}

export type UpdateUserResponse = {
  id: string
}

export type UpdatePasswordRequest = {
  id: string
  principalType: string
  currentPassword: string
  newPassword: string
}

export const HUMA_ERROR_CODES = {
  badRequest: "bad_request",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  conflict: "conflict",
  notFound: "not_found",
  internal: "internal",
} as const

export type HumaErrorCode =
  (typeof HUMA_ERROR_CODES)[keyof typeof HUMA_ERROR_CODES]

export type HumaError = {
  code: string
  message: string
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  prepareHeaders: (headers, { getState }) => {
    const accessToken = (getState() as AuthRootState).auth.accessToken
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`)
    }
    return headers
  },
})

function requestUrl(args: string | FetchArgs) {
  return typeof args === "string" ? args : args.url
}

function isAnonymousAuthRequest(args: string | FetchArgs) {
  const url = requestUrl(args)
  return (
    url.startsWith("/auth/login") ||
    url.startsWith("/auth/refresh") ||
    url.startsWith("/auth/logout") ||
    url === "/user"
  )
}

let refreshPromise: Promise<boolean> | null = null

async function refreshSession(api: BaseQueryApi, extraOptions: object) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = (api.getState() as AuthRootState).auth.refreshToken
        if (!refreshToken) {
          api.dispatch(clearCredentials())
          return false
        }

        const refreshResult = await rawBaseQuery(
          {
            url: "/auth/refresh",
            method: "POST",
            body: { refreshToken } satisfies RefreshRequest,
          },
          api,
          extraOptions
        )

        if (refreshResult.data) {
          api.dispatch(setCredentials(refreshResult.data as TokenPair))
          return true
        }

        api.dispatch(clearCredentials())
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status !== 401 || isAnonymousAuthRequest(args)) {
    return result
  }

  const refreshed = await refreshSession(api, extraOptions)
  if (refreshed) {
    result = await rawBaseQuery(args, api, extraOptions)
  }

  return result
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Me",
    "Network",
    "Organization",
    "OrganizationUser",
    "Schema",
    "Record",
    "File",
    "WorkflowDefinition",
    "Workflow",
    "WorkflowAction",
    "PipelineDefinition",
    "Pipeline",
    "PipelineNode",
    "NodeDefinition",
  ],
  endpoints: (build) => ({
    createUser: build.mutation<CreateUserResponse, CreateUserRequest>({
      query: (body) => ({
        url: "/user",
        method: "POST",
        body,
      }),
    }),
    loginUser: build.mutation<TokenPair, LoginUserRequest>({
      query: (body) => ({
        url: "/auth/login/user",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ ...data, email: arg.email }))
        } catch {
          // Login failed; credentials stay cleared.
        }
      },
    }),
    loginOrganizationUser: build.mutation<
      TokenPair,
      LoginOrganizationUserRequest
    >({
      query: (body) => ({
        url: "/auth/login/organization-user",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ ...data, email: arg.email }))
        } catch {
          // Login failed; credentials stay cleared.
        }
      },
    }),
    refresh: build.mutation<TokenPair, RefreshRequest>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials(data))
        } catch {
          // Refresh failed; the reauth base query clears credentials.
        }
      },
    }),
    logout: build.mutation<void, LogoutRequest>({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } finally {
          dispatch(clearCredentials())
          dispatch(api.util.resetApiState())
        }
      },
    }),
    me: build.query<MeResponse, void>({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),
    updateUser: build.mutation<UpdateUserResponse, UpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `/user/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error) => (error ? [] : ["Me"]),
    }),
    updatePassword: build.mutation<void, UpdatePasswordRequest>({
      query: ({ id, principalType, currentPassword, newPassword }) => ({
        url:
          principalType === "organization_user"
            ? `/organization-user/${id}/password`
            : `/user/${id}/password`,
        method: "POST",
        body: { currentPassword, newPassword },
        responseHandler: (response) => response.text(),
      }),
    }),
  }),
})

export const {
  useCreateUserMutation,
  useLoginUserMutation,
  useLoginOrganizationUserMutation,
  useRefreshMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateUserMutation,
  useUpdatePasswordMutation,
} = api

function isHumaError(data: unknown): data is HumaError {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string" &&
    data.code.length > 0 &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.length > 0
  )
}

export function getHumaError(error: unknown): HumaError | undefined {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return undefined
  }

  return isHumaError(error.data) ? error.data : undefined
}

export function isHumaErrorCode(error: unknown, code: HumaErrorCode) {
  return getHumaError(error)?.code === code
}

export function getHumaErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
) {
  return getHumaError(error)?.message ?? fallback
}

export function getHumaLoadErrorCopy(
  error: unknown,
  {
    resource,
    notFoundMessage,
  }: {
    resource: string
    notFoundMessage: string
  }
) {
  const huma = getHumaError(error)
  switch (huma?.code) {
    case HUMA_ERROR_CODES.notFound:
      return {
        title: `${resource} not found`,
        message: notFoundMessage,
        destructive: true,
      }
    case HUMA_ERROR_CODES.forbidden:
      return {
        title: "Access denied",
        message:
          huma.message ||
          `You don't have permission to view this ${resource.toLowerCase()}.`,
        destructive: true,
      }
    case HUMA_ERROR_CODES.unauthorized:
      return {
        title: "Sign in required",
        message: huma.message || "Sign in to continue.",
        destructive: true,
      }
    default:
      return {
        title: `Couldn't load ${resource.toLowerCase()}`,
        message: huma?.message ?? "Something went wrong",
        destructive: true,
      }
  }
}
