import { useEffect, useRef, useState } from 'react'
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
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import STLViewer from '../components/STLViewer'
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
  admin_notes: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  model_file: string | null
  dev_model_file: string | null
  created_at: string
}

const statusBadge: Record<string, 'default' | 'processing' | 'success' | 'error'> = {
  PENDING: 'default',
  PROCESSING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
}

const SERVICE_OPTIONS = [
  { value: 'ANATOMICAL_MODEL', label: 'CT to anatomical models' },
  { value: 'MAXILLOFACIAL', label: 'Maxillofacial reconstruction' },
  { value: 'TITANIUM_PLATE', label: 'Titanium plate pre-bending' },
  { value: 'CRANIOPLASTY', label: 'Cranioplasty reconstruction' },
  { value: 'OSTEOTOMY', label: 'Osteotomy surgical guides' },
  { value: 'IMPLANTS', label: 'Cranial & maxillofacial implants' },
]

export default function DoctorDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const [notifApi, notifCtx] = notification.useNotification()

  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [orderModal, setOrderModal] = useState<{ open: boolean; scan: Scan | null }>({ open: false, scan: null })
  const [orderService, setOrderService] = useState<string | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [previewScan, setPreviewScan] = useState<Scan | null>(null)
  const [devPreviewScan, setDevPreviewScan] = useState<Scan | null>(null)

  const scansRef = useRef<Scan[]>([])
  scansRef.current = scans

  // ------------------------------------------------------------------ //
  // Fetch scans
  // ------------------------------------------------------------------ //
  const fetchScans = () => {
    api.get('/scans/')
      .then((res) => setScans(res.data.results ?? res.data))
      .catch(() => setScans([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchScans() }, [])

  // ------------------------------------------------------------------ //
  // Poll every 5s for PROCESSING scans
  // ------------------------------------------------------------------ //
  useEffect(() => {
    const hasProcessing = scans.some((s) => s.status === 'PROCESSING')
    if (!hasProcessing) return

    const interval = setInterval(async () => {
      const processing = scansRef.current.filter((s) => s.status === 'PROCESSING')
      if (processing.length === 0) { clearInterval(interval); return }

      await Promise.all(
        processing.map(async (s) => {
          try {
            const res = await api.get<Scan>(`/scans/${s.id}/`)
            const updated = res.data
            if (updated.status !== 'PROCESSING') {
              setScans((prev) => prev.map((x) => x.id === updated.id ? updated : x))
              if (updated.status === 'COMPLETED') {
                notifApi.success({
                  message: '3D Model Ready!',
                  description: `Case ${updated.case_number} has been converted. You can now request a print.`,
                  duration: 8,
                })
              } else if (updated.status === 'FAILED') {
                notifApi.error({
                  message: 'Conversion Failed',
                  description: `Case ${updated.case_number} could not be converted. Contact admin.`,
                  duration: 8,
                })
              }
            }
          } catch (_) { /* ignore */ }
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [scans])

  // ------------------------------------------------------------------ //
  // Request print order
  // ------------------------------------------------------------------ //
  const handleRequestPrint = async () => {
    if (!orderModal.scan || !orderService) return
    setOrderLoading(true)
    try {
      await api.post('/orders/', {
        service: orderService,
        notes: `Print request for case ${orderModal.scan.case_number} — ${orderModal.scan.patient_name}`,
        scan: orderModal.scan.id,
      })
      notifApi.success({
        message: 'Print Requested',
        description: `Order submitted for case ${orderModal.scan.case_number}. Admin will process it shortly.`,
      })
      setOrderModal({ open: false, scan: null })
      setOrderService(null)
    } catch {
      notifApi.error({ message: 'Failed to submit order', description: 'Please try again.' })
    } finally {
      setOrderLoading(false)
    }
  }

  // ------------------------------------------------------------------ //
  // Logout
  // ------------------------------------------------------------------ //
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

  // ------------------------------------------------------------------ //
  // Table columns
  // ------------------------------------------------------------------ //
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
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val
        ? <Tooltip title={val}><Text ellipsis style={{ maxWidth: 160 }}>{val}</Text></Tooltip>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Admin Feedback',
      dataIndex: 'admin_notes',
      key: 'admin_notes',
      ellipsis: true,
      render: (val: string) => val
        ? (
          <Tooltip title={val}>
            <Space size={4}>
              <MessageOutlined style={{ color: '#faad14' }} />
              <Text ellipsis style={{ maxWidth: 160 }}>{val}</Text>
            </Space>
          </Tooltip>
        )
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        if (val === 'PROCESSING') {
          return (
            <Space>
              <Spin indicator={<LoadingOutlined />} size="small" />
              <Badge status="processing" text="Converting…" />
            </Space>
          )
        }
        return <Badge status={statusBadge[val] ?? 'default'} text={val.charAt(0) + val.slice(1).toLowerCase()} />
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_: unknown, record: Scan) => {
        if (record.status === 'COMPLETED' && record.model_file) {
          return (
            <Space wrap>
              <Tooltip title="View raw 3D scan">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setPreviewScan(record)}
                >
                  Raw Preview
                </Button>
              </Tooltip>
              {record.dev_model_file && (
                <Tooltip title="View development-ready model">
                  <Button
                    size="small"
                    type="primary"
                    icon={<ToolOutlined />}
                    onClick={() => setDevPreviewScan(record)}
                  >
                    Dev Preview
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Request 3D print">
                <Button
                  size="small"
                  icon={<ShoppingCartOutlined />}
                  onClick={() => {
                    setOrderModal({ open: true, scan: record })
                    setOrderService(null)
                  }}
                >
                  Print
                </Button>
              </Tooltip>
            </Space>
          )
        }
        if (record.status === 'FAILED') {
          return <Tag color="error">Conversion failed — contact admin</Tag>
        }
        if (record.status === 'PROCESSING') {
          return <Text type="secondary" style={{ fontSize: 12 }}>Processing…</Text>
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>Awaiting admin</Text>
      },
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {notifCtx}

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
          MedTechPrint <Text style={{ color: '#1677ff', fontSize: 20 }}>3D</Text>
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
              {processing > 0 && (
                <Badge count={`${processing} converting`} style={{ background: '#1677ff' }} />
              )}
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
            <Empty description="No cases yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
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
              scroll={{ x: 900 }}
              rowClassName={(r) => r.status === 'COMPLETED' ? 'completed-row' : ''}
            />
          )}
        </Card>
      </Content>

      <Footer style={{ background: '#f5f7fa', textAlign: 'center', padding: '20px 32px', borderTop: '1px solid #e8e8e8' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          &copy; {new Date().getFullYear()} MedTechPrint 3D. All rights reserved.
        </Text>
      </Footer>

      {/* Raw STL Preview Modal — view only, no download */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1677ff' }} />
            Raw Scan Preview — {previewScan?.case_number}
          </Space>
        }
        open={!!previewScan}
        onCancel={() => setPreviewScan(null)}
        footer={<Button onClick={() => setPreviewScan(null)}>Close</Button>}
        width={680}
        destroyOnHidden
      >
        {previewScan?.model_file && (
          <STLViewer url={previewScan.model_file} width={628} height={420} />
        )}
      </Modal>

      {/* Development-Ready Preview Modal — view only, no download */}
      <Modal
        title={
          <Space>
            <ToolOutlined style={{ color: '#52c41a' }} />
            Development Preview — {devPreviewScan?.case_number}
          </Space>
        }
        open={!!devPreviewScan}
        onCancel={() => setDevPreviewScan(null)}
        footer={<Button onClick={() => setDevPreviewScan(null)}>Close</Button>}
        width={680}
        destroyOnHidden
      >
        {devPreviewScan?.dev_model_file && (
          <STLViewer url={devPreviewScan.dev_model_file} width={628} height={420} />
        )}
      </Modal>

      {/* Request Print Modal */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: '#1677ff' }} />
            Request 3D Print
          </Space>
        }
        open={orderModal.open}
        onCancel={() => { setOrderModal({ open: false, scan: null }); setOrderService(null) }}
        onOk={handleRequestPrint}
        okText="Submit Request"
        okButtonProps={{ disabled: !orderService, loading: orderLoading }}
        destroyOnClose
      >
        {orderModal.scan && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">Case</Text>
              <div>
                <Text strong>{orderModal.scan.case_number}</Text>
                <Text type="secondary"> — {orderModal.scan.patient_name}</Text>
              </div>
            </div>

            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text style={{ color: '#389e0d', fontSize: 13 }}>
                3D model is ready for printing
              </Text>
            </div>

            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                Select service type <Text type="danger">*</Text>
              </Text>
              <Select
                placeholder="Choose a service"
                style={{ width: '100%' }}
                value={orderService}
                onChange={setOrderService}
                options={SERVICE_OPTIONS}
              />
            </div>
          </Space>
        )}
      </Modal>
    </Layout>
  )
}
