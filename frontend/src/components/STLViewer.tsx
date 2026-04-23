import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface STLViewerProps {
  url: string
  width?: number
  height?: number
}

export default function STLViewer({ url, width = 600, height = 420 }: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    setLoadState('loading')
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x3d3d3d)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(0, 0, 300)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    // Lights — soft wraparound like clinical imaging software
    const ambient = new THREE.AmbientLight(0xffffff, 0.45)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(2, 3, 4)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-3, 1, -2)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.25)
    rim.position.set(0, -3, -3)
    scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    const loader = new STLLoader()
    loader.load(
      url,
      (geometry) => {
        geometry.computeBoundingBox()
        geometry.center()

        const size = new THREE.Vector3()
        geometry.boundingBox!.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const effectiveDim = maxDim > 0 ? maxDim : 300
        camera.position.set(0, 0, effectiveDim * 1.8)
        camera.near = effectiveDim * 0.01
        camera.far = effectiveDim * 100
        camera.updateProjectionMatrix()
        controls.target.set(0, 0, 0)
        controls.update()

        const material = new THREE.MeshPhongMaterial({
          color: 0xebebeb,
          emissive: 0x1a1a1a,
          specular: 0x2a2a2a,
          shininess: 60,
          side: THREE.DoubleSide,
          flatShading: false,
        })
        scene.add(new THREE.Mesh(geometry, material))
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
  }, [url, width, height])

  return (
    <div style={{ position: 'relative', width, height, borderRadius: 8, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width, height }} />
      {loadState === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(61,61,61,0.75)', color: '#fff', fontSize: 14,
        }}>
          Loading 3D model…
        </div>
      )}
      {loadState === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#3d3d3d', color: '#ff4d4f', gap: 8,
        }}>
          <span style={{ fontSize: 28 }}>⚠</span>
          <span>Failed to load 3D model</span>
        </div>
      )}
    </div>
  )
}
