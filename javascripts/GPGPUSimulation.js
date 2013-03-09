
GPGPUSimulation = function( textureWidth, textureHeight, renderer, initialData, textureFormat ) {

	// Init RTT stuff
	gl = renderer.getContext();
		
	if( !gl.getExtension( "OES_texture_float" )) {
		alert( "No OES_texture_float support for float textures!" );
		return;
	}

	if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0) {
		alert( "No support for vertex shader textures!" );
		return;
	}


	this.cameraRTT = new THREE.OrthographicCamera(-textureWidth/2, textureHeight/2, textureWidth/2, -textureHeight/2, -1000000, 1000000);

	this.cameraRTT.position.z = 100;

	this.sourceTexture = this.createTextureFromData( initialData, textureWidth, textureHeight, textureFormat );

	this.bufferRT_From = new THREE.WebGLRenderTarget(textureWidth, textureWidth, {
		wrapS: THREE.RepeatWrapping,
		wrapT: THREE.RepeatWrapping,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: textureFormat,
		type: THREE.FloatType,
		stencilBuffer: false
	});

	this.bufferRT_From.id = "1";

	this.bufferRT_From.anisotropy = false;
	this.bufferRT_From.generateMipmaps = false;
	this.bufferRT_From.premultiplyAlpha = false;
	this.bufferRT_From.flipY = false;

	this.bufferRT_To = this.bufferRT_From.clone();
	this.bufferRT_To.id = "2";

	var copyTexture_vertex_shader = [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = vec2(uv.x, 1.0 - uv.y);",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"} "

	].join("\n");

	var copyTexture_fragment_shader = [

		"varying vec2 vUv;",
		"uniform sampler2D textureToCopy;",

		"void main() {",
			"vec4 textureColour = texture2D( textureToCopy, vUv );",
			"gl_FragColor = textureColour;",
		"}"

	].join("\n");



	this.copyTexture_material = new THREE.ShaderMaterial({

		uniforms: {
			textureToCopy: { type: "t", value: null }
		},
		vertexShader: copyTexture_vertex_shader,
		fragmentShader: copyTexture_fragment_shader

	});


	this.sceneRTT = new THREE.Scene();

	this.sceneRTT.add( this.cameraRTT );

	var planeGeo = new THREE.PlaneGeometry( textureWidth, textureHeight );

	this.quadRTT = new THREE.Mesh( planeGeo, this.copyTexture_material );
	this.quadRTT.position.z = -5000;
	this.sceneRTT.add( this.quadRTT );

	this.textureWidth = textureWidth;
	this.textureHeight = textureHeight;
	this.renderer = renderer;

	this.copyTextureToRT( this.sourceTexture, this.bufferRT_To );
	this.renderer.setRenderTarget( null );
};


GPGPUSimulation.prototype.createTextureFromData = function( data, width, height, format ) {
	var texture = new THREE.DataTexture(
		data,
		width,
		height,
		format,
		THREE.FloatType,
		null,
		THREE.RepeatWrapping,
		THREE.RepeatWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter
	);

	texture.needsUpdate = true;

	return texture;
};

GPGPUSimulation.prototype.copyTextureToRT = function( texture, renderToTexture) {
	var oldMat = this.quadRTT.material;
	this.quadRTT.material = this.copyTexture_material;
	this.copyTexture_material.uniforms.textureToCopy.value = texture;
	this.renderer.render( this.sceneRTT, this.cameraRTT, renderToTexture, false);
	this.quadRTT.material = oldMat;
};

GPGPUSimulation.prototype.resetTextureData = function( textureData, textureWidth, textureHeight ) {
	var format = this.sourceTexture.format;
	var width = textureWidth !== undefined ? textureWidth : this.sourceTexture.image.width;
	var height = textureHeight !== undefined ? textureHeight : this.sourceTexture.image.height;
	this.sourceTexture.dispose();
	console.log("Reseting asteroids.");
	this.sourceTexture = this.createTextureFromData( textureData, width, height, format );
	this.copyTextureToRT( this.sourceTexture, this.bufferRT_To );
	this.renderer.setRenderTarget( null );
};

GPGPUSimulation.prototype.simulate = function( ) {
	var tempRT = this.bufferRT_From;
	this.bufferRT_From = this.bufferRT_To;
	this.bufferRT_To = tempRT;

	this.quadRTT.material.uniforms[ this.dataTexture_uniformName ].value = this.bufferRT_From;
 
	this.renderer.render(
		this.sceneRTT,
		this.cameraRTT,
		this.bufferRT_To );

	this.renderer.setRenderTarget( null );
}

GPGPUSimulation.prototype.setSimulationMaterial = function( simulationShader, dataTexture_uniformName, sourceTexture_uniformName ) {
	this.dataTexture_uniformName = dataTexture_uniformName !== undefined ? dataTexture_uniformName : "dataTexture";
	this.sourceTexture_uniformName = sourceTexture_uniformName !== undefined ? sourceTexture_uniformName : "sourceTexture";
	this.quadRTT.material = simulationShader;
	this.quadRTT.material.uniforms[ this.sourceTexture_uniformName ].value = this.sourceTexture;
}
