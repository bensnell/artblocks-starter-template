let camera, scene, renderer;
let geometry, material, mesh;
let floor, floorMaterial, floorMesh;


init();
function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, 
        window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.set(0, 0.3, 3);
    // camera.lookAt(new THREE.Vector3(0,0.3,0));
    camera.lookAt(scene.position);
    

    geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
    material = new THREE.MeshNormalMaterial();
    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    floor = new THREE.CylinderGeometry(1, 1, 0.01, 64);
    floorMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
    floorMesh = new THREE.Mesh(floor, floorMaterial);
    scene.add(floorMesh);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor(0xff0000, 1.0);
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animation );
    document.body.appendChild( renderer.domElement );
}

function animation( time ) {

    var x = camera.position.x;
    var z = camera.position.z;
    var rotSpeed = 0.001;
    camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
    camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
    camera.lookAt(scene.position);

    renderer.render( scene, camera );
}