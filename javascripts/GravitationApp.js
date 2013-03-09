GravitationApp = function( veroldApp ) {
  this.veroldApp = veroldApp;
  this.planetData;

  this.mainScene;
  this.camera;
  this.asteroids;
  this.mousePos;
  this.prevMousePos;
  this.mouseVelocity;
  this.prevMouseVelocity;
  this.mouseAccel;
}

GravitationApp.prototype.startup = function( ) {

  this.inputHandler = this.veroldApp.getInputHandler();
  this.renderer = this.veroldApp.getRenderer();
  this.picker = this.veroldApp.getPicker();
  this.assetRegistry = this.veroldApp.getAssetRegistry();

  this.veroldApp.on("info_show", this.enableJupiterView, this );
  this.veroldApp.on("info_hide", this.disableJupiterView, this );
  this.veroldApp.on("resize", this.onResize, this);

  if ( !this.renderer.context.getExtension( 'OES_texture_float' ) ) {

    alert( 'This simulation requires a feature not supported by your computer (floating point textures) and cannot run.' );
    return;
  }

  this.renderer.shadowMapEnabled = false;
  this.renderer.autoClear = true;

  this.textureWidth = this.veroldApp.veroldEngine.Renderer.isMobileDevice ? 64 : 512;
  this.textureHeight = this.veroldApp.veroldEngine.Renderer.isMobileDevice ? 64 : 512;
  this.initPlanets();
  
  this.mousePos = new THREE.Vector2();
  this.prevMousePos = new THREE.Vector2();
  this.mouseVelocity = new THREE.Vector2();
  this.prevMouseVelocity = new THREE.Vector2();
  this.mouseAccel = new THREE.Vector2();

  var that = this;

  // DAT.GUI
  var guiData = {
    reset: function() {
      that.asteroids.resetAsteroids();
    },
    gravConstant: 3
  }

  var gui = new dat.GUI({autoPlace:false});
  $('#datgui-container').append(gui.domElement);

  gui.add(guiData, 'gravConstant', 1, 20).name("Gravity Strength").onChange( function( value ) {
    
    that.asteroids.gravConstant = 0.001 * value;
    that.asteroids.simulationMaterial.uniforms.gravConstant.value = that.asteroids.gravConstant;
    that.asteroids.updatePlanetData( 100, 1 );
  });
  // gui.add(guiData, 'reset').name("Reset");

	var boundingBoxesOn = false;
	this.rotation = 0;
  var myCameraJSON = {
    id: "default_camera",
    type: "camera",
    name: "default_camera",
    payload: {
      "type": "PerspectiveCamera", 
      "fov": 50, 
      "aspect" : 0.333,
      "near" : 0.01,
      "far" : 20000,
      "orientation" : { x: 0, y: 0, z: 0, w: 1},
      "position" : { x: 0, y: 0.25, z: 1.5 },
    }
  };

  this.mainScene = this.assetRegistry.Scenes.getAsset( "5106adb643bfc70200000181" );
  
  var camera = this.mainScene.createObject( myCameraJSON, { 
  	success: function( camera ) {
			that.veroldApp.veroldEngine.loadScene("5106adb643bfc70200000181", {
		    success: function( scene ) {
		      
          //Bind to input events to control the camera
          that.veroldApp.on("keyDown", that.onKeyPress, that);
          that.veroldApp.on("mouseUp", that.onMouseUp, that);
          that.veroldApp.on("mouseDown", that.onMouseDown, that);
          that.veroldApp.on("mouseMove", that.onMouseMove, that);
    
          var models = that.mainScene.getAllObjects( { filter: { model: true }} );
          that.jupiter = models[ _.keys( models )[0] ];
          that.jupiter.load( { 
            success: function( jupiter ) {
              that.asteroids = new AsteroidSimulation( that.textureWidth, that.textureHeight, that.veroldApp.getRenderer() );
              that.asteroids.initialize( that.planetData );
              that.mainScene.threeData.add( that.asteroids.particleSystem );
              that.camera.asteroidSimulation = that.asteroids;
              window.asteroidSim = that.asteroids;
              AppUI.hideLoadingProgress();
              AppUI.showUI();
              that.camera.transitionTo( { x: 0.0, y:0.0, z: 2.5 }, myCameraJSON.payload.orientation, 6.0 );
              that.veroldApp.on("update", that.update, that );
              that.veroldApp.on("fixedUpdate", that.fixedUpdate, that );
              //setInterval( function() { that.fixedUpdate() }, 16.667);
              
              //veroldApp.veroldEngine.setActiveCamera
              that.initDebugTexture();
              that.initGravityFieldTexture();

              // jupiter.traverse( function( obj ) {
              //   if ( obj instanceof MeshObject ) {
              //     obj.load( { success: function( mesh ) {
              //       obj.threeData.material = new THREE.MeshBasicMaterial( {lights: false, castShadow: false, receiveShadow: false});
              //     }});
                  
              //   }
              // } )

              // animate movement of watermarks
              var wm = $('#watermarks');
              wm.animate({
                bottom: '1.2%',
                right: '0.9%',
                margin: 0
              },
              800,
              function() {
                wm.css({ bottom: 15, right: 20 });
              })
            }
          })

          that.camera = new TrojanCamera();
          that.camera.initialize( 50, window.innerWidth, window.innerHeight, that.asteroids );
          
          that.veroldApp.setActiveCamera( that.camera.getCamera() );
          that.camera.moveTo( { x: 1.0, y: 0.25, z: 0.00 }, { x: 0.0, y: 0, z: 0, w: 1} );
          that.camera.threeCamera.up.set( 0, 0, 1);
          var jupiter
          that.jupiter.set( {"payload.position" : { x : that.planetData[1].x, y : that.planetData[1].y, z:0 }});
          //this.jupiter.threeData.position.y = this.asteroids.jupiterVector.y;
          that.camera.threeCamera.lookAt( that.jupiter.getPosition() );
                
          that.mainScene.threeData.add( that.camera.getCamera() );
          
          that.initSun( "5106aee5ec062d18180000dd" );

		    },

        progress: function( sceneObj ) {
          var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
          AppUI.setLoadingProgress(percent); 
        }

		  });
		}
  });
},

GravitationApp.prototype.shutdown = function() {

  this.veroldApp.off("keyDown", this.onKeyPress, this);
  this.veroldApp.off("mouseUp", this.onMouseUp, this);
  this.veroldApp.off("mouseDown", this.onMouseDown, this);
  this.veroldApp.off("mouseMove", this.onMouseMove, this);
  this.veroldApp.off("update", this.update, this );
  this.veroldApp.off("info_show", this.enableJupiterView, this );
  this.veroldApp.off("info_hide", this.disableJupiterView, this );
  this.veroldApp.off("resize", this.onResize, this);
}

GravitationApp.prototype.initPlanets = function() {
  var jupiterID = "";

  //Planet data consists of a starting position (x,y), followed by its mass
  this.planetData = new Array();
  var sunData = new THREE.Vector4( 0.0, 0.0, 100.0, 0.0 );
  this.planetData.push( sunData );
  var jupData = new THREE.Vector4( 1.0, 0.0, 1.0, 0.0 );
  this.planetData.push( jupData );

}

GravitationApp.prototype.initSun = function( textureID ) {

  var that = this;
  var sunTexture = this.assetRegistry.Textures.getAsset( textureID, { autoLoad: true,
    success: function( tex ) {
      that.sunMat.uniforms.texture.value = tex.threeData;
    }
  } );

  var sun_vs = [
      "varying vec2 vUv;",
      
      "void main() {",

        "vUv = uv;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position.xyz, 1.0 );",

      "}",
    ].join("\n");

  var sun_fs = [

    "uniform sampler2D texture;",
    "varying vec2 vUv;",
    "void main() {",

      "vec3 sample = texture2D( texture, vUv ).xyz;",
      "gl_FragColor = vec4( sample, 1.0 );",
    "}",
  ].join("\n");

  this.sunMat = new THREE.ShaderMaterial( {

    uniforms: {

      "texture": { type: "t", value: this.assetRegistry.getAsset("black").threeData },

    },
    vertexShader: sun_vs,
    fragmentShader: sun_fs,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending
  } );

  var plane = new THREE.PlaneGeometry( 1.0, 1.0 );
  this.sunQuad = new THREE.Mesh(plane, this.sunMat);
  //quad.rotation.x = Math.PI / 2;
  this.sunQuad.position.z = 0;
  this.mainScene.threeData.add( this.sunQuad );

  this.mainScene.traverse( function( obj ) {
    if ( obj instanceof LightObject ) {
      that.mainScene.removeChildObject( obj );
      //obj.destroy( { save: false });
    }
  });

  var sunLight = new THREE.PointLight( 0xffffdd, 1.25, 10.0 );
  this.sunQuad.add( sunLight );
  this.assetRegistry.Materials.rebuildAll();
}

GravitationApp.prototype.initDebugTexture = function() {
  //Shaders for rendering debug floating point texture

  var debugTexture_vs = [
      "uniform float width;",
      "uniform float height;",

      "varying vec2 vUv;",
      
      "void main() {",

        "vUv = position.xy + vec2( 0.5 / width, 0.5 / height );",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( vec3( position.xy, 0.0), 1.0 );",

      "}",
    ].join("\n");

  var debugTexture_fs = [

    "uniform sampler2D map;",
    "varying vec2 vUv;",
    "void main() {",

      "vec4 sample = texture2D( map, vUv );",
      "gl_FragColor = vec4( vec3(sample.xy, 1.0), 1.0 );",
    "}",
  ].join("\n");

  //Debugging render
  this.debugTextureMat = new THREE.ShaderMaterial( {

    uniforms: {

      "map": { type: "t", value: this.asteroids.bufferRT_From },
      "width": { type: "f", value: this.asteroids.width },
      "height": { type: "f", value: this.asteroids.height }

    },
    vertexShader: debugTexture_vs,
    fragmentShader: debugTexture_fs,
    depthTest: false

  } );

  var plane = new THREE.PlaneGeometry( 5.0, 5.0 );
  this.debugTextureQuad = new THREE.Mesh(plane, this.debugTextureMat);
  //quad.rotation.x = Math.PI / 2;
  this.debugTextureQuad.position.z = -5;
  this.mainScene.threeData.add( this.debugTextureQuad );
  this.debugTextureQuad.visible = false;
}

GravitationApp.prototype.initGravityFieldTexture = function() {
  var gravityField_shader_vs = [
    "uniform float width;",
    "uniform float height;",

    "varying vec2 vUv;",
    
    "void main() {",

      "vUv = position.xy + vec2( 0.5 / width, 0.5 / height );",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( vec3( position.xy, 0.0), 1.0 );",

    "}",
  ].join("\n");

  var gravityField_shader_fs = [
    "uniform float opacity;",
    "varying vec2 vUv;",
    
    "uniform float gravConstant;",
    "uniform vec4 planetData[ NUM_PLANETS ];",

    
    "void main() {",
        "vec2 totalForce = vec2(0.0, 0.0);",
        "vec2 centreOfMass = vec2(0.0, 0.0);",
        "float totalMass = 0.0;",
        "float forces[ NUM_PLANETS ];",
        "for ( int p = 0; p < NUM_PLANETS; p++ ) {",
          "vec2 pos = planetData[p].xy;",
          "float mass = planetData[p].z;",
          "vec2 diff = ( pos - vUv.xy );",
          "forces[ p ] = gravConstant * mass / dot( diff, diff );",
          "vec2 force = normalize( diff ) * forces[ p ];",
          //"force = pow( force, 0.25 );",
          "totalForce += force;",
          "totalMass += mass;",
          "centreOfMass += mass * pos;",
        "}",

      "float balance = forces[1] / forces[0];",
      "balance = (balance - planetData[1].z / planetData[0].z) / balance;",
      "balance = clamp( 1.0 - abs( balance ), 0.0, 1.0);",
      "float balance2 = dot( centreOfMass - planetData[1].xy, centreOfMass - planetData[1].xy );",
      "balance2 = 2.0 * (balance2 - dot( centreOfMass - vUv.xy, centreOfMass - vUv.xy ));",
      "balance2 = clamp( 1.0 - abs( balance2 ), 0.0, 1.0);",
      "float balance3 = balance * balance2;",

      //"gl_FragColor = vec4( balance3, 0.25 * balance2, 0.25 * balance, 1.0 );",
      "gl_FragColor = vec4( balance3, 0.25 * balance3, 0.25 * balance3, opacity );",

    "}",
  ].join("\n");

  this.gravityFieldMat = new THREE.ShaderMaterial( {

    uniforms: {

      gravConstant: { type: "f", value: this.asteroids.gravConstant},
      planetData: { type: "v4v", value: this.planetData },
      "width": { type: "f", value: this.asteroids.width },
      "height": { type: "f", value: this.asteroids.height },
      //"opacity": { type: "f", value: this.gravityFieldQuad.opacity }
    },
    vertexShader: gravityField_shader_vs,
    fragmentShader: gravityField_shader_fs,
    defines: { "NUM_PLANETS" : this.planetData.length },
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending
  } );  
  
  var plane = new THREE.PlaneGeometry( 5.0, 5.0 );
  this.gravityFieldQuad = new THREE.Mesh(plane, this.gravityFieldMat);
  this.gravityFieldMat.uniforms.opacity = { type: "f", value: this.gravityFieldQuad.opacity };
  this.gravityFieldQuad.position.z = 0.01;
  this.mainScene.threeData.add( this.gravityFieldQuad );
  this.gravityFieldQuad.visible = false;
}

GravitationApp.prototype.toggleGravityField = function( on ) {
  if ( on === undefined ) {
    this.gravityFieldQuad.visible = !(this.gravityFieldQuad.visible);
  }
  else {
    this.gravityFieldQuad.visible = on;
  }

  if ( this.gravityFieldQuad.visible ) {
    this.gravityFieldQuad.opacity = 0.0;
  }
  else {
    this.gravityFieldQuad.opacity = 1.0;
  }
  this.gravityFieldMat.uniforms.opacity.value = this.gravityFieldQuad.opacity;
}

GravitationApp.prototype.update = function( delta ) {
	// if ( this.jupiter.threeData ) {
	// 	this.rotation += delta * 0.2;
	// 	this.jupiter.threeData.quaternion.setFromEuler( {x: 0, y: this.rotation, z: 0});
	// }
  
  delta = 0.01;
  if ( this.camera ) {
    
  //if ( !this.camera.transitionTargetPos ) {
    if ( this.asteroids ) {
      
      this.prevMouseVelocity = this.mouseVelocity;
      this.mouseVelocity.subVectors( this.mousePos, this.prevMousePos );
      this.mouseVelocity.divideScalar( delta );
      this.mouseVelocity.multiplyScalar( 0.1 );
      this.prevMouseVelocity.multiplyScalar( 0.9 );
      this.mouseVelocity.add( this.prevMouseVelocity );
      this.prevMouseVelocity.multiplyScalar( 1.11111 );
      //this.mouseAccel.subVectors( this.mouseVelocity, this.prevMouseVelocity );
      //this.mouseAccel.divideScalar( delta );
      //this.mouseVelocity.add( this.mouseAccel );
      // if ( this.inputHandler.mouseButtonState[ this.inputHandler.mouseButtons[ "right" ] ]) {
      //   console.log( this.mouseVelocity );
      // }

      this.prevMousePos.x = this.mousePos.x;
      this.prevMousePos.y = this.mousePos.y;
      
      if ( this.asteroids.getSpawnEnabled() ) {
        this.asteroids.setSpawnPoint( this.camera.convertScreenPosToWorld( this.mousePos ), this.camera.convertScreenVelToWorld( this.mouseVelocity ) );
        //console.log(this.mouseVelocity);
        
      }
   

      //Animate gravity field fade in/out
      if ( this.gravityFieldQuad.visible && this.gravityFieldQuad.opacity < 1.0) {
        this.gravityFieldQuad.opacity += delta;
        this.gravityFieldQuad.opacity = Math.min( 1.0, this.gravityFieldQuad.opacity);
        this.gravityFieldMat.uniforms.opacity.value = this.gravityFieldQuad.opacity;
      }

      //Do gravity simulation and then update the position of the planets
      
      // if ( !this.gravityFieldQuad.visible && this.gravityFieldQuad.opacity < 1.0) {
      //   this.gravityFieldQuad.opacity += delta;
      //   this.gravityFieldQuad.opacity = Math.min( 1.0, this.gravityFieldQuad.opacity);
      // }
    }
  }
}

GravitationApp.prototype.fixedUpdate = function( delta ) {
 
  delta = 0.01667;
  this.camera.update( delta );
  this.asteroids.update( delta );
  this.debugTextureMat.uniforms.map.value = this.asteroids.bufferRT_From;
  if ( this.jupiter.threeData ) {
    this.jupiter.threeData.position.x = this.asteroids.jupiterVector.x;
    this.jupiter.threeData.position.y = this.asteroids.jupiterVector.y;
    this.sunQuad.position.x = this.asteroids.sunVector.x;
    this.sunQuad.position.y = this.asteroids.sunVector.y;
  }
  
}

GravitationApp.prototype.onMouseMove = function( event ) {

  this.mousePos.x = ( event.clientX / window.innerWidth - 0.5 ) * 2.0;
  this.mousePos.y = -( event.clientY / window.innerHeight - 0.5 ) * 2.0;
}

GravitationApp.prototype.onMouseDown = function( event ) {
  if ( event.button == this.inputHandler.mouseButtons['left']) {
    this.asteroids.setSpawnEnabled( true );
    this.asteroids.setSpawnType( 'circularOrbit' );
  }
  else if ( event.button == this.inputHandler.mouseButtons['right']) {
    this.asteroids.setSpawnEnabled( true );
    this.asteroids.setSpawnType( 'customOrbit' );
  }

  if ( event.button == this.inputHandler.mouseButtons[ "left" ] && 
    !this.inputHandler.mouseDragStatePrevious[ event.button ] ) {
    
    // var scene = this.veroldEngine.assetRegistry.assets[ this.currentSceneID ].threeData;
    // var camera = this.veroldEngine.getActiveCamera();
    var mouseX = event.sceneX / this.veroldApp.veroldEngine.Renderer.getWidth();
    var mouseY = event.sceneY / this.veroldApp.veroldEngine.Renderer.getHeight();
    var pickData = this.picker.pick( this.mainScene.threeData, this.camera.getCamera(), mouseX, mouseY );
    if ( pickData ) {
      if ( pickData.modelID == "5106b54943bfc70200000194" && !this.camera.transitionTargetPos ) {
        //Jupiter was clicked
        this.camera.toggleCameraLock( );
        this.toggleGravityField();
      }
    }

  }
}

GravitationApp.prototype.onMouseUp = function( event ) {
  this.asteroids.setSpawnEnabled( false );

  
}

GravitationApp.prototype.onKeyPress = function( event ) {
	
	var keyCodes = this.inputHandler.keyCodes;


  //if ( event.keyCode == keyCodes['Z'] ) this.debugTextureQuad.visible = !(this.debugTextureQuad.visible);
  //else if ( event.keyCode == keyCodes['X'] ) this.gravityFieldQuad.visible = !(this.gravityFieldQuad.visible);
  if ( event.keyCode == keyCodes['space'] && !this.camera.transitionTargetPos ) {
    this.camera.toggleCameraLock( );
    this.toggleGravityField();
  }
  else if ( event.keyCode === keyCodes['P'])
  {
    this.veroldApp.veroldEngine.Renderer.stats.domElement.hidden = !this.veroldApp.veroldEngine.Renderer.stats.domElement.hidden;
  }
  else if ( event.keyCode === keyCodes['R'])
  {
    this.asteroids.resetAsteroids();
  }
    
}

GravitationApp.prototype.onResize = function( ) {
  // var aspect = this.veroldApp.veroldEngine.Renderer.getWidth() / this.veroldApp.veroldEngine.Renderer.getHeight();
  // this.asteroids.simulationMaterial.uniforms.aspect.value = aspect;
}

GravitationApp.prototype.enableJupiterView = function( ) {
  this.camera.toggleCameraLock( true );
  this.toggleGravityField( true );
}

GravitationApp.prototype.disableJupiterView = function( ) {
  this.camera.toggleCameraLock( false );
  this.toggleGravityField( false );
}

