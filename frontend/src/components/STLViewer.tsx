import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'

interface STLViewerProps {
  url: string
  height?: number
  width?: number
}

export default function STLViewer({ url, height = 420 }: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    setLoadState('loading')
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 600
    const actualHeight = Math.min(height, Math.round(width * 0.7))

    // Dark clinical background like 3D Slicer / OsiriX
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111827)

    const camera = new THREE.PerspectiveCamera(35, width / actualHeight, 0.1, 100000)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, actualHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // Hemisphere light for soft ambient — sky blue top, warm ground
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x221100, 0.7)
    scene.add(hemi)

    // Key light with shadow
    const key = new THREE.DirectionalLight(0xffffff, 1.3)
    key.position.set(5, 8, 6)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)

    // Cool fill from left — gives clinical blue tint in shadows
    const fill = new THREE.DirectionalLight(0x99bbff, 0.5)
    fill.position.set(-6, 2, -4)
    scene.add(fill)

    // Rim from below/back — adds depth separation from background
    const rim = new THREE.DirectionalLight(0xffffff, 0.25)
    rim.position.set(0, -5, -5)
    scene.add(rim)

    const controls = new TrackballControls(camera, renderer.domElement)
    controls.rotateSpeed = 3.0
    controls.zoomSpeed = 1.2
    controls.panSpeed = 0.8
    controls.dynamicDampingFactor = 0.15

    const loader = new STLLoader()
    loader.load(
      url,
      (geometry) => {
        // Compute smooth vertex normals — eliminates jagged faceted look
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()
        geometry.center()

        const size = new THREE.Vector3()
        geometry.boundingBox!.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z) || 300

        // Fit camera to show full model
        const fov = camera.fov * (Math.PI / 180)
        const fitDist = (maxDim / 2) / Math.tan(fov / 2) * 1.8
        camera.position.set(fitDist * 0.5, fitDist * 0.35, fitDist)
        camera.near = maxDim * 0.001
        camera.far = maxDim * 200
        camera.updateProjectionMatrix()
        controls.update()

        // Bone/ivory — standard clinical 3D reconstruction color
        const material = new THREE.MeshStandardMaterial({
          color: 0xf2e8d9,
          roughness: 0.6,
          metalness: 0.05,
          side: THREE.DoubleSide,
        })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)
        setLoadState('loaded')
      },
      undefined,
      () => setLoadState('error'),
    )

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [url, height])

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height }} />
      {loadState === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#111827', color: '#6b7fa3', gap: 12, fontSize: 14,
        }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #1e3a5f', borderTopColor: '#5b9bd5',
            borderRadius: '50%', animation: 'spin 0.9s linear infinite',
          }} />
          <span>Loading 3D model…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {loadState === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#111827', color: '#ff6b6b', gap: 8,
        }}>
          <span style={{ fontSize: 28 }}>⚠</span>
          <span>Failed to load 3D model</span>
        </div>
      )}
    </div>
  )
}
