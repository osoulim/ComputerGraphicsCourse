var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

var renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setClearColor("#e5e5e5");

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
})

var light = new THREE.PointLight(0xFFFFFF, 1, 5000);
light.position.set(500, 0, 0);
scene.add(light);

// var texture = new THREE.TextureLoader().load('textures/earth.jpg')
// var geometry = new THREE.SphereGeometry(50, 50, 50)
// var material = new THREE.MeshLambertMaterial({
//     map: texture,
//     overdraw: 0.5
//     // color: 0xaaffaa,
//     // wireframe: true
// });
// var mesh = new THREE.Mesh(geometry, material);
// scene.add(mesh);

var loader = new THREE.OBJLoader();
var car = null;
loader.load(
    'models/car.obj',
    function (object) {
        scene.add(object);
        object.position.set(0, -100, -400);
        car = object;
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.log('An error happened');
    }
);

var clock = new THREE.Clock();
var controls = new THREE.FlyControls(camera, renderer.domElement);
controls.movementSpeed = 100;
controls.domElement = renderer.domElement;
controls.rollSpeed = Math.PI / 24;
controls.autoForward = false;
controls.dragToLook = true;


function animate() {
    var delta = clock.getDelta();
    requestAnimationFrame(animate);
    // mesh.rotation.y += 0.01;
    controls.update(delta);
    renderer.render(scene, camera);
    light.position.x = camera.position.x;
    light.position.y = camera.position.y;
    light.position.z = camera.position.z;
}
animate();