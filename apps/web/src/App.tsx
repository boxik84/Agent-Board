import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { isLoggedIn } from './api/auth'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import OrgChartPage from './pages/OrgChartPage'
import TasksPage from './pages/TasksPage'
import HeartbeatsPage from './pages/HeartbeatsPage'
import BudgetsPage from './pages/BudgetsPage'
import OfficePage from './pages/OfficePage'
import AgentDetailPage from './pages/AgentDetailPage'
import BoardOfDirectorsPage from './pages/BoardOfDirectorsPage'
import InboxPage from './pages/InboxPage'
import ActivityPage from './pages/ActivityPage'
import CompanySettingsPage from './pages/CompanySettingsPage'
import './index.css'

const qc = new QueryClient()

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="org-chart" element={<OrgChartPage />} />
            <Route path="board-of-directors" element={<BoardOfDirectorsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="company-settings" element={<CompanySettingsPage />} />
            <Route path="agents/:id" element={<AgentDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="heartbeats" element={<HeartbeatsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="office" element={<OfficePage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
