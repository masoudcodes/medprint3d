import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Layout,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CloudUploadOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { clearCredentials } from '../store/authSlice'
import type { RootState } from '../store/store'
import api from '../services/apiService'

const { Header, Content, Footer } = Layout
const { Title, Text } = Typography

interface Scan {
  id: string
  case_number: string
  patient_name: string
  title: string
  notes: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  created_at: string
}

const statusColors: Record<string, string> = {
  PENDING: 'default',
  PROCESSING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
}

const columns: ColumnsType<Scan> = [
  {
    title: 'Case No.',
    dataIndex: 'case_number',
    key: 'case_number',
    render: (val: string) => <Text strong>{val}</Text>,
  },
  {
    title: 'Patient Name',
    dataIndex: 'patient_name',
    key: 'patient_name',
  },
  {
    title: 'File / Title',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: 'Notes',
    dataIndex: 'notes',
    key: 'notes',
    ellipsis: true,
    render: (val: string) => val || <Text type="secondary">—</Text>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (val: string) => (
      <Badge status={statusColors[val] as 'default' | 'processing' | 'success' | 'error'} text={val} />
    ),
  },
  {
    title: 'Submitted',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (val: string) => new Date(val).toLocaleDateString(),
  },
]

export default function DoctorDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/scans/')
      .then((res) => setScans(res.data.results ?? res.data))
      .catch(() => setScans([]))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    dispatch(clearCredentials())
    navigate('/login')
  }

  const userMenu: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true, onClick: handleLogout },
  ]

  const initials = user
    ? `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}`.toUpperCase()
    : 'D'

  const pending = scans.filter((s) => s.status === 'PENDING').length
  const processing = scans.filter((s) => s.status === 'PROCESSING').length
  const completed = scans.filter((s) => s.status === 'COMPLETED').length

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Navbar */}
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
          MedPrint <Text style={{ color: '#1677ff', fontSize: 20 }}>3D</Text>
          <Text style={{ color: '#aaa', fontSize: 13, marginLeft: 12 }}>Doctor Portal</Text>
        </Text>
        <Space size="middle">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/doctor/upload')}
          >
            New Case
          </Button>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
            <Avatar style={{ background: '#1677ff', cursor: 'pointer', fontWeight: 600 }} size={36}>
              {initials}
            </Avatar>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '36px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #001529 0%, #003a70 60%, #005eb8 100%)',
            borderRadius: 16,
            padding: '28px 36px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <Text style={{ color: '#b0c8e8', fontSize: 14 }}>Doctor Portal</Text>
            <Title level={3} style={{ color: '#fff', margin: '4px 0 6px' }}>
              Dr. {user?.first_name} {user?.last_name}
            </Title>
            <Text style={{ color: '#8bbde8', fontSize: 13 }}>{user?.email}</Text>
          </div>
          <Button
            size="large"
            icon={<CloudUploadOutlined />}
            style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
            onClick={() => navigate('/doctor/upload')}
          >
            Upload CT Scan
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
          {[
            { title: 'Total Cases', value: scans.length, color: '#1677ff' },
            { title: 'Pending', value: pending, color: '#faad14' },
            { title: 'Processing', value: processing, color: '#1677ff' },
            { title: 'Completed', value: completed, color: '#52c41a' },
          ].map((s) => (
            <Col key={s.title} xs={12} sm={6}>
              <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}>
                <Statistic
                  title={<Text type="secondary">{s.title}</Text>}
                  value={s.value}
                  valueStyle={{ color: s.color, fontSize: 28, fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Cases Table */}
        <Card
          style={{ borderRadius: 12 }}
          title={
            <Space>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Text strong>My Cases</Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/doctor/upload')}
            >
              New Case
            </Button>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
            </div>
          ) : scans.length === 0 ? (
            <Empty
              description="No cases yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/doctor/upload')}>
                Upload your first scan
              </Button>
            </Empty>
          ) : (
            <Table
              dataSource={scans}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 700 }}
            />
          )}
        </Card>
      </Content>

      <Footer style={{ background: '#f5f7fa', textAlign: 'center', padding: '20px 32px', borderTop: '1px solid #e8e8e8' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          &copy; {new Date().getFullYear()} MedPrint 3D. All rights reserved.
        </Text>
      </Footer>
    </Layout>
  )
}
