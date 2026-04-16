import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Typography,
} from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { setCredentials } from '../store/authSlice'
import api from '../services/apiService'

const { Title, Text, Paragraph } = Typography

interface RegisterForm {
  first_name: string
  last_name: string
  email: string
  password: string
  password2: string
}

interface RegisterResponse {
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

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFinish = async (values: RegisterForm) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post<RegisterResponse>('/auth/register/', {
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
        password2: values.password2,
      })
      dispatch(
        setCredentials({
          user: response.data.user,
          access: response.data.access,
          refresh: response.data.refresh,
        })
      )
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: Record<string, string | string[]> }
      }
      const data = axiosErr?.response?.data
      if (data) {
        const firstMsg = Object.values(data)[0]
        setError(Array.isArray(firstMsg) ? firstMsg[0] : (firstMsg as string))
      } else {
        setError('Registration failed. Please try again.')
      }
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
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/">
            <Text strong style={{ color: '#fff', fontSize: 26, letterSpacing: 1 }}>
              MedPrint{' '}
              <Text style={{ color: '#4096ff', fontSize: 26 }}>3D</Text>
            </Text>
          </Link>
          <Paragraph style={{ color: '#b0c8e8', marginTop: 6, marginBottom: 0 }}>
            Create your free account
          </Paragraph>
        </div>

        <Card
          style={{ borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
          styles={{ body: { padding: '36px 32px' } }}
        >
          <Title level={3} style={{ margin: '0 0 4px' }}>
            Get started
          </Title>
          <Text type="secondary">Fill in your details to create an account</Text>

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
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label="First name"
                  name="first_name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#bbb' }} />}
                    placeholder="Jane"
                    autoComplete="given-name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Last name"
                  name="last_name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#bbb' }} />}
                    placeholder="Smith"
                    autoComplete="family-name"
                  />
                </Form.Item>
              </Col>
            </Row>

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
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="password2"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Passwords do not match'))
                  },
                }),
              ]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontSize: 15 }}
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '16px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              or
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Already have an account? </Text>
            <Link to="/login">
              <Text style={{ color: '#1677ff', fontWeight: 500 }}>Sign in</Text>
            </Link>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/">
            <Text style={{ color: '#b0c8e8', fontSize: 13 }}>← Back to home</Text>
          </Link>
        </div>
      </div>
    </div>
  )
}
