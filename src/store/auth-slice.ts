import { createSlice, current, type PayloadAction } from "@reduxjs/toolkit"

const AUTH_STORAGE_KEY = "lutia.auth"

export type TokenPair = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: number | null
  email: string | null
}

export type AuthRootState = {
  auth: AuthState
}

const emptyAuthState: AuthState = {
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
  email: null,
}

function loadAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return emptyAuthState
    }

    const parsed = JSON.parse(raw) as Partial<AuthState>
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      tokenType: parsed.tokenType ?? null,
      expiresIn: parsed.expiresIn ?? null,
      email: parsed.email ?? null,
    }
  } catch {
    return emptyAuthState
  }
}

function persistAuthState(state: AuthState) {
  if (!state.accessToken && !state.refreshToken) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadAuthState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<TokenPair & { email?: string }>
    ) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.tokenType = action.payload.tokenType
      state.expiresIn = action.payload.expiresIn
      if (action.payload.email !== undefined) {
        state.email = action.payload.email
      }
      persistAuthState(current(state))
    },
    clearCredentials() {
      persistAuthState(emptyAuthState)
      return emptyAuthState
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export const authReducer = authSlice.reducer

export function selectIsAuthenticated(state: AuthRootState) {
  return Boolean(state.auth.accessToken || state.auth.refreshToken)
}

export function selectAuthEmail(state: AuthRootState) {
  return state.auth.email
}

export function selectRefreshToken(state: AuthRootState) {
  return state.auth.refreshToken
}
