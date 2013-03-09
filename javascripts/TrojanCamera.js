TrojanCamera = function(  ) {
	this.threeCamera;
	this.asteroidSimulation;
	this.cameraLock = false;
	this.eulerRotation = new THREE.Vector3();
	this.transitionTime = 0;
	this.inverseTransformation = new THREE.Matrix4();
	this.screenToWorldPos = new THREE.Vector3();
	this.screenToWorldVel = new THREE.Vector3();
};

TrojanCamera.prototype.initialize = function( fov, width, height, simulation ) {

	this.threeCamera = new THREE.PerspectiveCamera( fov, width / height, 0.05, 20000 );
	this.threeCamera.position.set( 0.0,0.0,2.5);
	this.threeCamera.useQuaternion = true;
	this.asteroidSimulation = simulation;
	this.inverseTransformation.getInverse( this.threeCamera.projectionMatrix );
	var viewMatInv = new THREE.Matrix4();
	//viewMatInv.getInverse( this.threeCamera.viewMatrix );
};

TrojanCamera.prototype.toggleCameraLock = function( on ) {
	if ( on === undefined ) {
		this.cameraLock = !this.cameraLock;
	}
	else {
		this.cameraLock = on;
	}
	if ( this.cameraLock ) {
		this.transitionTime = 0.0;
	}
}

TrojanCamera.prototype.update = function( delta ) {
	if ( this.cameraLock ) {
		this.transitionTime += delta;
		var transitionPercent = this.transitionTime / 1.0;
		if ( transitionPercent >= 1.0 ) {
			this.eulerRotation.z = this.asteroidSimulation.jupiterAngle;
		}
		else {
			var difference = this.asteroidSimulation.jupiterAngle - this.eulerRotation.z;
			if ( difference > Math.PI ) {
				difference -= 2.0 * Math.PI;
			}

			this.eulerRotation.z += difference * transitionPercent;
		}
		
		this.threeCamera.quaternion.setFromEuler( this.eulerRotation );
	}
	else if ( this.transitionTargetPos ) {
		this.transitionTime += delta;
		var transitionPercent = Math.pow( this.transitionTime / 4.0, 6.0 );
		if ( transitionPercent >= 1.0 ) {
			this.transitionTargetPos = null;
			this.transitionTargetQuaternion = null;
			this.transitionTime = 0;
		}
		else {
			this.threeCamera.quaternion.slerp( this.transitionTargetQuaternion, transitionPercent);
			this.threeCamera.position.lerp( this.transitionTargetPos, transitionPercent );
		}
	}
}

TrojanCamera.prototype.moveTo = function( position, orientation ) {

	this.threeCamera.quaternion.set( orientation.x, orientation.y, orientation.z, orientation.w );
	this.threeCamera.position.set( position.x, position.y, position.z );
}

TrojanCamera.prototype.transitionTo = function( position, orientation ) {
	this.transitionTime = 0;
	this.transitionTargetPos = new THREE.Vector3( position.x, position.y, position.z );
	this.transitionTargetQuaternion = new THREE.Quaternion( orientation.x, orientation.y, orientation.z, orientation.w );
}

TrojanCamera.prototype.getCamera = function() {
	return this.threeCamera;
}

TrojanCamera.prototype.convertScreenPosToWorld = function( screenPos ) {

  var sceneHalfHeight = Math.abs( this.threeCamera.position.z ) * Math.tan( this.threeCamera.fov * Math.PI / 360.0 );
  var sceneHalfWidth = sceneHalfHeight * this.threeCamera.aspect;

  this.screenToWorldPos.x = screenPos.x * sceneHalfWidth;
  this.screenToWorldPos.y = screenPos.y * sceneHalfHeight;
  this.screenToWorldPos.applyQuaternion( this.threeCamera.quaternion );
  return this.screenToWorldPos;
}

TrojanCamera.prototype.convertScreenVelToWorld = function( screenPos ) {

  var sceneHalfHeight = Math.abs( this.threeCamera.position.z ) * Math.tan( this.threeCamera.fov * Math.PI / 360.0 );
  var sceneHalfWidth = sceneHalfHeight * this.threeCamera.aspect;

  this.screenToWorldVel.x = screenPos.x * sceneHalfWidth;
  this.screenToWorldVel.y = screenPos.y * sceneHalfHeight;
  this.screenToWorldVel.applyQuaternion( this.threeCamera.quaternion );
  return this.screenToWorldVel;
}