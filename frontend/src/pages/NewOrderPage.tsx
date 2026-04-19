import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Layout, Select, Space, Typography } from 'antd'
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import api from '../services/apiService'

const { Header, Content } = Layout
const { Title, Paragraph, Text } = Typography

const SERVICE_OPTIONS = [
  { value: 'ANATOMICAL_MODEL', label: 'CT to anatomical models' },
  { value: 'MAXILLOFACIAL', label: 'Maxillofacial reconstruction' },
  { value: 'TITANIUM_PLATE', label: 'Titanium plate pre-bending' },
  { value: 'CRANIOPLASTY', label: 'Cranioplasty reconstruction' },
  { value: 'OSTEOTOMY', label: 'Osteotomy surgical guides' },
  { value: 'IMPLANTS', label: 'Cranial & maxillofacial implants' },
]

interface NewOrderFormValues {
  service: string
}

export default function NewOrderPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onFinish = async (values: NewOrderFormValues) => {
    setLoading(true)
    setError(null)
    try {
      await api.post('/orders/', { service: values.service })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail || 'Could not create order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header
        style={{
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Text strong style={{ color: '#fff', fontSize: 20, letterSpacing: 1 }}>
          MedTechPrint <Text style={{ color: '#1677ff', fontSize: 20 }}>3D</Text>
        </Text>
        <Button
          icon={<ArrowLeftOutlined />}
          style={{ color: '#fff', borderColor: '#555', background: 'transparent' }}
          onClick={() => navigate('/dashboard')}
        >
          Back
        </Button>
      </Header>

      <Content style={{ padding: '40px 32px', maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ color: '#1677ff', marginRight: 10 }} />
            New Order
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
            Choose a service to create an order.
          </Paragraph>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        {success && (
          <Alert
            message="Order created successfully."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 28 } }}>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              label="Service"
              name="service"
              rules={[{ required: true, message: 'Please select a service' }]}
            >
              <Select placeholder="Select service" options={SERVICE_OPTIONS} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading} style={{ height: 44 }}>
                  Create Order
                </Button>
                <Button style={{ height: 44 }} onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  )
}

