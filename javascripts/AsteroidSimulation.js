AsteroidSimulation = function( width, height, renderer, isMobile ) {
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	this.asteroidSpread = 1.0;
	this.gravConstant = 0.003;
	this.particleSystem = null;
	this.pointSize = isMobile ? 2 : 2;
	this.isMobile = isMobile;
};

AsteroidSimulation.prototype.initialize = function( planetData ) {

	this.planetData = planetData;
	this.spawnVector = new THREE.Vector4( 0.0, 0.0, 0.0, 0.0 );
	this.randSeed = new THREE.Vector2();
	this.timer = 0.0;

	var initialData = this.initInitialData( );

	this.initializeSimulation();

	this.gpgpuSim = new GPGPUSimulation( this.width, this.height, this.renderer, initialData, THREE.RGBAFormat );
	this.gpgpuSim.setSimulationMaterial( this.simulationMaterial );

	this.initAsteroidParticles();
};

AsteroidSimulation.prototype.initInitialData = function( ) {
	
	planetVector = new THREE.Vector2( this.planetData[0].x - this.planetData[1].x, this.planetData[0].y - this.planetData[1].y);
	this.jupiterDistance = planetVector.length();
	this.sunDistance = this.jupiterDistance;

	var massRatio = this.planetData[0].z / ( this.planetData[0].z + this.planetData[1].z );
	this.jupiterDistance *= massRatio;
	this.sunDistance *= ( 1.0 - massRatio );

	var minDistance = this.jupiterDistance * (1.0 - this.asteroidSpread);
	var maxDistance = this.jupiterDistance * (1.0 + this.asteroidSpread);

	var initialData = new Float32Array( this.width * this.height * 4 );
	
	var asteroidData = new THREE.Vector4();
	var asteroidVelocity = new THREE.Vector2();

	for ( var i = 0, j = 0, l = initialData.length; i < l; i += 4, j += 1 ) {

		//Generate a random point, at the radius of Jupiter (plus or minus something)
		//Set its velocity, given a circular orbit.
		var radius = ( Math.asin( Math.random() * 2.0 - 1.0 )) / ( 2.0 * Math.PI ) * (maxDistance - minDistance) + this.jupiterDistance;
		var angle = Math.random() * 2.0 * Math.PI;

		asteroidData.x = Math.cos( angle );
		asteroidData.y = Math.sin( angle );
		//asteroidData.z = 0;
		asteroidData.multiplyScalar( radius );

		//Set the asteroids a goin' around the Sun
		asteroidData.add( this.planetData[0] );
		asteroidData.z = 0;
		this.calculateOrbitVelocity( asteroidData, { sun: this.planetData[0], jupiter: this.planetData[1] }, asteroidVelocity );

	
		initialData[ i ] = asteroidData.x;
		initialData[ i + 1 ] = asteroidData.y;
		initialData[ i + 2 ] = asteroidVelocity.x;
		initialData[ i + 3 ] = asteroidVelocity.y;

	}
	return initialData;
};

AsteroidSimulation.prototype.resetAsteroids = function() {
	var resetData = this.initInitialData();
	this.gpgpuSim.resetTextureData( resetData );
};

AsteroidSimulation.prototype.updatePlanetData = function( mass1, mass2 ) {

	this.planetData[0].z = mass1;
	this.planetData[1].z = mass2;
	planetVector = new THREE.Vector2( this.planetData[0].x - this.planetData[1].x, this.planetData[0].y - this.planetData[1].y);
	this.jupiterDistance = planetVector.length();
	this.sunDistance = this.jupiterDistance;

	var massRatio = this.planetData[0].z / ( this.planetData[0].z + this.planetData[1].z );
	this.jupiterDistance *= massRatio;
	this.sunDistance *= ( 1.0 - massRatio );

	var jupiterVelocity = new THREE.Vector2();
	var sunVelocity = new THREE.Vector2();
	this.calculateOrbitVelocity( this.planetData[1], { "sun": this.planetData[0] }, jupiterVelocity, sunVelocity, false );
	
	var scalarJupVelocity = jupiterVelocity.length();
	this.jupiterAngularVelocity = scalarJupVelocity / this.jupiterDistance;
	var scalarSunVelocity = sunVelocity.length();
	this.sunAngularVelocity = this.jupiterAngularVelocity;
};

AsteroidSimulation.prototype.calculateOrbitVelocity = function( orbitingBodyData, bodiesToOrbit, outBody1Velocity, outBody2Velocity, retrograde ) {

	//Calculate centre of mass of the system
	var virtualBodyAtCentreOfMass = new THREE.Vector3();
	var diffVector = new THREE.Vector2();
	//var tempVec2 = new THREE.Vector2();
	var totalMass = 0;
	for ( var x in bodiesToOrbit ) {
		totalMass += bodiesToOrbit[x].z;
	}
	for ( var x in bodiesToOrbit ) {
		// tempVec1.copy( bodiesToOrbit[x] );
		// tempVec1.sub( orbitingBodyData );
		// var distance = tempVec1.length();
		// var massRatio = bodiesToOrbit[x].z / bodiesToOrbit[x].z + orbitingBodyData.z;
		diffVector.copy( bodiesToOrbit[x] )
		diffVector.multiplyScalar( bodiesToOrbit[x].z / totalMass );
		//var tmpMass = virtualBodyAtCentreOfMass.z;
		virtualBodyAtCentreOfMass.add( diffVector );
		//virtualBodyAtCentreOfMass.z = tmpMass + bodiesToOrbit[x].z;
		//tmpMass += bodiesToOrbit[x].z
		//virtualBodyAtCentreOfMass.z = tmpMass;
	}

	virtualBodyAtCentreOfMass.z = totalMass;	

	//TODO - this is only calculating circular velocities right now. Pass in eccentricity as well
	//var diffVector = new THREE.Vector2( orbitingBodyData.x, orbitingBodyData.y );
	diffVector.copy( orbitingBodyData );
	diffVector.sub( virtualBodyAtCentreOfMass );

	outBody1Velocity.copy( diffVector );	
	outBody1Velocity.normalize();
	var temp = outBody1Velocity.x;
	outBody1Velocity.x = retrograde ? -outBody1Velocity.y : outBody1Velocity.y;
	outBody1Velocity.y = retrograde ? temp : -temp;
	
	if ( outBody2Velocity ) {
		outBody2Velocity.copy( diffVector );	
		outBody2Velocity.normalize();
		temp = outBody2Velocity.x;
		outBody2Velocity.x = retrograde ? outBody2Velocity.y : outBody2Velocity.y;
		outBody2Velocity.y = retrograde ? temp : temp;
	}
	
	//Modify distance to account for the centre of mass of the system
	if ( !orbitingBodyData.z ) orbitingBodyData.z = 0;
	var massRatio = virtualBodyAtCentreOfMass.z / ( virtualBodyAtCentreOfMass.z + orbitingBodyData.z );
	var distance1 = diffVector.length();
	var distance2 = distance1;
	distance1 *= massRatio;
	distance2 *= ( 1.0 - massRatio );

	outBody1Velocity.multiplyScalar( Math.sqrt( this.gravConstant * virtualBodyAtCentreOfMass.z / distance1 ) );
	if ( outBody2Velocity ) {
		outBody2Velocity.multiplyScalar( Math.sqrt( this.gravConstant * orbitingBodyData.z / distance2 ) );
	}
}

AsteroidSimulation.prototype.initializeSimulation = function() {
	this.simulation_shader_vs = [
		"varying vec2 vUv;",

		"void main() {",

			"vUv = vec2(uv.x, 1.0 - uv.y);",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}",

	].join("\n");

	this.simulation_shader_fs = [
			
		"varying vec2 vUv;",
		
		"uniform sampler2D dataTexture;",
		"uniform sampler2D sourceTexture;",
		
		"uniform float delta;",
		"uniform vec2 randSeed;",
		"uniform float gravConstant;",
		"uniform vec4 planetData[ NUM_PLANETS ];",
		"uniform vec4 spawnVector;",
		"uniform float spawnEnabled;",
		//"uniform float aspect;",

		"float rand(vec2 co){",
		    "return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);",
		"}",
	
		"void main() {",


			"vec4 pos = texture2D( dataTexture, vUv );",
			"vec2 totalForce = vec2(0.0, 0.0);",

			"vec2 biasedUv = (vUv - vec2(0.5));",
			//"biasedUv *= biasedUv;",

			"if ( spawnEnabled != 0.0 && rand(vUv + randSeed.x ) > SPAWNRATE ) {",
				"pos = spawnVector;",
				"vec2 normBiasedUv = normalize( biasedUv );",
				"pos.zy += biasedUv * 0.05;",
				//"pos.xy += biasedUv * 0.15 * abs( normBiasedUv );",
				"pos.x += biasedUv.x * 0.2 * abs( normBiasedUv.x );",
				"pos.y += biasedUv.y * 0.15 * abs( normBiasedUv.y );",
			"}",

			"for ( int p = 0; p < NUM_PLANETS; p++ ) {",

				"vec2 planetPos = planetData[p].xy;",
        "float planetMass = planetData[p].z;",
        "vec2 diff = ( planetPos - pos.xy );",
        "vec2 normDiff = normalize( diff );",
        "vec2 force = gravConstant * planetMass * normDiff / dot( diff, diff );",
        "totalForce += force;",
      "}",
			"vec2 oldVelocity = pos.zw;",
			"pos.zw += delta * ( totalForce );",
			//"pos.xy += 0.5 * delta * (pos.zw + oldVelocity);",
			"pos.xy += delta * pos.zw;",

			"gl_FragColor = pos;",

		"}",
	].join("\n");

	if ( this.isMobile ) {
		var spawnRate = 0.997;
	}
	else {
		var spawnRate = 0.9985;
	}
	this.simulation_shader_fs = "#define SPAWNRATE " + spawnRate + "\n" + this.simulation_shader_fs;

	var jupiterVelocity = new THREE.Vector2();
	var sunVelocity = new THREE.Vector2();

	this.calculateOrbitVelocity( this.planetData[1], { "sun": this.planetData[0] }, jupiterVelocity, sunVelocity, false );
	this.jupiterAngle = 0;
	this.sunAngle = Math.PI;

	this.jupiterVector = new THREE.Vector2( this.planetData[1].x, this.planetData[1].y );
	var scalarJupVelocity = jupiterVelocity.length();
	this.jupiterAngularVelocity = scalarJupVelocity / this.jupiterDistance;

	this.sunVector = new THREE.Vector2( this.planetData[0].x, this.planetData[0].y );
	var scalarSunVelocity = sunVelocity.length();
	//TODO this is a cheat to make sure the sun's angular velocity matches jupiter's. The calculation should produce this but it doesn't. Fix it!
	this.sunAngularVelocity = this.jupiterAngularVelocity;//scalarSunVelocity / this.sunDistance;

	console.log("Jupiter's velocity is " + scalarJupVelocity );
	console.log("Jupiter's angular velocity is " + this.jupiterAngularVelocity );
	console.log("Sun's velocity is " + scalarSunVelocity );
	console.log("Sun's angular velocity is " + this.sunAngularVelocity );

	//this.jupiterVector.sub( new THREE.Vector2( this.planetData[0].x, this.planetData[0].y ) );

	//Init the simulation shader that will do the gravitational simulation.
	this.simulationMaterial = new THREE.ShaderMaterial({

		uniforms: {
			dataTexture: { type: "t", value: null },
			sourceTexture: { type: "t", value: null },
			delta: { type: "f", value: 0.01 },
			//timer: { type: "f", value: 0.00 },
			randSeed: { type: "v2", value: this.randSeed },
			gravConstant: { type: "f", value: this.gravConstant},
			//aspect: { type: "f", value: 1.77778 },
			planetData: { type: "v4v", value: this.planetData },
			spawnEnabled: { type: "f", value: 0.0 },
			spawnVector: { type: "v4", value: this.spawnVector },
		},
		//blending: THREE.NoBlending,

		vertexShader: this.simulation_shader_vs,
		fragmentShader:  this.simulation_shader_fs,
		defines: { "NUM_PLANETS" : this.planetData.length },

	});
};

AsteroidSimulation.prototype.initAsteroidParticles = function() {

	this.asteroid_particles_shader_vs = [

		"uniform sampler2D map;",

		"uniform float width;",
		"uniform float height;",

		"uniform float pointSize;",

		"varying vec2 vUv;",
		"varying vec4 vPosition;",

		"void main() {",

			"vUv = position.xy + vec2( 0.5 / width, 0.5 / height );",

			"vPosition = texture2D( map, vUv );",
			 

			"gl_PointSize = pointSize;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( vec3( vPosition.xy, 0.0), 1.0 );",
			//gl_Position = projectionMatrix * modelViewMatrix * vec4( vec3( position.xy, 0.0), 1.0 );

		"}",
	].join("\n");

	if ( this.isMobile ) {
		this.asteroid_particles_shader_fs = [
			"uniform sampler2D map;",

			"varying vec2 vUv;",
			"varying vec4 vPosition;",

			"void main() {",

				"gl_FragColor = vec4( 0.35, 0.35, 0.45, 1.0 );",

			"}",
		].join("\n");
	}
	else {
		this.asteroid_particles_shader_fs = [
			"uniform sampler2D map;",

			"varying vec2 vUv;",
			"varying vec4 vPosition;",

			"void main() {",

				"gl_FragColor = vec4( 0.15, 0.15, 0.2, 1.0 );",

			"}",
		].join("\n");
	}

	var particleGeometry = new THREE.Geometry();

	for ( var i = 0, l = this.width * this.height; i < l; i ++ ) {

		var vertex = new THREE.Vector3();
		vertex.x = ( i % this.width ) / this.width ;
		vertex.y = Math.floor( i / this.width ) / this.height;
		particleGeometry.vertices.push( vertex );

	}

	this.particleMaterial = new THREE.ShaderMaterial( {

		uniforms: {

			"map": { type: "t", value: this.gpgpuSim.bufferRT_To },
			"width": { type: "f", value: this.width },
			"height": { type: "f", value: this.height },

			"pointSize": { type: "f", value: this.pointSize }

		},
		vertexShader: this.asteroid_particles_shader_vs,
		fragmentShader: this.asteroid_particles_shader_fs,
		depthTest: false,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		transparent: true,

	} );

	particleGeometry.dynamic = false;

	this.particleSystem = new THREE.ParticleSystem( particleGeometry, this.particleMaterial );
};

AsteroidSimulation.prototype.setSpawnPoint = function( asteroidPosition, asteroidVelocity ) {
	
	if ( this.spawnType == "circularOrbit" ) {
		var asteroidVelocityCircular = new THREE.Vector2();
		this.calculateOrbitVelocity( asteroidPosition, { sun: this.planetData[0], jupiter: this.planetData[1] }, asteroidVelocityCircular );
		this.spawnVector.set( asteroidPosition.x, asteroidPosition.y, asteroidVelocityCircular.x, asteroidVelocityCircular.y );
	}
	else if ( this.spawnType == "customOrbit" ) {
		this.spawnVector.set( asteroidPosition.x, asteroidPosition.y, asteroidVelocity.x * 2.0, asteroidVelocity.y * 2.0 );
	}

	
};

AsteroidSimulation.prototype.setSpawnEnabled = function( on ) {
	this.simulationMaterial.uniforms.spawnEnabled.value = on ? 1.0 : 0.0;
};

AsteroidSimulation.prototype.getSpawnEnabled = function( ) {
	return this.simulationMaterial.uniforms.spawnEnabled.value;
};

AsteroidSimulation.prototype.setSpawnType = function( type ) {
	this.spawnType = type;
};

AsteroidSimulation.prototype.update = function( delta ) {
	//this.timer += delta;
	this.randSeed.x = Math.random();
	this.randSeed.y = Math.random();
	this.simulationMaterial.uniforms.delta.value = delta;
	//this.simulationMaterial.uniforms.timer.value = this.timer;
	this.jupiterAngle -= this.jupiterAngularVelocity * delta;
	this.jupiterAngle %= 2.0 * Math.PI;
	
	this.jupiterVector.x = Math.cos( this.jupiterAngle );
	this.jupiterVector.y = Math.sin( this.jupiterAngle );
	this.jupiterVector.multiplyScalar( this.jupiterDistance );

	this.sunAngle -= this.sunAngularVelocity * delta;
	this.sunAngle %= 2.0 * Math.PI;
	
	this.sunVector.x = Math.cos( this.sunAngle );
	this.sunVector.y = Math.sin( this.sunAngle );
	this.sunVector.multiplyScalar( this.sunDistance );

	//this.simulationMaterial.uniforms.tPositions.value = asteroids.in;
	this.simulationMaterial.uniforms.planetData.value[0].x = this.sunVector.x;
	this.simulationMaterial.uniforms.planetData.value[0].y = this.sunVector.y;

	this.simulationMaterial.uniforms.planetData.value[1].x = this.jupiterVector.x;
	this.simulationMaterial.uniforms.planetData.value[1].y = this.jupiterVector.y;
	this.gpgpuSim.simulate( );
	this.particleMaterial.uniforms.map.value = this.gpgpuSim.bufferRT_From;
};
