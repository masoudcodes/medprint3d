import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Layout,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import {
  AuditOutlined,
  CloudUploadOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { clearCredentials } from '../store/authSlice'
import type { RootState } from '../store/store'

const { Header, Content, Footer } = Layout
const { Title, Text, Paragraph } = Typography

const services = [
  {
    key: 'ANATOMICAL_MODEL',
    title: 'Anatomical Models',
    tag: 'Most Popular',
    tagColor: 'blue',
    icon: <ExperimentOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
    bg: '#e6f4ff',
    description: 'Convert CT/DICOM scans into accurate patient-specific models.',
  },
  {
    key: 'MAXILLOFACIAL',
    title: 'Maxillofacial Reconstruction',
    tag: 'Surgical',
    tagColor: 'purple',
    icon: <MedicineBoxOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
    bg: '#f9f0ff',
    description: 'Precision models and guides for maxillofacial procedures.',
  },
  {
    key: 'TITANIUM_PLATE',
    title: 'Titanium Plate Pre-bending',
    tag: 'Custom Fit',
    tagColor: 'gold',
    icon: <SettingOutlined style={{ fontSize: 28, color: '#d48806' }} />,
    bg: '#fffbe6',
    description: 'Patient-specific models to pre-bend titanium plates.',
  },
  {
    key: 'CRANIOPLASTY',
    title: 'Cranioplasty Reconstruction',
    tag: 'Neurosurgery',
    tagColor: 'cyan',
    icon: <SafetyCertificateOutlined style={{ fontSize: 28, color: '#08979c' }} />,
    bg: '#e6fffb',
    description: 'Custom cranial reconstruction models and implant guides.',
  },
  {
    key: 'OSTEOTOMY',
    title: 'Osteotomy Surgical Guides',
    tag: 'Orthopedic',
    tagColor: 'green',
    icon: <AuditOutlined style={{ fontSize: 28, color: '#389e0d' }} />,
    bg: '#f6ffed',
    description: 'Patient-matched cutting guides for precise bone cuts.',
  },
  {
    key: 'IMPLANTS',
    title: 'Cranial & Maxillofacial Implants',
    tag: 'Advanced',
    tagColor: 'red',
    icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#cf1322' }} />,
    bg: '#fff1f0',
    description: 'Custom-designed patient-specific implants from imaging data.',
  },
]

const stats = [
  { title: 'Active Orders', value: 0, suffix: '', color: '#1677ff' },
  { title: 'Scans Uploaded', value: 0, suffix: '', color: '#722ed1' },
  { title: 'Completed', value: 0, suffix: '', color: '#389e0d' },
]

export default function DashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = () => {
    dispatch(clearCredentials())
    navigate('/login')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: handleLogout,
    },
  ]

  const initials =
    user
      ? `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}`.toUpperCase()
      : 'U'

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Top Nav */}
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

        <Space size="middle">
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => navigate('/upload')}
          >
            Upload Scan
          </Button>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Avatar
              style={{ background: '#1677ff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              size={36}
            >
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
            padding: '32px 36px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <Text style={{ color: '#b0c8e8', fontSize: 14 }}>Welcome back,</Text>
            <Title level={2} style={{ color: '#fff', margin: '4px 0 8px' }}>
              {user?.first_name} {user?.last_name}
            </Title>
            <Space>
              <Tag color="blue">{user?.role ?? 'PATIENT'}</Tag>
              <Text style={{ color: '#8bbde8', fontSize: 13 }}>{user?.email}</Text>
            </Space>
          </div>
          <Button
            size="large"
            icon={<PlusOutlined />}
            style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
            onClick={() => navigate('/orders/new')}
          >
            New Order
          </Button>
        </div>

        {/* Stats Row */}
        <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
          {stats.map((s) => (
            <Col key={s.title} xs={24} sm={8}>
              <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}>
                <Statistic
                  title={<Text type="secondary">{s.title}</Text>}
                  value={s.value}
                  suffix={s.suffix}
                  valueStyle={{ color: s.color, fontSize: 32, fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Services Section */}
        <div style={{ marginBottom: 20 }}>
          <Space align="center" style={{ marginBottom: 20 }}>
            <FileTextOutlined style={{ fontSize: 18, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              Available Services
            </Title>
          </Space>

          <Row gutter={[20, 20]}>
            {services.map((service) => (
              <Col key={service.key} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  style={{ borderRadius: 12, height: '100%' }}
                  styles={{ body: { padding: 24 } }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div
                      style={{
                        background: service.bg,
                        borderRadius: 10,
                        width: 52,
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {service.icon}
                    </div>
                    <div>
                      <Space align="center" style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 15 }}>
                          {service.title}
                        </Text>
                        <Badge color={service.tagColor} text={
                          <Tag color={service.tagColor} style={{ marginLeft: 0 }}>
                            {service.tag}
                          </Tag>
                        } />
                      </Space>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                        {service.description}
                      </Paragraph>
                    </div>
                    <Button
                      type="default"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/orders/new')}
                    >
                      Order this service
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>

      <Footer
        style={{
          background: '#f5f7fa',
          textAlign: 'center',
          padding: '20px 32px',
          borderTop: '1px solid #e8e8e8',
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          &copy; {new Date().getFullYear()} MedTechPrint 3D. All rights reserved.
        </Text>
      </Footer>
    </Layout>
  )
}
