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
  Input,
  Layout,
  Upload,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  DownloadOutlined,
  FileOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  LoadingOutlined,
  LogoutOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { clearCredentials } from '../store/authSlice'
import type { RootState } from '../store/store'
import api from '../services/apiService'

const { Header, Content, Footer } = Layout
const { Title, Text, Link } = Typography

interface Doctor {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface Scan {
  id: string
  doctor: Doctor
  case_number: string
  patient_name: string
  title: string
  notes: string
  admin_notes: string
  dicom_file: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  model_file: string | null
  dev_model_file: string | null
  created_at: string
  updated_at: string
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
]

const statusBadge: Record<string, 'default' | 'processing' | 'success' | 'error'> = {
  PENDING: 'default',
  PROCESSING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
}

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const [notifApi, notifCtx] = notification.useNotification()

  const [scans, setScans] = useState<Scan[]>([])
  const [filtered, setFiltered] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('files')
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
  const [uploadingDevId, setUploadingDevId] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])

  const scansRef = useRef<Scan[]>([])
  scansRef.current = scans
  const fetchScansRef = useRef<() => void>(() => {})

  // ------------------------------------------------------------------ //
  // Fetch all scans
  // ------------------------------------------------------------------ //
  const fetchScans = () => {
    setLoading(true)
    api.get('/scans/')
      .then((res) => {
        const data: Scan[] = res.data.results ?? res.data
        setScans(data)
        applyDoctorFilter(data, selectedDoctor)
      })
      .catch(() => { setScans([]); setFiltered([]) })
      .finally(() => setLoading(false))
  }
  fetchScansRef.current = fetchScans

  useEffect(() => {
    api.get('/auth/doctors/')
      .then((res) => setDoctors(res.data))
      .catch(() => {})
    fetchScans()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => fetchScansRef.current(), 30_000)
    return () => clearInterval(id)
  }, [])

  // ------------------------------------------------------------------ //
  // Poll every 5 s when any scan is PROCESSING
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
              setFiltered((prev) => prev.map((x) => x.id === updated.id ? updated : x))
              setConvertingIds((prev) => { const n = new Set(prev); n.delete(updated.id); return n })

              if (updated.status === 'COMPLETED') {
                notifApi.success({
                  message: 'Conversion complete',
                  description: `Case ${updated.case_number} — 3D model is ready to download.`,
                })
              } else if (updated.status === 'FAILED') {
                notifApi.error({
                  message: 'Conversion failed',
                  description: `Case ${updated.case_number} — Slicer could not process the DICOM file.`,
                })
              }
            }
          } catch (_) { /* ignore individual poll errors */ }
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [scans])

  // ------------------------------------------------------------------ //
  // Doctor filter
  // ------------------------------------------------------------------ //
  const applyDoctorFilter = (data: Scan[], doctorId: string | null) => {
    setFiltered(doctorId ? data.filter((s) => s.doctor?.id === doctorId) : data)
  }

  const handleDoctorFilter = (doctorId: string | null) => {
    setSelectedDoctor(doctorId)
    applyDoctorFilter(scans, doctorId)
  }

  // ------------------------------------------------------------------ //
  // Manual status update
  // ------------------------------------------------------------------ //
  const handleStatusChange = async (scanId: string, newStatus: string) => {
    setUpdatingId(scanId)
    try {
      const res = await api.patch(`/scans/${scanId}/update-status/`, { status: newStatus })
      setScans((prev) => prev.map((s) => s.id === scanId ? { ...s, status: res.data.status } : s))
      setFiltered((prev) => prev.map((s) => s.id === scanId ? { ...s, status: res.data.status } : s))
    } finally {
      setUpdatingId(null)
    }
  }

  // ------------------------------------------------------------------ //
  // Upload dev model
  // ------------------------------------------------------------------ //
  const handleUploadDevModel = async (scan: Scan, file: File) => {
    setUploadingDevId(scan.id)
    const formData = new FormData()
    formData.append('dev_model_file', file)
    try {
      const res = await api.patch<Scan>(`/scans/${scan.id}/upload-dev-model/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setScans((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      setFiltered((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      notifApi.success({ message: 'Dev model uploaded', description: `Case ${scan.case_number} — development preview is now visible to the doctor.` })
    } catch {
      notifApi.error({ message: 'Upload failed', description: 'Could not upload the development model.' })
    } finally {
      setUploadingDevId(null)
    }
  }

  // ------------------------------------------------------------------ //
  // Save admin notes
  // ------------------------------------------------------------------ //
  const handleSaveAdminNote = async (scan: Scan) => {
    const note = adminNoteDrafts[scan.id] ?? scan.admin_notes
    setSavingNoteId(scan.id)
    try {
      const res = await api.patch<Scan>(`/scans/${scan.id}/admin-notes/`, { admin_notes: note })
      setScans((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      setFiltered((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      notifApi.success({ message: 'Notes saved', description: `Feedback sent to Dr. ${scan.doctor?.last_name}.` })
    } catch {
      notifApi.error({ message: 'Failed to save notes' })
    } finally {
      setSavingNoteId(null)
    }
  }

  // ------------------------------------------------------------------ //
  // Trigger Slicer conversion
  // ------------------------------------------------------------------ //
  const handleConvert = async (scan: Scan) => {
    setConvertingIds((prev) => new Set(prev).add(scan.id))
    try {
      const res = await api.post<Scan>(`/scans/${scan.id}/convert/`)
      setScans((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      setFiltered((prev) => prev.map((s) => s.id === scan.id ? res.data : s))
      notifApi.info({
        message: 'Conversion started',
        description: `Case ${scan.case_number} — Slicer is running in the background. This page will update automatically.`,
        duration: 6,
      })
    } catch (err: unknown) {
      setConvertingIds((prev) => { const n = new Set(prev); n.delete(scan.id); return n })
      const e = err as { response?: { data?: { error?: string } } }
      notifApi.error({
        message: 'Could not start conversion',
        description: e?.response?.data?.error ?? 'Unknown error.',
      })
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
    : 'A'

  // ------------------------------------------------------------------ //
  // Helper: DICOM filename from URL
  // ------------------------------------------------------------------ //
  const getFilename = (url: string | null) => {
    if (!url) return null
    return url.split('/').pop() ?? url
  }

  // ------------------------------------------------------------------ //
  // "Uploaded Files" tab columns
  // ------------------------------------------------------------------ //
  const fileColumns: ColumnsType<Scan> = [
    {
      title: 'Case No.',
      dataIndex: 'case_number',
      key: 'case_number',
      width: 120,
      render: (val: string) => <Text strong>{val}</Text>,
      sorter: (a, b) => a.case_number.localeCompare(b.case_number),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      width: 180,
      render: (_: unknown, record: Scan) =>
        record.doctor ? (
          <Space>
            <Avatar size={26} style={{ background: '#1677ff', fontSize: 11 }}>
              {record.doctor.first_name?.charAt(0)}{record.doctor.last_name?.charAt(0)}
            </Avatar>
            <Text>Dr. {record.doctor.first_name} {record.doctor.last_name}</Text>
          </Space>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      width: 160,
    },
    {
      title: 'Uploaded DICOM File',
      dataIndex: 'dicom_file',
      key: 'dicom_file',
      render: (url: string | null) => {
        if (!url) return <Text type="secondary">No file</Text>
        const filename = getFilename(url)
        return (
          <Space>
            <FileOutlined style={{ color: '#1677ff' }} />
            <Tooltip title={filename}>
              <Link href={url} target="_blank" rel="noopener noreferrer" ellipsis style={{ maxWidth: 200 }}>
                {filename}
              </Link>
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: 'STL Model',
      dataIndex: 'model_file',
      key: 'model_file',
      width: 160,
      render: (url: string | null) => {
        if (!url) return <Text type="secondary">Not generated</Text>
        const filename = getFilename(url)
        return (
          <Space>
            <FolderOpenOutlined style={{ color: '#52c41a' }} />
            <Tooltip title={filename}>
              <Link href={url} target="_blank" rel="noopener noreferrer" ellipsis style={{ maxWidth: 140 }}>
                {filename}
              </Link>
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val: string) => (
        <Badge status={statusBadge[val] ?? 'default'} text={val.charAt(0) + val.slice(1).toLowerCase()} />
      ),
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (val: string) => new Date(val).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 240,
      render: (_: unknown, record: Scan) => {
        const isConverting = convertingIds.has(record.id) || record.status === 'PROCESSING'
        const isDone = record.status === 'COMPLETED'

        return (
          <Space wrap>
            {/* Always show DICOM download when file exists */}
            {record.dicom_file && (
              <Tooltip title="Download original DICOM file">
                <Button
                  size="small"
                  icon={<CloudDownloadOutlined />}
                  href={record.dicom_file}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DICOM
                </Button>
              </Tooltip>
            )}

            {/* Conversion controls */}
            {isConverting ? (
              <Space>
                <Spin indicator={<LoadingOutlined />} size="small" />
                <Text type="secondary" style={{ fontSize: 11 }}>Converting…</Text>
              </Space>
            ) : isDone && record.model_file ? (
              <Space wrap>
                <Button
                  size="small"
                  type="primary"
                  icon={<DownloadOutlined />}
                  href={record.model_file}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  STL
                </Button>
                <Tooltip title={record.dev_model_file ? 'Replace dev model' : 'Upload development-ready STL for doctor preview'}>
                  <Upload
                    accept=".stl"
                    showUploadList={false}
                    beforeUpload={(file) => { handleUploadDevModel(record, file); return false }}
                  >
                    <Button
                      size="small"
                      icon={uploadingDevId === record.id ? <LoadingOutlined /> : <UploadOutlined />}
                      loading={uploadingDevId === record.id}
                      style={{ borderColor: record.dev_model_file ? '#52c41a' : undefined, color: record.dev_model_file ? '#52c41a' : undefined }}
                    >
                      {record.dev_model_file ? <><ToolOutlined /> Dev ✓</> : 'Upload Dev'}
                    </Button>
                  </Upload>
                </Tooltip>
              </Space>
            ) : (
              <Popconfirm
                title="Convert DCM → STL via 3D Slicer?"
                description={
                  record.status === 'FAILED'
                    ? 'Previous attempt failed. Retry with Slicer?'
                    : 'This will run 3D Slicer headlessly on this DICOM scan.'
                }
                onConfirm={() => handleConvert(record)}
                okText="Convert"
                cancelText="Cancel"
                disabled={!record.dicom_file}
              >
                <Button
                  size="small"
                  type={record.status === 'FAILED' ? 'default' : 'dashed'}
                  icon={<ThunderboltOutlined />}
                  disabled={!record.dicom_file}
                  danger={record.status === 'FAILED'}
                >
                  Convert to STL
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  // ------------------------------------------------------------------ //
  // "All Cases" tab columns
  // ------------------------------------------------------------------ //
  const caseColumns: ColumnsType<Scan> = [
    {
      title: 'Case No.',
      dataIndex: 'case_number',
      key: 'case_number',
      render: (val: string) => <Text strong>{val}</Text>,
      sorter: (a, b) => a.case_number.localeCompare(b.case_number),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, record: Scan) =>
        record.doctor ? (
          <Space>
            <Avatar size={26} style={{ background: '#1677ff', fontSize: 11 }}>
              {record.doctor.first_name?.charAt(0)}{record.doctor.last_name?.charAt(0)}
            </Avatar>
            <Text>Dr. {record.doctor.first_name} {record.doctor.last_name}</Text>
          </Space>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <Text ellipsis style={{ maxWidth: 160 }}>{val}</Text>
          </Tooltip>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Admin Notes',
      key: 'admin_notes',
      width: 260,
      render: (_: unknown, record: Scan) => {
        const draft = adminNoteDrafts[record.id] ?? record.admin_notes ?? ''
        const isDirty = draft !== (record.admin_notes ?? '')
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Input.TextArea
              value={draft}
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="Write feedback for doctor…"
              onChange={(e) =>
                setAdminNoteDrafts((prev) => ({ ...prev, [record.id]: e.target.value }))
              }
            />
            <Button
              type={isDirty ? 'primary' : 'default'}
              loading={savingNoteId === record.id}
              disabled={!isDirty}
              onClick={() => handleSaveAdminNote(record)}
            >
              Save
            </Button>
          </Space.Compact>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string, record: Scan) => (
        <Select
          value={val}
          size="small"
          loading={updatingId === record.id}
          style={{ width: 136 }}
          onChange={(v) => handleStatusChange(record.id, v)}
          options={STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: <Badge status={statusBadge[o.value]} text={o.label} />,
          }))}
        />
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 230,
      render: (_: unknown, record: Scan) => {
        const isConverting = convertingIds.has(record.id) || record.status === 'PROCESSING'
        const isDone = record.status === 'COMPLETED'

        return (
          <Space wrap>
            {record.dicom_file && (
              <Tooltip title="Download uploaded DICOM file">
                <Button
                  size="small"
                  icon={<CloudDownloadOutlined />}
                  href={record.dicom_file}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DICOM
                </Button>
              </Tooltip>
            )}

            {isConverting ? (
              <Space>
                <Spin indicator={<LoadingOutlined />} size="small" />
                <Text type="secondary" style={{ fontSize: 11 }}>Converting…</Text>
              </Space>
            ) : isDone && record.model_file ? (
              <Button
                size="small"
                type="primary"
                icon={<DownloadOutlined />}
                href={record.model_file}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download STL
              </Button>
            ) : (
              <Popconfirm
                title="Start 3D conversion?"
                description={
                  record.status === 'FAILED'
                    ? 'Previous attempt failed. Retry with Slicer?'
                    : 'This will run 3D Slicer on this DICOM scan.'
                }
                onConfirm={() => handleConvert(record)}
                okText="Convert"
                cancelText="Cancel"
              >
                <Button
                  size="small"
                  icon={<ThunderboltOutlined />}
                  disabled={!record.dicom_file}
                >
                  Convert to 3D
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  const pending = scans.filter((s) => s.status === 'PENDING').length
  const processing = scans.filter((s) => s.status === 'PROCESSING').length
  const completed = scans.filter((s) => s.status === 'COMPLETED').length
  const withDicom = scans.filter((s) => !!s.dicom_file).length

  const doctorFilterExtra = (
    <Select
      allowClear
      placeholder="Filter by doctor"
      style={{ width: 220 }}
      value={selectedDoctor}
      onChange={handleDoctorFilter}
      options={doctors.map((d) => ({
        value: d.id,
        label: `Dr. ${d.first_name} ${d.last_name}`,
      }))}
    />
  )

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
          <Text style={{ color: '#aaa', fontSize: 13, marginLeft: 12 }}>Admin Portal</Text>
        </Text>
        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            style={{ color: '#fff', borderColor: '#555', background: 'transparent' }}
            onClick={() => fetchScans()}
          >
            Refresh
          </Button>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
            <Avatar style={{ background: '#722ed1', cursor: 'pointer', fontWeight: 600 }} size={36}>
              {initials}
            </Avatar>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '36px 32px', maxWidth: 1500, margin: '0 auto', width: '100%' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #120338 0%, #3a0070 60%, #5e00b8 100%)',
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
            <Text style={{ color: '#d0b8e8', fontSize: 14 }}>Admin Portal</Text>
            <Title level={3} style={{ color: '#fff', margin: '4px 0 6px' }}>
              {user?.first_name} {user?.last_name}
            </Title>
            <Text style={{ color: '#c0a8e8', fontSize: 13 }}>{user?.email}</Text>
          </div>
          <Tag color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>
            <CheckCircleOutlined /> ADMIN
          </Tag>
        </div>

        {/* Stats */}
        <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
          {[
            { title: 'Total Cases', value: scans.length, color: '#1677ff' },
            { title: 'Doctors', value: doctors.length, color: '#722ed1' },
            { title: 'DICOM Files', value: withDicom, color: '#0958d9' },
            { title: 'Pending', value: pending, color: '#faad14' },
            { title: 'Processing', value: processing, color: '#1677ff' },
            { title: 'Completed', value: completed, color: '#52c41a' },
          ].map((s) => (
            <Col key={s.title} xs={12} sm={8} lg={4}>
              <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '18px 20px' } }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>{s.title}</Text>}
                  value={s.value}
                  valueStyle={{ color: s.color, fontSize: 26, fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Tabs */}
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ padding: '0 24px' }}
            tabBarExtraContent={doctorFilterExtra}
            items={[
              {
                key: 'files',
                label: (
                  <Space>
                    <FolderOpenOutlined />
                    Uploaded Files
                    <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>
                      {withDicom}
                    </Tag>
                  </Space>
                ),
                children: (
                  <div style={{ padding: '0 0 24px' }}>
                    {/* Tab header info */}
                    <div style={{
                      padding: '12px 0 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        All DICOM files uploaded by doctors. Download originals or trigger DCM → STL conversion via 3D Slicer.
                      </Text>
                      {processing > 0 && (
                        <Badge
                          count={`${processing} converting`}
                          style={{ background: '#1677ff' }}
                        />
                      )}
                    </div>

                    {loading ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <Empty
                        image={<FolderOpenOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                        description={
                          <Text type="secondary">
                            No uploaded files found
                            {selectedDoctor ? ' for the selected doctor' : ''}
                          </Text>
                        }
                      />
                    ) : (
                      <Table
                        dataSource={filtered}
                        columns={fileColumns}
                        rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        scroll={{ x: 1200 }}
                        rowClassName={(r) => r.status === 'PROCESSING' ? 'processing-row' : ''}
                        summary={() => (
                          <Table.Summary fixed>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {filtered.length} case{filtered.length !== 1 ? 's' : ''} shown
                                  {' · '}
                                  {filtered.filter(s => !!s.dicom_file).length} with DICOM file
                                  {' · '}
                                  {filtered.filter(s => s.status === 'COMPLETED').length} converted
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'cases',
                label: (
                  <Space>
                    <FilterOutlined />
                    All Cases
                    <Tag color="default" style={{ marginLeft: 4, fontSize: 11 }}>
                      {scans.length}
                    </Tag>
                  </Space>
                ),
                children: (
                  <div style={{ padding: '0 0 24px' }}>
                    <div style={{ padding: '12px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Full case details with status management.
                      </Text>
                      {processing > 0 && (
                        <Badge
                          count={`${processing} converting`}
                          style={{ background: '#1677ff' }}
                        />
                      )}
                    </div>

                    {loading ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <Empty description="No scans found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Table
                        dataSource={filtered}
                        columns={caseColumns}
                        rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        scroll={{ x: 1200 }}
                        rowClassName={(r) => r.status === 'PROCESSING' ? 'processing-row' : ''}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'converting',
                label: (
                  <Space>
                    <ThunderboltOutlined />
                    Converting
                    {processing > 0 && (
                      <Badge count={processing} style={{ background: '#1677ff', marginLeft: 4 }} />
                    )}
                  </Space>
                ),
                children: (
                  <div style={{ padding: '0 0 24px' }}>
                    <div style={{ padding: '12px 0 16px' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Scans currently being processed by 3D Slicer, or that have failed conversion.
                      </Text>
                    </div>

                    {loading ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                      </div>
                    ) : (() => {
                      const activeJobs = scans.filter(
                        (s) => s.status === 'PROCESSING' || s.status === 'FAILED' || convertingIds.has(s.id)
                      )
                      return activeJobs.length === 0 ? (
                        <Empty
                          image={<ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                          description={<Text type="secondary">No active conversions</Text>}
                        />
                      ) : (
                        <Table
                          dataSource={activeJobs}
                          columns={[
                            {
                              title: 'Case No.',
                              dataIndex: 'case_number',
                              key: 'case_number',
                              render: (val: string) => <Text strong>{val}</Text>,
                            },
                            {
                              title: 'Doctor',
                              key: 'doctor',
                              render: (_: unknown, record: Scan) =>
                                record.doctor ? (
                                  <Text>Dr. {record.doctor.first_name} {record.doctor.last_name}</Text>
                                ) : <Text type="secondary">—</Text>,
                            },
                            {
                              title: 'Patient',
                              dataIndex: 'patient_name',
                              key: 'patient_name',
                            },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              key: 'status',
                              render: (val: string) => (
                                <Badge status={statusBadge[val] ?? 'default'} text={val} />
                              ),
                            },
                            {
                              title: 'Last Updated',
                              dataIndex: 'updated_at',
                              key: 'updated_at',
                              render: (val: string) => new Date(val).toLocaleString(),
                            },
                            {
                              title: 'Action',
                              key: 'action',
                              render: (_: unknown, record: Scan) => {
                                const isConverting = convertingIds.has(record.id) || record.status === 'PROCESSING'
                                if (isConverting) {
                                  return (
                                    <Space>
                                      <Spin indicator={<LoadingOutlined />} size="small" />
                                      <Text type="secondary">Running…</Text>
                                    </Space>
                                  )
                                }
                                if (record.status === 'FAILED') {
                                  return (
                                    <Popconfirm
                                      title="Retry conversion?"
                                      onConfirm={() => handleConvert(record)}
                                      okText="Retry"
                                      cancelText="Cancel"
                                    >
                                      <Button size="small" danger icon={<ThunderboltOutlined />}>
                                        Retry
                                      </Button>
                                    </Popconfirm>
                                  )
                                }
                                return null
                              },
                            },
                          ]}
                          rowKey="id"
                          pagination={false}
                        />
                      )
                    })()}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Content>

      <Footer style={{ background: '#f5f7fa', textAlign: 'center', padding: '20px 32px', borderTop: '1px solid #e8e8e8' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          &copy; {new Date().getFullYear()} MedTechPrint 3D. All rights reserved.
        </Text>
      </Footer>
    </Layout>
  )
}
