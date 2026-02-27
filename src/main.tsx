import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PatientsPage from './pages/PatientsPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import AgendaPage from './pages/AgendaPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import WorkspacePage from './pages/WorkspacePage.tsx'
import WorkspacePatientPage from './pages/WorkspacePatientPage.tsx'
import AdminLayout from './components/AdminLayout.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/admin/workspace" replace />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Rutas anidadas de administración */}
            <Route index element={<Navigate to="workspace" replace />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="workspace/:patientId" element={<WorkspacePatientPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="pacientes" element={<PatientsPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin/agenda" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
