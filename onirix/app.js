// ====== Imports ======

import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.4.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";

// ====== ThreeJS ======

var renderer, scene, camera, model;

function setupRenderer(rendererCanvas) {
  const width = rendererCanvas.width;
  const height = rendererCanvas.height;

  // Initialize renderer with rendererCanvas provided by Onirix SDK
  renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);

  // Ask Onirix SDK for camera parameters to create a 3D camera that fits with the AR projection.
  const cameraParams = OX.getCameraParameters();
  camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
  camera.matrixAutoUpdate = false;

  // Create an empty scene
  scene = new THREE.Scene();

  // Add some lights
  const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);
  const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
  scene.add(hemisphereLight);

  // Load a 3D frame model
  const gltfLoader = new GLTFLoader();
  gltfLoader.load("frame.glb", (gltf) => {
    model = gltf.scene;
  });

  // Uncomment below to show debug 3D axes
  // let axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);
}

function updatePose(pose) {
  // When a new pose is detected, update the 3D camera
  let modelViewMatrix = new THREE.Matrix4();
  modelViewMatrix = modelViewMatrix.fromArray(pose);
  camera.matrix = modelViewMatrix;
  camera.matrixWorldNeedsUpdate = true;
}

function onResize() {
  // When device orientation changes, it is required to update camera params.
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const cameraParams = OX.getCameraParameters();
  camera.fov = cameraParams.fov;
  camera.aspect = cameraParams.aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function render() {
  // Just render the scene
  renderer.render(scene, camera);
}

// ====== Onirix SDK ======

const OX = new OnirixSDK(
  // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUyMDIsInByb2plY3RJZCI6MTQ0MjksInJvbGUiOjMsImlhdCI6MTYxNjc2MDI5M30.knKDX5vda6UyqB8CobqgPQ8BS7OYQo4RDfIuGm-EJGg"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMyNjEyLCJwcm9qZWN0SWQiOjY0MzkwLCJyb2xlIjozLCJpYXQiOjE3MDA4MDM3NzZ9.XO08C-uvA7ESTxAXpfV3pE8KO0mEijKxk1FIo_GxVK8"
);

const config = {
  mode: OnirixSDK.TrackingMode.Image,
};

OX.init(config)
  .then((rendererCanvas) => {
    // Setup ThreeJS renderer
    setupRenderer(rendererCanvas);

    // All loaded, so hide loading screen
    document.getElementById("loading-screen").style.display = "none";

    // Subscribe to events
    OX.subscribe(OnirixSDK.Events.OnDetected, function (id) {
      console.log("Detected Image: " + id);
      // Diplay 3D model
      scene.add(model);
      // It is useful to synchronize scene background with the camera feed
      scene.background = new THREE.VideoTexture(OX.getCameraFeed());
    });

    OX.subscribe(OnirixSDK.Events.OnPose, function (pose) {
      updatePose(pose);
    });

    OX.subscribe(OnirixSDK.Events.OnLost, function (id) {
      console.log("Lost Image: " + id);
      // Hide 3D model
      scene.remove(model);
      scene.background = null;
    });

    OX.subscribe(OnirixSDK.Events.OnResize, function () {
      onResize();
    });

    OX.subscribe(OnirixSDK.Events.OnFrame, function () {
      render();
    });

    // Start tracking
    OX.start();
  })
  .catch((error) => {
    // An error ocurred, chech error type and display it
    document.getElementById("loading-screen").style.display = "none";

    switch (error.name) {
      case "INTERNAL_ERROR":
        document.getElementById("error-title").innerText = "Internal Error";
        document.getElementById("error-message").innerText =
          "An unespecified error has occurred. Your device might not be compatible with this experience.";
        break;

      case "CAMERA_ERROR":
        document.getElementById("error-title").innerText = "Camera Error";
        document.getElementById("error-message").innerText =
          "Could not access to your device's camera. Please, ensure you have given required permissions from your browser settings.";
        break;

      case "SENSORS_ERROR":
        document.getElementById("error-title").innerText = "Sensors Error";
        document.getElementById("error-message").innerText =
          "Could not access to your device's motion sensors. Please, ensure you have given required permissions from your browser settings.";
        break;

      case "LICENSE_ERROR":
        document.getElementById("error-title").innerText = "License Error";
        document.getElementById("error-message").innerText = "This experience does not exist or has been unpublished.";
        break;
    }

    document.getElementById("error-screen").style.display = "flex";
  });
