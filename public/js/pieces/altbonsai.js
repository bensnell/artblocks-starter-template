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

// --------- CLASSES ------------

class Climate {
	constructor() {};

	// Amount of sunlight [0, 1]
	sun = 1;
	// Sun range
	sunRange = [0.7, 1];

	// Amount of rainfall [0, 1]
	water = 1;
	// Water range
	waterRange = [0.7, 1];

	update() {
		this.sun = R.random_num(this.sunRange[0], this.sunRange[1]);
		this.water = R.random_num(this.waterRange[0], this.waterRange[1]);
	}
}

class Node {
	constructor() {

		// Is this part of the tree living?
		this.alive = true;
		// Is this node capable of collecting water or sun?
		this.receptive = true;

		// Absolute position (in global space)
		this.position = new THREE.Vector3();
		// Normalized heading
		this.heading = new THREE.Vector3();

		// Vector from last node to this node
		this.lastSegment = new THREE.Vector3();
		// Length from last node to this node
		this.lastSegmentLength = 0;
		// Cumulative distance to the origin
		this.cumulativeDistanceToOrigin = 0;

		// Aboslute distance to the origin
		this.distanceToOrigin = 0;
		
		// # nodes to origin
		this.nodesToOrigin = 0;
		// How many years did this not grow, while it was receptive?
		this.stagnantYears = 0; // TODO

		// Radius of segment
		this.segmentRadius = 0;

		// Radius of the receptiveness (foliage for above ground nodes)
		this.receptiveRadius = 0;

		// Children nodes
		this.next = [];
		// Parent node
		this.prev = null;

		// A reference to the tree
		this._tree = null;
	}
	age() { return this._tree.age - this.nodesToOrigin; }
	siblings() { // including self
		return this.prev == null ? [] : this.prev.next;
	}
	// Update all properties that depend on a new position and heading
	// (Assumed: a new position, heading, segmentRadius, and receptiveRadius 
	// 		have been set)
	updatePropertiesFromNewPosition() {
		
		// Set the last segment
		this.lastSegment = this.position - this.prev.position;
		this.lastSegmentLength = this.lastSegment.length();
		// Update cumulative distance
		this.cumulativeDistanceToOrigin = this.prev.cumulativeDistanceToOrigin + 
			this.lastSegmentLength;
		
		// TODO: Should foliage be treated as a linear quantity or an area or volume?
		// e.g. pow(nodes.length, 1 or 2 or 3); 
		// this.receptiveRadius = this.prev.receptiveRadius / this.siblings.length(); 

		// Update the max tree radius
		this.distanceToOrigin = this.position.length();
		this._tree.radius = max(this._tree.radius, this.distanceToOrigin);
	}
};

class Tree {
	constructor() {

		// nexus of branches and roots (constant)
		this.origin = new THREE.Vector3(); 

		// Age of the tree in years
		this.age = 0;

		// Branch segments
		this.branches = new Node();
		this.branches.heading.set(0,1,0);
		// Root segments
		this.roots = new Node();
		this.roots.heading.set(0,-1,0);

		// Bounds (updated every time positions are added)
		this.loBounds = new THREE.Vector3();
		this.hiBounds = new THREE.Vector3();
		// The max radius of any points added
		this.radius = 0;
	}
	// Get a number of leaves or root caps split out from this node
	getNewLeaves(branchNode, n) {
		return this._getNewNodes(branchNode, n);
	}
	getNewCaps(rootNode, n) {
		return this._getNewNodes(rootNode, n);
	}
	// Get a number of nodes from this parentNode, pre-linked
	_getNewNodes(parent, n) {
		for (var i = 0; i < n; i++) {
			var n = new Node();
			// Link original tree
			n._tree = this;
			// Link to parent
			parent.next.push(n);
			// Link parent to this
			n.prev = parent;
			// Update the number of nodes to origin
			n.nodesToOrigin = parent.nodesToOrigin + 1;
		}
		// The parent segment is no longer receptive
		parent.receptive = false;		
	}
	centroid() {
		return this.loBounds.clone().lerp(this.hiBounds, 0.5);
	}
	maxRadius() {
		return Math.max(this.loBounds.x, this.loBounds.y, this.lo)
	}
	update() {
		// Increase the age
		this.age++;
		// Progress the tree through one year (+ seasons)
		this._growLeaves();
		this._growCaps();
		this._dieback();
	}
	_growLeaves() {

	}
	_growCaps() {

	}
	_dieback() {
		
	}
	


};

// --------- RENDERING ------------

init();
function init() {

	tree = new Tree();
	climate = new Climate();

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

	climate.update();
	tree.update();

	var x = camera.position.x;
	var z = camera.position.z;
	var rotSpeed = 0.001;
	camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
	camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
	camera.lookAt(scene.position);

	renderer.render( scene, camera );
}