import { Route } from "react-router"
import { Routes } from "react-router"
import {
  AppLayout,
  Landing,
  NetworkList,
  NetworkDetail,
  Signup,
  Login,
  Home,
} from "./pages"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/signup" element={<Signup />} />
      <Route path="/app/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/app/home" element={<Home />} />
        <Route path="/app/networks" element={<NetworkList />} />
        <Route path="/app/networks/:networkId" element={<NetworkDetail />} />
      </Route>
    </Routes>
  )
}

export default App
