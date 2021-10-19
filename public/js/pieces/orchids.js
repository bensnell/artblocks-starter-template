let camera, scene, renderer;
let geometry, material, mesh;
let floor, floorMaterial, floorMesh;
let tree, climate;


var T = THREE;
var M = Math;
const PI = M.PI;

function v3(x,y,z) { 
	if (x==null) x=y=z=0;
	return new T.Vector3(x,y,z); 
}



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
  return M.max(M.min(a, hi), lo);
}

function lerp(a, b, amt) {
	return (b-a)*amt + a;
}
// Lerp range
function lr(r, amt) {
	return lerp(r[0], r[1], amt);
}

function v2l(v) {
	return [v.x,v.y,v.z];
}

function map(a, il, ih, ol, oh, c) {
	var ir = (ih-il)==0 ? 1 : (ih-il);
	var o = (a-il) / ir * (oh-ol) + ol;
	if (c) o = clamp(o);
	return o;
}

// Get a wrapped angle in radians (confined to [0, span])
function wrap(a, span) {
  return (a + (M.ceil(M.abs(a/span))+1)*span)%span;
}

function _prepareWrappedComparison(a, b, span) {
  var flip = false;
  a = wrap(a, span);
  b = wrap(b, span);
  var lo = M.min(a, b);
  var hi = M.max(a, b);
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
  return wrap(lerp(lo, hi, amt), span);
}

function lerpAngle(a, b, amt) {
  return lerpWrapped(a, b, amt, TWO_PI);
}

class Petal {
	indices = [];
	vertices = [];
	normals = [];
	colors = [];

	geo = new T.BufferGeometry();
	mat = new T.MeshPhongMaterial( {
		side: T.DoubleSide,
		vertexColors: true
	} );

	create(origin, axis, up, length, width, ratioRange, alphaRange, beta) {
		var _ = this;
		_.o = origin;
		_.x = axis;
		_.u = up;
		_.l = length;
		_.w = width;
		_.r = ratioRange;
		_.a = alphaRange;
		_.b = beta;
		_.init();
		_.update(0);
	}

	init() {
		var _ = this;

		_.vertices.push( 0, 0, 0 );
		_.vertices.push( -1, 1, 0 );
		_.vertices.push( 0, 1, 0 );
		_.vertices.push( 1, 1, 0 );
		_.vertices.push( 0, 2, 0 );

		for (var i = 0; i < 5; i++) {
			_.normals.push( 0, 0, 1 );
			_.colors.push( 1, 0, 0 );
		}

		var idx = [[2,3,0],[2,0,1],[2,1,4],[2,4,3]];
		idx.forEach(i => _.indices.push(...i));

		_.geo.setIndex( _.indices );
		var posAttr = new T.Float32BufferAttribute( _.vertices, 3 );
		posAttr.setUsage(T.StreamDrawUsage);
		_.geo.setAttribute( 'position',  posAttr);
		_.geo.setAttribute( 'normal', new T.Float32BufferAttribute( _.normals, 3 ) );
		var colorAttr = new T.Float32BufferAttribute( _.colors, 3 );
		colorAttr.setUsage(T.StreamDrawUsage);
		_.geo.setAttribute( 'color', colorAttr );
		_.mesh = new T.Mesh( _.geo, _.mat );
	}

	update(param) {
		var _ = this;

		var scale = clamp(param+1,0,1);
		param = M.max(0,param);

		// Calculate lerped values
		var l = _.l*scale;
		var r = lr(_.r, param);
		var a = lr(_.a, param);
		var b = lerp(-2*_.a[0], _.b, param);
		var g = _.w/(2*l*r*M.sin(a)) * (param/2+0.5);


		// Update positions of top petal
		
		
		_.geo.attributes.position.setXYZ(0, ...v2l(_.o));

		var perp = v3().crossVectors(_.x, _.u);
		var p2 = _.x.clone().multiplyScalar(l*r).applyAxisAngle(perp, a);
		_.geo.attributes.position.setXYZ(2, ...v2l(p2));

		var p1 = p2.clone().applyAxisAngle(_.x, g);
		_.geo.attributes.position.setXYZ(1, ...v2l(p1));

		var p3 = p2.clone().applyAxisAngle(_.x, -g);
		_.geo.attributes.position.setXYZ(3, ...v2l(p3));

		var p4 = p2.clone().applyAxisAngle(perp, b).setLength(l*(1-r)).add(p2);
		_.geo.attributes.position.setXYZ(4, ...v2l(p4));


		_.geo.attributes.color.setXYZ(0, 1, 0, param);
		_.geo.attributes.color.setXYZ(1, 1, 1, param);
		_.geo.attributes.color.setXYZ(2, 1, 1, param);
		_.geo.attributes.color.setXYZ(3, 1, 1, param);
		_.geo.attributes.color.setXYZ(4, 0, 1, param);

		_.geo.attributes.color.needsUpdate = true;
		_.geo.attributes.position.needsUpdate = true;
	}
}


// --------- RENDERING ------------

init();
var petal;
function init() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 70, 
		window.innerWidth / window.innerHeight, 0.01, 10 );
	camera.position.set(0, 1, 3);
	// camera.lookAt(new THREE.Vector3(0,0.3,0));
	camera.lookAt(scene.position);
	

	// geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
	// material = new THREE.MeshNormalMaterial();
	// mesh = new THREE.Mesh( geometry, material );
	// scene.add( mesh );

	floor = new THREE.CylinderGeometry(1, 1, 0.01, 64);
	floorMaterial = new THREE.MeshBasicMaterial({color: 0x222222});
	floorMesh = new THREE.Mesh(floor, floorMaterial);
	scene.add(floorMesh);

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor(0xff0000, 1.0);
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );


	const light = new THREE.HemisphereLight();
	scene.add( light );



	petal = new Petal();
	petal.create(
		v3(0,0.1,0),
		v3(0,0,1),
		v3(0,1,0),
		1,
		1,
		[0.5,2/3],
		[PI/10,PI/3],
		PI/3
	);
	scene.add(petal.mesh);





}

function animation( time ) {

	
	param = (M.cos(2*PI*(time%5000)/5000)+1)/2;
	if (petal) petal.update(param);

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