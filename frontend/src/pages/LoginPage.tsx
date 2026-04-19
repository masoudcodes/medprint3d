import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Typography,
} from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { setCredentials } from '../store/authSlice'
import api from '../services/apiService'

const { Title, Text, Paragraph } = Typography

interface LoginForm {
  email: string
  password: string
}

interface LoginResponse {
  access: string
  refresh: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
  }
}

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post<LoginResponse>('/auth/login/', {
        email: values.email,
        password: values.password,
      })
      const loggedInUser = response.data.user
      dispatch(
        setCredentials({
          user: loggedInUser,
          access: response.data.access,
          refresh: response.data.refresh,
        })
      )
      // Route to the correct dashboard based on role
      if (loggedInUser.role === 'ADMIN') {
        navigate('/admin/dashboard')
      } else if (loggedInUser.role === 'DOCTOR') {
        navigate('/doctor/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(
        axiosErr?.response?.data?.detail || 'Invalid email or password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003a70 60%, #005eb8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/">
            <Text strong style={{ color: '#fff', fontSize: 26, letterSpacing: 1 }}>
              MedTechPrint{' '}
              <Text style={{ color: '#4096ff', fontSize: 26 }}>3D</Text>
            </Text>
          </Link>
          <Paragraph style={{ color: '#b0c8e8', marginTop: 6, marginBottom: 0 }}>
            Sign in to your account
          </Paragraph>
        </div>

        <Card
          style={{ borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
          styles={{ body: { padding: '36px 32px' } }}
        >
          <Title level={3} style={{ margin: '0 0 4px' }}>
            Welcome back
          </Title>
          <Text type="secondary">Enter your credentials to continue</Text>

          <Divider style={{ margin: '20px 0' }} />

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 20 }}
            />
          )}

          <Form
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              label="Email address"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bbb' }} />}
                placeholder="you@hospital.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 8 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Button type="link" style={{ padding: 0, fontSize: 13 }}>
                Forgot password?
              </Button>
            </div>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontSize: 15 }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '16px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              or
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Don't have an account? </Text>
            <Link to="/register">
              <Text style={{ color: '#1677ff', fontWeight: 500 }}>Create one</Text>
            </Link>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/">
            <Text style={{ color: '#b0c8e8', fontSize: 13 }}>
              ← Back to home
            </Text>
          </Link>
        </div>
      </div>
    </div>
  )
}
