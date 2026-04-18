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
    scene.background = new THREE.Color(0x1a1a2e)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(0, 0, 300)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambient)
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8)
    dir1.position.set(1, 2, 3)
    scene.add(dir1)
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.4)
    dir2.position.set(-2, -1, -1)
    scene.add(dir2)

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
        color: 0xcccccc,
        specular: 0x111111,
        shininess: 100,
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
