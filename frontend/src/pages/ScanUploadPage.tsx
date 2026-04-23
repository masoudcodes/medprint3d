import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  Progress,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import api from '../services/apiService'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Dragger } = Upload

const SERVICE_OPTIONS = [
  { value: 'ANATOMICAL_MODEL', label: 'Anatomical Model' },
  { value: 'MAXILLOFACIAL', label: 'Maxillofacial Reconstruction' },
  { value: 'TITANIUM_PLATE', label: 'Titanium Plate Pre-bending' },
  { value: 'CRANIOPLASTY', label: 'Cranioplasty Reconstruction' },
  { value: 'OSTEOTOMY', label: 'Osteotomy Surgical Guide' },
  { value: 'IMPLANTS', label: 'Cranial & Maxillofacial Implants' },
]

interface UploadFormValues {
  case_number: string
  patient_name: string
  title: string
  service_type: string
  notes: string
}

export default function ScanUploadPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [dicomFile, setDicomFile] = useState<UploadFile | null>(null)
  const [extraFiles, setExtraFiles] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const beforeUpload = (file: UploadFile) => {
    setDicomFile(file as UploadFile)
    return false // prevent auto-upload
  }

  const onFinish = async (values: UploadFormValues) => {
    if (!dicomFile) {
      setError('Please attach a DICOM file before submitting.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('case_number', values.case_number)
    formData.append('patient_name', values.patient_name)
    formData.append('title', values.title)
    formData.append('notes', values.notes ?? '')
    formData.append('dicom_file', dicomFile as unknown as Blob)
    for (const f of extraFiles) {
      formData.append('dicom_files', f as unknown as Blob)
    }

    try {
      await api.post('/scans/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      setSuccess(true)
      setUploadProgress(0)
      form.resetFields()
      setDicomFile(null)
      setExtraFiles([])
      setTimeout(() => navigate('/doctor/dashboard'), 1500)
    } catch (err: unknown) {
      setUploadProgress(0)
      const axiosErr = err as { response?: { data?: Record<string, string | string[]> } }
      const data = axiosErr?.response?.data
      if (data) {
        const firstMsg = Object.values(data)[0]
        setError(Array.isArray(firstMsg) ? firstMsg[0] : (firstMsg as string))
      } else {
        setError('Upload failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

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
          MedTechPrint <Text style={{ color: '#1677ff', fontSize: 20 }}>3D</Text>
          <Text style={{ color: '#aaa', fontSize: 13, marginLeft: 12 }}>Doctor Portal</Text>
        </Text>
        <Button
          icon={<ArrowLeftOutlined />}
          style={{ color: '#fff', borderColor: '#555', background: 'transparent' }}
          onClick={() => navigate('/doctor/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Header>

      <Content style={{ padding: '40px 32px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0 }}>
            <CloudUploadOutlined style={{ color: '#1677ff', marginRight: 10 }} />
            Upload New CT Scan
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
            Fill in the case details and attach the DICOM file. The admin team will process your
            submission and update the status.
          </Paragraph>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}
        {success && (
          <Alert
            message="Scan submitted successfully! Redirecting to dashboard…"
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '32px 36px' } }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="large"
          >
            {/* Case Info */}
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 15 }}>Case Information</Text>
            </div>

            <Space style={{ width: '100%' }} direction="vertical" size={0}>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  label="Case Number"
                  name="case_number"
                  style={{ flex: 1, marginRight: 12 }}
                  rules={[{ required: true, message: 'Please enter a case number' }]}
                >
                  <Input placeholder="e.g. CASE-2024-001" />
                </Form.Item>

                <Form.Item
                  label="Patient Name"
                  name="patient_name"
                  style={{ flex: 1 }}
                  rules={[{ required: true, message: 'Please enter the patient name' }]}
                >
                  <Input placeholder="Full name" />
                </Form.Item>
              </Space.Compact>
            </Space>

            <Form.Item
              label="File Name / Title"
              name="title"
              rules={[{ required: true, message: 'Please enter a file name or title' }]}
            >
              <Input placeholder="e.g. CT_Skull_Lateral_20240401.dcm" />
            </Form.Item>

            <Form.Item
              label="Service Required"
              name="service_type"
              rules={[{ required: true, message: 'Please select a service type' }]}
            >
              <Select placeholder="Select the printing service needed" options={SERVICE_OPTIONS} />
            </Form.Item>

            {/* Notes */}
            <div style={{ marginBottom: 8, marginTop: 8 }}>
              <Text strong style={{ fontSize: 15 }}>Specifications & Notes</Text>
            </div>

            <Form.Item
              label="Doctor's Notes"
              name="notes"
            >
              <TextArea
                rows={4}
                placeholder="Add any printing specifications, material preferences, scaling requirements, anatomical highlights, or special instructions for the admin team…"
              />
            </Form.Item>

            {/* DICOM Upload */}
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 15 }}>DICOM Files</Text>
            </div>

            <Form.Item label="Primary DICOM file (required)">
              <Dragger
                beforeUpload={beforeUpload as (file: UploadFile) => boolean}
                maxCount={1}
                fileList={dicomFile ? [dicomFile] : []}
                onRemove={() => setDicomFile(null)}
                accept=".dcm,.dicom,.zip"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#1677ff', fontSize: 40 }} />
                </p>
                <p className="ant-upload-text">Click or drag your primary DICOM file here</p>
                <p className="ant-upload-hint">
                  Supports .dcm, .dicom, or .zip archive of DICOM series. Max file size 500 MB.
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item label="Additional DICOM files (optional)">
              <Dragger
                beforeUpload={(file: UploadFile) => { setExtraFiles((prev) => [...prev, file]); return false }}
                multiple
                fileList={extraFiles}
                onRemove={(file) => setExtraFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
                accept=".dcm,.dicom,.zip"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#52c41a', fontSize: 36 }} />
                </p>
                <p className="ant-upload-text">Attach extra DICOM series or supplementary files</p>
                <p className="ant-upload-hint">Multiple files accepted. All will be included in the conversion.</p>
              </Dragger>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<CloudUploadOutlined />}
                    style={{ height: 44, paddingInline: 32 }}
                  >
                    Submit Case
                  </Button>
                  <Button
                    style={{ height: 44 }}
                    onClick={() => navigate('/doctor/dashboard')}
                  >
                    Cancel
                  </Button>
                </Space>
                {loading && uploadProgress > 0 && (
                  <Progress
                    percent={uploadProgress}
                    status="active"
                    style={{ maxWidth: 400 }}
                  />
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  )
}
