let camera, scene, renderer;
let geometry, material, mesh;
let floor, floorMaterial, floorMesh;

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

// --------- CLASSES ------------

class Tree {
	constructor() {
		this.origin = new THREE.Vector3();
		this.loBounds = new THREE.Vector3();
		this.hiBounds = new THREE.Vector3();
	}
	centroid() {
		return this.loBounds.lerp(this.hiBounds, 0.5);
	}
	maxRadius() {
		return 0;
	}
	


};


init();
function init() {

	var x = new THREE.Vector3(0,0,0);
	var y = new THREE.Vector3(1,1,1);
	var z = x.clone().lerp(y, 0.5);
	console.log(x, y, z);

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