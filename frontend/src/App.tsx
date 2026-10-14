import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { HabitDetailPage } from './pages/HabitDetailPage'
import { InvitePage } from './pages/InvitePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// The route table: which URL shows which page.
// Routes nested inside <ProtectedRoute> only render for logged-in users,
// and routes inside <Layout> get the header with the Logout button.
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* Public: the invite page handles logged-out visitors itself. */}
      <Route path="/invite/:code" element={<InvitePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
        </Route>
      </Route>

      {/* Unknown URL → home (which redirects to /login if needed). */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
