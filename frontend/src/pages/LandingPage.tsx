import {
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd'
import {
  ApiOutlined,
  AuditOutlined,
  CloudUploadOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const services = [
  {
    key: 'ANATOMICAL_MODEL',
    title: 'Anatomical Models',
    tag: 'Most Popular',
    tagColor: 'blue',
    icon: <ExperimentOutlined style={{ fontSize: 36, color: '#1677ff' }} />,
    description:
      'Convert CT/DICOM scans into accurate, patient-specific anatomical models for surgical planning, education, and pre-operative simulation.',
    highlights: ['Full-color or monochrome', 'Sub-millimeter accuracy', 'Any body region'],
  },
  {
    key: 'MAXILLOFACIAL',
    title: 'Maxillofacial Reconstruction',
    tag: 'Surgical',
    tagColor: 'purple',
    icon: <MedicineBoxOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
    description:
      'Precision models and guides for maxillofacial and craniofacial reconstruction, enabling surgeons to rehearse complex procedures before the OR.',
    highlights: ['Jaw & facial bone models', 'Surgical rehearsal kits', 'Implant fit verification'],
  },
  {
    key: 'TITANIUM_PLATE',
    title: 'Titanium Plate Pre-bending',
    tag: 'Custom Fit',
    tagColor: 'gold',
    icon: <SettingOutlined style={{ fontSize: 36, color: '#d48806' }} />,
    description:
      'Patient-specific models used to pre-bend titanium plates to exact anatomical contours, drastically reducing intraoperative time.',
    highlights: ['Exact curvature matching', 'Reduces OR time', 'Sterile-compatible models'],
  },
  {
    key: 'CRANIOPLASTY',
    title: 'Cranioplasty Reconstruction',
    tag: 'Neurosurgery',
    tagColor: 'cyan',
    icon: <SafetyCertificateOutlined style={{ fontSize: 36, color: '#08979c' }} />,
    description:
      'Custom cranial reconstruction models and implant guides for cranioplasty procedures, designed from the patient\'s own CT data.',
    highlights: ['Mirror-image reconstruction', 'Defect size mapping', 'Implant shaping guides'],
  },
  {
    key: 'OSTEOTOMY',
    title: 'Osteotomy Surgical Guides',
    tag: 'Orthopedic',
    tagColor: 'green',
    icon: <AuditOutlined style={{ fontSize: 36, color: '#389e0d' }} />,
    description:
      'Patient-matched cutting guides for osteotomy procedures ensuring precise bone cuts and optimal alignment with planned corrections.',
    highlights: ['Bone-fitted alignment', 'Single-use sterile guides', 'Reduces fluoroscopy use'],
  },
  {
    key: 'IMPLANTS',
    title: 'Cranial & Maxillofacial Implants',
    tag: 'Advanced',
    tagColor: 'red',
    icon: <ThunderboltOutlined style={{ fontSize: 36, color: '#cf1322' }} />,
    description:
      'Custom-designed patient-specific implants for cranial and maxillofacial defects, manufactured to exact specifications from imaging data.',
    highlights: ['Patient-specific design', 'Biocompatible materials', 'Full-fit verification model'],
  },
]

const steps = [
  {
    title: 'Upload DICOM',
    description: 'Upload CT scan files securely through our platform.',
    icon: <CloudUploadOutlined />,
  },
  {
    title: 'Processing',
    description: 'Our system converts DICOM data into precise 3D models.',
    icon: <ApiOutlined />,
  },
  {
    title: 'Review & Order',
    description: 'Review the 3D model and select your service type.',
    icon: <AuditOutlined />,
  },
  {
    title: 'Delivered',
    description: 'Receive your printed model or surgical guide.',
    icon: <MedicineBoxOutlined />,
  },
]

export default function LandingPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Navbar */}
      <Header
        style={{
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Text strong style={{ color: '#fff', fontSize: 20, letterSpacing: 1 }}>
          MedPrint <Text style={{ color: '#1677ff', fontSize: 20 }}>3D</Text>
        </Text>
        <Space>
          <Button type="text" style={{ color: '#ccc' }}>
            Services
          </Button>
          <Button type="text" style={{ color: '#ccc' }}>
            How it Works
          </Button>
          <Button type="primary" href="/login">
            Sign In
          </Button>
        </Space>
      </Header>

      <Content>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #001529 0%, #003a70 60%, #005eb8 100%)',
            padding: '100px 40px',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <Tag color="blue" style={{ marginBottom: 16, fontSize: 13 }}>
            Medical-Grade 3D Printing
          </Tag>
          <Title style={{ color: '#fff', fontSize: 48, margin: '0 auto 20px', maxWidth: 700 }}>
            From CT Scan to Surgical-Ready in Days
          </Title>
          <Paragraph
            style={{
              color: '#b0c8e8',
              fontSize: 18,
              maxWidth: 600,
              margin: '0 auto 40px',
            }}
          >
            Upload DICOM data, get patient-specific anatomical models, surgical guides, and custom
            implants — precision-printed for the operating room.
          </Paragraph>
          <Space size="middle">
            <Button type="primary" size="large" href="/register">
              Upload a Scan
            </Button>
            <Button
              size="large"
              style={{ background: 'transparent', color: '#fff', borderColor: '#fff' }}
            >
              View Services
            </Button>
          </Space>
        </div>

        {/* Services Section */}
        <div style={{ padding: '80px 40px', background: '#f5f7fa' }} id="services">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag color="blue" style={{ marginBottom: 12, fontSize: 13 }}>
              What We Offer
            </Tag>
            <Title level={2} style={{ margin: 0 }}>
              Our Printing Services
            </Title>
            <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 16 }}>
              Six specialized services covering the full spectrum of medical 3D printing needs.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]} justify="center" style={{ maxWidth: 1200, margin: '0 auto' }}>
            {services.map((service) => (
              <Col key={service.key} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  style={{ height: '100%', borderRadius: 12 }}
                  styles={{ body: { padding: 28 } }}
                >
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div
                      style={{
                        background: '#f0f5ff',
                        borderRadius: 12,
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {service.icon}
                    </div>
                    <div>
                      <Space align="center" style={{ marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 17 }}>
                          {service.title}
                        </Text>
                        <Tag color={service.tagColor}>{service.tag}</Tag>
                      </Space>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 14 }}>
                        {service.description}
                      </Paragraph>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#555' }}>
                      {service.highlights.map((h) => (
                        <li key={h} style={{ fontSize: 13, marginBottom: 4 }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Button type="link" style={{ padding: 0 }}>
                      Learn more &rarr;
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* How it Works Section */}
        <div style={{ padding: '80px 40px', background: '#fff' }} id="how-it-works">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag color="blue" style={{ marginBottom: 12, fontSize: 13 }}>
              Simple Process
            </Tag>
            <Title level={2} style={{ margin: 0 }}>
              How It Works
            </Title>
            <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 16 }}>
              From scan upload to delivery in four straightforward steps.
            </Paragraph>
          </div>

          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Steps
              size="default"
              current={-1}
              items={steps.map((s) => ({
                title: <Text strong>{s.title}</Text>,
                description: <Text type="secondary">{s.description}</Text>,
                icon: s.icon,
              }))}
            />
          </div>
        </div>

        {/* CTA Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1677ff, #003a70)',
            padding: '70px 40px',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>
            Ready to get started?
          </Title>
          <Paragraph style={{ color: '#cce0ff', fontSize: 16, marginBottom: 32 }}>
            Create a free account, upload your first scan, and receive a quote within 24 hours.
          </Paragraph>
          <Button type="primary" size="large" style={{ background: '#fff', color: '#1677ff', borderColor: '#fff' }} href="/register">
            Create Free Account
          </Button>
        </div>
      </Content>

      {/* Footer */}
      <Footer style={{ background: '#001529', color: '#aaa', textAlign: 'center', padding: '28px 40px' }}>
        <Text style={{ color: '#aaa' }}>
          &copy; {new Date().getFullYear()} MedPrint 3D. All rights reserved.
        </Text>
      </Footer>
    </Layout>
  )
}
