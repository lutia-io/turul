import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import { api } from "@/store/api"
import { authReducer } from "@/store/auth-slice"
import "@/store/network-slice"
import "@/store/organization-slice"
import "@/store/organization-user-slice"
import "@/store/schema-slice"
import "@/store/record-slice"
import "@/store/file-slice"
import "@/store/workflow-slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
