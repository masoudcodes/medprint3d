import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x3d3d3d)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(0, 0, 300)

    // Renderer
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

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    // Load STL
    const loader = new STLLoader()
    loader.load(url, (geometry) => {
      geometry.computeBoundingBox()
      geometry.center()

      const size = new THREE.Vector3()
      geometry.boundingBox!.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.position.set(0, 0, maxDim * 1.8)
      camera.near = maxDim * 0.01
      camera.far = maxDim * 100
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
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
    })

    // Animate
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

  return <div ref={mountRef} style={{ width, height, borderRadius: 8, overflow: 'hidden' }} />
}
