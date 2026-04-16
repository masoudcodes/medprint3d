import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import type { RootState } from '../store/store'

export default function UploadRedirect() {
  const user = useSelector((state: RootState) => state.auth.user)

  if (user?.role === 'DOCTOR') return <Navigate to="/doctor/upload" replace />
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/dashboard" replace />
}

