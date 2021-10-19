let camera, scene, renderer;
let geometry, material, mesh;
let floor, floorMaterial, floorMesh;
let tree, climate;

// --------- RANDOMNESS ------------

class Random {
  constructor(seed) {
    this.seed = seed
  }
  random_dec() {
    /* Algorithm "xor" from p. 4 of Marsaglia, "Xorshift RNGs" */
    this.seed ^= this.seed << 13
    this.seed ^= this.seed >> 17
    this.seed ^= this.seed << 5
    return ((this.seed < 0 ? ~this.seed + 1 : this.seed) % 1000) / 1000
  }
  random_num(a, b) {
    return a+(b-a)*this.random_dec()
  }
  random_int(a, b) {
    return Math.floor(this.random_num(a, b+1))
  }
}
var R = new Random(parseInt(tokenData.hash.slice(0, 16), 16));

// --------- HELPERS ------------

function clamp(a, lo, hi) {
  if (hi < lo) {
    var tmp = lo;
    lo = hi;
    hi = lo;
  }
  return Math.max(Math.min(a, hi), lo);
}

function lerp(a, b, amt) {
	return (b-a)*amt + a;
}

function map(a, il, ih, ol, oh, c) {
	var ir = (ih-il)==0 ? 1 : (ih-il);
	var o = (a-il) / ir * (oh-ol) + ol;
	if (c) o = clamp(o);
	return o;
}

// Get a wrapped angle in radians (confined to [0, span])
function wrap(a, span) {
  return (a + (Math.ceil(Math.abs(a/span))+1)*span)%span;
}

function _prepareWrappedComparison(a, b, span) {
  var flip = false;
  a = wrap(a, span);
  b = wrap(b, span);
  var lo = Math.min(a, b);
  var hi = Math.max(a, b);
  if (a == hi) flip = !flip;
  if (hi-lo > span/2) {
    var tmp = hi-span;
    hi = lo;
    lo = tmp;
    flip = !flip;
  }
  return [lo, hi, flip];
}

// Find the minimum difference between the two values, signed
function minDifference(a, b, span) {
  var [lo, hi, flip] = _prepareWrappedComparison(a, b, span);
  var tmp = hi-lo;
  if (flip) tmp = -tmp;
  return -tmp;
}

// Lerp an angle in radians (uses closest angle)
function lerpWrapped(a, b, amt, span) {
  var [lo, hi, flip] = _prepareWrappedComparison(a, b, span);
  if (flip) amt = 1.0-amt;
  return wrap(Math.lerp(lo, hi, amt), span);
}

function lerpAngle(a, b, amt) {
  return lerpWrapped(a, b, amt, TWO_PI);
}


// --------- RENDERING ------------

init();
function init() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 70, 
		window.innerWidth / window.innerHeight, 0.01, 10 );
	camera.position.set(0, 1, 3);
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


	const light = new THREE.HemisphereLight();
	scene.add( light );





	const petal = new THREE.BufferGeometry();

	const indices = [];

	const vertices = [];
	const normals = [];
	const colors = [];

	const size = 1;
	const segments = 10;

	const halfSize = size / 2;
	const segmentSize = size / segments;

	// generate vertices, normals and color data for a simple grid geometry

	for ( let i = 0; i <= segments; i ++ ) {

		const y = ( i * segmentSize ) - halfSize;

		for ( let j = 0; j <= segments; j ++ ) {

			const x = ( j * segmentSize ) - halfSize;

			vertices.push( x, - y, 0 );
			normals.push( 0, 0, 1 );

			const r = ( x / size ) + 0.5;
			const g = ( y / size ) + 0.5;

			colors.push( r, g, 1 );

		}

	}

	// generate indices (data for element array buffer)

	for ( let i = 0; i < segments; i ++ ) {

		for ( let j = 0; j < segments; j ++ ) {

			const a = i * ( segments + 1 ) + ( j + 1 );
			const b = i * ( segments + 1 ) + j;
			const c = ( i + 1 ) * ( segments + 1 ) + j;
			const d = ( i + 1 ) * ( segments + 1 ) + ( j + 1 );

			// generate two faces (triangles) per iteration

			indices.push( a, b, d ); // face one
			indices.push( b, c, d ); // face two

		}

	}

	//

	petal.setIndex( indices );
	petal.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
	petal.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
	petal.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	const petalMaterial = new THREE.MeshPhongMaterial( {
		side: THREE.DoubleSide,
		vertexColors: true
	} );

	mesh = new THREE.Mesh( petal, petalMaterial );
	scene.add( mesh );

}

function animation( time ) {

	var x = camera.position.x;
	var z = camera.position.z;
	var rotSpeed = 0.001;
	camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
	camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
	var lookAt  = scene.position.clone();
	lookAt.add(new THREE.Vector3(0,1,0));
	camera.lookAt(lookAt);

	renderer.render( scene, camera );
}