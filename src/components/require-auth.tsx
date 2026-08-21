import { Navigate, Outlet, useLocation } from "react-router"

import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

export function RequireAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
