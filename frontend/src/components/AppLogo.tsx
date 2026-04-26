import { Link } from 'react-router-dom'

interface AppLogoProps {
  size?: number
  linkTo?: string
}

export default function AppLogo({ size = 30, linkTo }: AppLogoProps) {
  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', textDecoration: 'none' }}>
      <img
        src={`/favicon.svg?v=2`}
        alt="MedTechPrint 3D"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), flexShrink: 0 }}
      />
      <span style={{ fontWeight: 700, fontSize: size * 0.63, color: '#fff', letterSpacing: 0.5, lineHeight: 1 }}>
        MedTechPrint&nbsp;<span style={{ color: '#4096ff' }}>3D</span>
      </span>
    </span>
  )

  if (linkTo) {
    return <Link to={linkTo} style={{ textDecoration: 'none' }}>{inner}</Link>
  }
  return inner
}
