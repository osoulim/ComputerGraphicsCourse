// instantiate a loader
const objLoader = new THREE.OBJLoader()

let objectToExplodeTris = []

const loadOBJModel = path =>
  new Promise((resolve, reject) => {
    // load a resource
    objLoader.load(
      // resource URL
      path,
      // called when resource is loaded
      resolve,
      // called when loading is in progresses
      xhr => console.log((xhr.loaded / xhr.total) * 100 + '% loaded'),
      // called when loading has errors
      error => reject('An error happened:', error)
    )
  })

const transformFaceToTriangleMesh = (
  vertices,
  objectCenter,
  explosionCenter
) => face => {
  const cloneObjectCenter = objectCenter.clone()

  const trianglePoints = [
    vertices[face.a],
    vertices[face.b],
    vertices[face.c]
  ].map(({ x, y, z }) => new THREE.Vector3(x, y, z))

  const centerOfTriangle = cloneObjectCenter
    .multiplyScalar(3)
    .add(trianglePoints[0])
    .add(trianglePoints[1])
    .add(trianglePoints[2])
    .divideScalar(3)

  trianglePoints.map(triPoint => triPoint.sub(centerOfTriangle))

  const geometry = new THREE.Geometry()
  geometry.vertices.push(...trianglePoints)
  geometry.faces.push(new THREE.Face3(0, 1, 2))

  geometry.computeBoundingSphere()
  geometry.computeFaceNormals()
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  })
  const triMesh = new THREE.Mesh(geometry, material)

  const triangleMovementDir = centerOfTriangle
    .clone()
    .sub(explosionCenter)
    .normalize()

  triMesh.position.copy(centerOfTriangle)
  triMesh.initialPosition = centerOfTriangle
  triMesh.movementDir = triangleMovementDir

  return triMesh
}

const generateTrisFromGeometry = (geometry, objectCenter, explosionCenter) => {
  const validGeometry =
    geometry instanceof THREE.BufferGeometry
      ? new THREE.Geometry().fromBufferGeometry(geometry)
      : geometry

  const vertices = validGeometry.vertices
  const faces = validGeometry.faces

  const triMaker = transformFaceToTriangleMesh(
    vertices,
    objectCenter,
    explosionCenter
  )

  const triangles = faces.map(triMaker)
  return triangles
}

const generateTrisFromChildren = (scene, object, explosionCenter) =>
  object.traverse(child => {
    if (child.geometry) {
      const childGeneratedTris = generateTrisFromGeometry(
        child.geometry,
        object.position,
        explosionCenter
      )

      childGeneratedTris.forEach(tri => {
        scene.add(tri)
      })

      objectToExplodeTris = objectToExplodeTris.concat(childGeneratedTris)
    }
  })

const setupScene = () => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )

  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  camera.position.y = 250
  camera.position.z = 250
  camera.position.x = 250
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  const ambientLight = new THREE.AmbientLight(0x202020) // soft white light
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1, 5000)
  pointLight.position.set(500, 500, 500)
  scene.add(pointLight)

  loadOBJModel('models/car.obj').then(objectToExplode => {
    generateTrisFromChildren(scene, objectToExplode, new THREE.Vector3(0, 0, 0))
  })

  return { scene, renderer, camera }
}

const { scene, renderer, camera } = setupScene()
let timeSinceStart = 0

function animate() {
  requestAnimationFrame(animate)

  if (timeSinceStart > 200) timeSinceStart = 0
  timeSinceStart += 1

  objectToExplodeTris.forEach(tri => {
    const { initialPosition, movementDir } = tri
    tri.position.x = initialPosition.x + timeSinceStart * movementDir.x
    tri.position.y = initialPosition.y + timeSinceStart * movementDir.y
    tri.position.z = initialPosition.z + timeSinceStart * movementDir.z
  })
  renderer.render(scene, camera)
}

animate()
