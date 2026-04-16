import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DoctorDashboard from './pages/DoctorDashboard'
import ScanUploadPage from './pages/ScanUploadPage'
import AdminDashboard from './pages/AdminDashboard'
import NewOrderPage from './pages/NewOrderPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import UploadRedirect from './pages/UploadRedirect'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Generic protected route (PATIENT fallback) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders/new" element={<NewOrderPage />} />
          <Route path="/upload" element={<UploadRedirect />} />
        </Route>

        {/* Doctor-only routes */}
        <Route element={<RoleRoute allowedRoles={['DOCTOR']} />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/upload" element={<ScanUploadPage />} />
        </Route>

        {/* Admin-only routes */}
        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
