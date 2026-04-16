import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../store/store'

interface RoleRouteProps {
  allowedRoles: string[]
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to the correct dashboard based on actual role
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    if (user?.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
