import * as THREE from 'three';
import JSZip from 'jszip';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const stage = $('#stage');
const canvas = $('#viewport');

const state = {
  background: 'transparent',
  cameraType: 'perspective',
  baseScale: 1,
  padding: 12,
  ratioLocked: true,
  ratio: 1,
  files: [],
  objectName: 'studio-demo',
  objectBounds: null,
  angleBaseline: null,
  modelScale: 1,
  centerline: { x: 0, y: 0, z: 0 },
  baseObjectPosition: new THREE.Vector3(),
  pivotReferenceSize: new THREE.Vector3(1, 1, 1),
};

const CAMERA_PRESET_KEY = 'product-shot-studio.camera-presets.v1';
let cameraPresets = readCameraPresets();

const scene = new THREE.Scene();
const pivotRoot = new THREE.Group();
const modelPivot = new THREE.Group();
const orientationPivot = new THREE.Group();
modelPivot.add(orientationPivot);
pivotRoot.add(modelPivot);
scene.add(pivotRoot);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const perspectiveCamera = new THREE.PerspectiveCamera(34, 1, 0.01, 1000);
perspectiveCamera.setFocalLength(70);
perspectiveCamera.position.set(5.2, 3.6, 6.2);
const orthographicCamera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.01, 1000);
orthographicCamera.position.copy(perspectiveCamera.position);
let activeCamera = perspectiveCamera;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;
controls.minDistance = 0.1;
controls.maxDistance = 100;
controls.target.set(0, 1, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = environment;

const hemi = new THREE.HemisphereLight(0xf6fbff, 0x15180f, 1.15);
scene.add(hemi);
const keyLight = makeStudioLight(0xffffff, 8.5, [4, 6, 5], [4.2, 4.2]);
const fillLight = makeStudioLight(0xc8dcff, 4.2, [-4, 2.6, 3], [3.2, 3.2]);
const rimLight = makeStudioLight(0x7dc244, 5.5, [2, 4, -5], [2.5, 4]);

function makeStudioLight(color, intensity, position, size) {
  const light = new THREE.RectAreaLight(color, intensity, size[0], size[1]);
  light.position.set(...position);
  light.lookAt(0, 1, 0);
  scene.add(light);
  return light;
}

const shadowLight = new THREE.DirectionalLight(0xffffff, 2.2);
shadowLight.position.set(4, 7, 5);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(2048, 2048);
shadowLight.shadow.camera.near = 0.1;
shadowLight.shadow.camera.far = 30;
shadowLight.shadow.camera.left = -6;
shadowLight.shadow.camera.right = 6;
shadowLight.shadow.camera.top = 6;
shadowLight.shadow.camera.bottom = -6;
shadowLight.shadow.bias = -0.00025;
scene.add(shadowLight);

const floorMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.35, transparent: true });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.004;
floor.receiveShadow = true;
floor.visible = false;
scene.add(floor);

const grid = new THREE.GridHelper(20, 40, 0x67706d, 0x3f4745);
grid.material.opacity = 0.22;
grid.material.transparent = true;
grid.position.y = 0.002;
grid.visible = false;
scene.add(grid);

let currentObject = createDemoProduct();
orientationPivot.add(currentObject);
prepareObject(currentObject, false);

function createDemoProduct() {
  const root = new THREE.Group();
  root.name = 'Studio demo';
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x252b29, roughness: 0.29, metalness: 0.45, clearcoat: 0.55, clearcoatRoughness: 0.25 });
  const insetMaterial = new THREE.MeshStandardMaterial({ color: 0x111514, roughness: 0.42, metalness: 0.58 });
  const greenMaterial = new THREE.MeshPhysicalMaterial({ color: 0x7dc244, roughness: 0.28, metalness: 0.05, clearcoat: 0.65 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x263635, roughness: 0.08, metalness: 0.15, transmission: 0.2, transparent: true, opacity: 0.9 });
  const rubberMaterial = new THREE.MeshStandardMaterial({ color: 0x090b0a, roughness: 0.8, metalness: 0 });

  const body = new THREE.Mesh(new RoundedBoxGeometry(3.5, 2.25, 1.7, 8, 0.18), bodyMaterial);
  body.position.y = 1.2;
  root.add(body);

  const front = new THREE.Mesh(new RoundedBoxGeometry(2.75, 1.35, 0.08, 6, 0.09), insetMaterial);
  front.position.set(0, 1.25, 0.88);
  root.add(front);

  const screen = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.5, 0.045, 5, 0.05), glassMaterial);
  screen.position.set(-0.55, 1.47, 0.935);
  root.add(screen);

  const charge = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.1), new THREE.MeshBasicMaterial({ color: 0x7dc244, toneMapped: false }));
  charge.position.set(-0.67, 1.44, 0.961);
  root.add(charge);

  for (let i = 0; i < 3; i++) {
    const port = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.04, 32), rubberMaterial);
    port.rotation.x = Math.PI / 2;
    port.position.set(0.5 + i * 0.42, 1.45, 0.955);
    root.add(port);
  }

  const accent = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.11, 0.055, 4, 0.035), greenMaterial);
  accent.position.set(0, 0.76, 0.955);
  root.add(accent);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.12, 20, 64, Math.PI), bodyMaterial);
  handle.rotation.z = Math.PI;
  handle.scale.y = 0.72;
  handle.position.set(0, 2.45, 0);
  root.add(handle);
  const grip = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.23, 0.3, 5, 0.08), rubberMaterial);
  grip.position.set(0, 2.46, 0);
  root.add(grip);

  [-1, 1].forEach((x) => {
    [-.55, .55].forEach((z) => {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.13, 0.38, 4, 0.04), rubberMaterial);
      foot.position.set(x * 1.25, 0.08, z);
      root.add(foot);
    });
  });
  return root;
}

function prepareObject(object, reframe = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if ('envMapIntensity' in material) material.envMapIntensity = 1.05;
          material.needsUpdate = true;
        });
      }
    }
  });
  normalizeObject(object);
  if (reframe) fitCameraToObject();
}

function normalizeObject(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.length()) || size.length() === 0) return;
  const maxDimension = Math.max(size.x, size.y, size.z);
  const normalizationScale = 3.6 / maxDimension;
  object.scale.multiplyScalar(normalizationScale);
  object.updateMatrixWorld(true);
  const normalizedBox = new THREE.Box3().setFromObject(object);
  const normalizedCenter = normalizedBox.getCenter(new THREE.Vector3());
  object.position.x -= normalizedCenter.x;
  object.position.z -= normalizedCenter.z;
  object.position.y -= normalizedBox.min.y;
  object.updateMatrixWorld(true);
  state.objectBounds = new THREE.Box3().setFromObject(object);
  state.baseObjectPosition.copy(object.position);
  state.objectBounds.getSize(state.pivotReferenceSize);
  state.baseScale = object.scale.x;
  state.modelScale = 1;
  state.centerline = { x: 0, y: 0, z: 0 };
  pivotRoot.position.set(0, 0, 0);
  setRangePair('modelScale', 'scaleValue', 1, 100);
  setRangePair('centerlineX', 'centerlineXValue', 0);
  setRangePair('centerlineY', 'centerlineYValue', 0);
  setRangePair('centerlineZ', 'centerlineZValue', 0);
}

function applyCenterline() {
  if (!currentObject) return;
  const scale = state.modelScale || 1;
  const offset = new THREE.Vector3(
    state.pivotReferenceSize.x * scale * state.centerline.x / 100,
    state.pivotReferenceSize.y * scale * state.centerline.y / 100,
    state.pivotReferenceSize.z * scale * state.centerline.z / 100,
  );
  pivotRoot.position.copy(offset);
  currentObject.position.copy(state.baseObjectPosition).sub(offset);
  scene.updateMatrixWorld(true);
}

function setCenterline(axis, value) {
  state.centerline[axis] = value;
  applyCenterline();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
}

function resetCenterline(showMessage = true) {
  state.centerline = { x: 0, y: 0, z: 0 };
  setRangePair('centerlineX', 'centerlineXValue', 0);
  setRangePair('centerlineY', 'centerlineYValue', 0);
  setRangePair('centerlineZ', 'centerlineZValue', 0);
  applyCenterline();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
  if (showMessage) showToast('Centerline reset');
}

function getBounds() {
  if (!currentObject) return new THREE.Box3(new THREE.Vector3(-1), new THREE.Vector3(1));
  scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(orientationPivot);
}

function fitCameraToObject(view = 'iso') {
  const box = getBounds();
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = Math.max(sphere.radius, 0.35);
  const paddingFactor = 1 + state.padding / 100;
  const vFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * perspectiveCamera.aspect);
  const distance = (radius * paddingFactor) / Math.sin(Math.min(vFov, hFov) / 2);
  const direction = view === 'front' ? new THREE.Vector3(0, 0.04, 1) : new THREE.Vector3(0.72, 0.48, 1);
  direction.normalize();

  perspectiveCamera.up.set(0, 1, 0);
  orthographicCamera.up.set(0, 1, 0);

  perspectiveCamera.position.copy(center).addScaledVector(direction, distance);
  perspectiveCamera.near = Math.max(distance / 200, 0.005);
  perspectiveCamera.far = distance * 40;
  perspectiveCamera.updateProjectionMatrix();

  const aspect = orthographicCamera.aspect || 1;
  const half = radius * paddingFactor;
  orthographicCamera.left = -half * aspect;
  orthographicCamera.right = half * aspect;
  orthographicCamera.top = half;
  orthographicCamera.bottom = -half;
  if (aspect < 1) {
    orthographicCamera.left = -half;
    orthographicCamera.right = half;
    orthographicCamera.top = half / aspect;
    orthographicCamera.bottom = -half / aspect;
  }
  orthographicCamera.position.copy(center).addScaledVector(direction, distance);
  orthographicCamera.near = Math.max(distance / 200, 0.005);
  orthographicCamera.far = distance * 40;
  orthographicCamera.zoom = 1;
  orthographicCamera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

function resizeRenderer() {
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  renderer.setSize(width, height, false);
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  updateOrthoAspect(width / height);
}

function updateOrthoAspect(aspect) {
  orthographicCamera.aspect = aspect;
  const box = getBounds();
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const half = Math.max(sphere.radius, .35) * (1 + state.padding / 100);
  if (aspect >= 1) {
    orthographicCamera.left = -half * aspect;
    orthographicCamera.right = half * aspect;
    orthographicCamera.top = half;
    orthographicCamera.bottom = -half;
  } else {
    orthographicCamera.left = -half;
    orthographicCamera.right = half;
    orthographicCamera.top = half / aspect;
    orthographicCamera.bottom = -half / aspect;
  }
  orthographicCamera.updateProjectionMatrix();
}

new ResizeObserver(resizeRenderer).observe(stage);

function renderLoop() {
  requestAnimationFrame(renderLoop);
  controls.update();
  renderer.render(scene, activeCamera);
}
renderLoop();
fitCameraToObject();

function setActiveCamera(type) {
  state.cameraType = type;
  const oldCamera = activeCamera;
  activeCamera = type === 'orthographic' ? orthographicCamera : perspectiveCamera;
  activeCamera.position.copy(oldCamera.position);
  activeCamera.quaternion.copy(oldCamera.quaternion);
  activeCamera.up.copy(oldCamera.up);
  controls.object = activeCamera;
  controls.update();
  $('#focalRow').style.display = type === 'perspective' ? '' : 'none';
  $$('#cameraType button').forEach((button) => button.classList.toggle('active', button.dataset.camera === type));
}

function perpendicularUp(front, candidate = new THREE.Vector3(0, 1, 0)) {
  const up = candidate.clone().projectOnPlane(front);
  if (up.lengthSq() < 1e-6) up.copy(Math.abs(front.y) < .95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, -1)).projectOnPlane(front);
  return up.normalize();
}

function defaultAngleDistance(radius) {
  const vFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * perspectiveCamera.aspect);
  return (radius * (1 + state.padding / 100)) / Math.sin(Math.min(vFov, hFov) / 2);
}

function getAngleFrame(sphere) {
  if (!state.angleBaseline) {
    return {
      front: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, 1, 0),
      target: sphere.center.clone(),
      distance: defaultAngleDistance(Math.max(sphere.radius, .35)),
      orthoZoom: 1,
    };
  }
  const radius = Math.max(sphere.radius, .001);
  const front = new THREE.Vector3().fromArray(state.angleBaseline.front).normalize();
  return {
    front,
    up: perpendicularUp(front, new THREE.Vector3().fromArray(state.angleBaseline.up)),
    target: sphere.center.clone().add(new THREE.Vector3().fromArray(state.angleBaseline.targetOffset).multiplyScalar(radius)),
    distance: radius * state.angleBaseline.distanceRatio,
    orthoZoom: state.angleBaseline.orthoZoom || 1,
  };
}

function setAngleBaseline() {
  const sphere = getBounds().getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, .001);
  const target = controls.target.clone();
  const cameraOffset = activeCamera.position.clone().sub(target);
  if (cameraOffset.lengthSq() < 1e-8) return showToast('Move the camera before setting a baseline');
  const front = cameraOffset.normalize();
  const up = perpendicularUp(front, activeCamera.up);
  state.angleBaseline = {
    front: front.toArray(),
    up: up.toArray(),
    targetOffset: target.sub(sphere.center).divideScalar(radius).toArray(),
    distanceRatio: activeCamera.position.distanceTo(controls.target) / radius,
    orthoZoom: activeCamera.isOrthographicCamera ? activeCamera.zoom : 1,
  };
  updateAngleBaselineUi();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
  showToast('Current view set as the angle baseline');
}

function resetAngleBaseline(showMessage = true) {
  state.angleBaseline = null;
  updateAngleBaselineUi();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
  if (showMessage) showToast('Angle baseline reset');
}

function updateAngleBaselineUi() {
  const status = $('#angleBaselineStatus');
  const reset = $('#resetAngleBaseline');
  if (!status || !reset) return;
  status.textContent = state.angleBaseline ? 'Custom baseline ready. Presets orbit from this view.' : 'Using the default front view.';
  status.classList.toggle('custom', Boolean(state.angleBaseline));
  reset.disabled = !state.angleBaseline;
}

function setViewAngle(name) {
  const sphere = getBounds().getBoundingSphere(new THREE.Sphere());
  const frame = getAngleFrame(sphere);
  const radius = Math.max(sphere.radius, .35);
  const yaw = THREE.MathUtils.degToRad(38);
  let direction;
  let cameraUp = frame.up.clone();
  if (name === 'front') direction = frame.front.clone();
  else if (name === 'back') direction = frame.front.clone().negate();
  else if (name === 'left') direction = frame.front.clone().applyAxisAngle(frame.up, -Math.PI / 2);
  else if (name === 'right') direction = frame.front.clone().applyAxisAngle(frame.up, Math.PI / 2);
  else if (name === 'three-quarter-left') direction = frame.front.clone().applyAxisAngle(frame.up, -yaw);
  else if (name === 'three-quarter-right') direction = frame.front.clone().applyAxisAngle(frame.up, yaw);
  else if (name === 'front-elevated') {
    const elevation = THREE.MathUtils.degToRad(20);
    direction = frame.front.clone().multiplyScalar(Math.cos(elevation)).addScaledVector(frame.up, Math.sin(elevation)).normalize();
    cameraUp = perpendicularUp(direction, frame.up);
  }
  else if (name === 'top') {
    direction = frame.up.clone();
    cameraUp = frame.front.clone().negate();
  } else if (name === 'bottom') {
    direction = frame.up.clone().negate();
    cameraUp = frame.front.clone();
  } else return;
  direction.normalize();
  const distance = state.angleBaseline ? frame.distance : defaultAngleDistance(radius);
  activeCamera.position.copy(frame.target).addScaledVector(direction, distance);
  activeCamera.up.copy(cameraUp.normalize());
  activeCamera.near = Math.max(distance / 200, .005);
  activeCamera.far = distance * 40;
  if (activeCamera.isOrthographicCamera) {
    updateOrthoAspect(activeCamera.aspect || perspectiveCamera.aspect);
    activeCamera.zoom = state.angleBaseline ? frame.orthoZoom : 1;
  }
  activeCamera.lookAt(frame.target);
  activeCamera.updateProjectionMatrix();
  controls.target.copy(frame.target);
  controls.update();
  $$('.angle-grid button').forEach((button) => button.classList.toggle('active', button.dataset.angle === name));
}

function readCameraPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMERA_PRESET_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCameraPresets() {
  try { localStorage.setItem(CAMERA_PRESET_KEY, JSON.stringify(cameraPresets)); }
  catch { showToast('Camera presets could not be saved in this browser'); }
}

function captureCameraPreset(name) {
  const sphere = getBounds().getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, .001);
  const cameraOffset = activeCamera.position.clone().sub(sphere.center);
  const distanceRatio = cameraOffset.length() / radius;
  const targetOffset = controls.target.clone().sub(sphere.center).divideScalar(radius);
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    cameraType: state.cameraType,
    direction: cameraOffset.normalize().toArray(),
    distanceRatio,
    targetOffset: targetOffset.toArray(),
    up: activeCamera.up.toArray(),
    focalLength: perspectiveCamera.getFocalLength(),
    orthoZoom: orthographicCamera.zoom,
    objectRotationY: modelPivot.rotation.y,
    objectRotationX: orientationPivot.rotation.x,
    objectOrientationY: orientationPivot.rotation.y,
    centerline: { ...state.centerline },
    modelScale: Number($('#modelScale').value),
    padding: state.padding,
    angleBaseline: state.angleBaseline ? {
      front: [...state.angleBaseline.front],
      up: [...state.angleBaseline.up],
      targetOffset: [...state.angleBaseline.targetOffset],
      distanceRatio: state.angleBaseline.distanceRatio,
      orthoZoom: state.angleBaseline.orthoZoom,
    } : null,
    createdAt: Date.now(),
  };
}

function saveCurrentCamera() {
  const input = $('#presetName');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    showToast('Name this camera preset first');
    return;
  }
  const preset = captureCameraPreset(name);
  const existingIndex = cameraPresets.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    preset.id = cameraPresets[existingIndex].id;
    cameraPresets.splice(existingIndex, 1, preset);
  } else {
    cameraPresets.unshift(preset);
  }
  persistCameraPresets();
  renderCameraPresets();
  input.value = '';
  showToast(existingIndex >= 0 ? `Updated “${name}”` : `Saved “${name}”`);
}

function applyCameraPreset(preset) {
  modelPivot.rotation.y = preset.objectRotationY || 0;
  orientationPivot.rotation.x = preset.objectRotationX ?? preset.objectRotationZ ?? 0;
  orientationPivot.rotation.y = preset.objectOrientationY || 0;
  const turntableDegrees = Math.round(THREE.MathUtils.radToDeg(modelPivot.rotation.y));
  const rotateXDegrees = Math.round(THREE.MathUtils.radToDeg(orientationPivot.rotation.x));
  const rotateYDegrees = Math.round(THREE.MathUtils.radToDeg(orientationPivot.rotation.y));
  setRangePair('rotation', 'rotationValue', turntableDegrees);
  setRangePair('rotateX', 'rotateXValue', rotateXDegrees);
  setRangePair('rotateY', 'rotateYValue', rotateYDegrees);

  const modelScale = THREE.MathUtils.clamp(Number(preset.modelScale) || 1, .25, 2);
  state.modelScale = modelScale;
  currentObject.scale.setScalar(state.baseScale * modelScale);
  setRangePair('modelScale', 'scaleValue', modelScale, modelScale * 100);

  state.centerline = {
    x: THREE.MathUtils.clamp(Number(preset.centerline?.x) || 0, -100, 100),
    y: THREE.MathUtils.clamp(Number(preset.centerline?.y) || 0, -100, 100),
    z: THREE.MathUtils.clamp(Number(preset.centerline?.z) || 0, -100, 100),
  };
  setRangePair('centerlineX', 'centerlineXValue', state.centerline.x);
  setRangePair('centerlineY', 'centerlineYValue', state.centerline.y);
  setRangePair('centerlineZ', 'centerlineZValue', state.centerline.z);
  applyCenterline();

  state.padding = THREE.MathUtils.clamp(Number(preset.padding) || 12, 2, 30);
  setRangePair('padding', 'paddingValue', state.padding);

  state.angleBaseline = preset.angleBaseline?.front && preset.angleBaseline?.up && preset.angleBaseline?.targetOffset
    ? {
      front: [...preset.angleBaseline.front],
      up: [...preset.angleBaseline.up],
      targetOffset: [...preset.angleBaseline.targetOffset],
      distanceRatio: Number(preset.angleBaseline.distanceRatio) || 5,
      orthoZoom: Number(preset.angleBaseline.orthoZoom) || 1,
    }
    : null;
  updateAngleBaselineUi();

  setActiveCamera(preset.cameraType === 'orthographic' ? 'orthographic' : 'perspective');
  perspectiveCamera.setFocalLength(THREE.MathUtils.clamp(Number(preset.focalLength) || 70, 24, 150));
  setRangePair('focalLength', 'focalValue', Math.round(perspectiveCamera.getFocalLength()));

  const sphere = getBounds().getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, .001);
  const direction = new THREE.Vector3().fromArray(preset.direction || [0.72, .48, 1]).normalize();
  const target = sphere.center.clone().add(new THREE.Vector3().fromArray(preset.targetOffset || [0, 0, 0]).multiplyScalar(radius));
  const distance = radius * (Number(preset.distanceRatio) || 5);
  activeCamera.position.copy(sphere.center).addScaledVector(direction, distance);
  activeCamera.up.fromArray(preset.up || [0, 1, 0]);
  activeCamera.near = Math.max(distance / 200, .005);
  activeCamera.far = distance * 40;
  if (activeCamera.isOrthographicCamera) {
    updateOrthoAspect(activeCamera.aspect || perspectiveCamera.aspect);
    activeCamera.zoom = Number(preset.orthoZoom) || 1;
  }
  activeCamera.lookAt(target);
  activeCamera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
  showToast(`Applied “${preset.name}”`);
}

function renderCameraPresets() {
  const list = $('#presetList');
  list.replaceChildren();
  $('#presetCount').textContent = `${cameraPresets.length} saved`;
  if (!cameraPresets.length) {
    const empty = document.createElement('div');
    empty.className = 'preset-empty';
    empty.textContent = 'No camera presets yet';
    list.append(empty);
    return;
  }
  cameraPresets.forEach((preset) => {
    const row = document.createElement('div');
    row.className = 'preset-item';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'preset-apply';
    const title = document.createElement('strong');
    title.textContent = preset.name;
    const detail = document.createElement('small');
    detail.textContent = `${preset.cameraType} · ${Math.round(preset.focalLength || 70)} mm`;
    apply.append(title, detail);
    apply.addEventListener('click', () => applyCameraPreset(preset));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preset-delete';
    remove.title = `Delete ${preset.name}`;
    remove.setAttribute('aria-label', `Delete ${preset.name}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8l8 8M16 8l-8 8"/></svg>';
    remove.addEventListener('click', () => {
      cameraPresets = cameraPresets.filter((item) => item.id !== preset.id);
      persistCameraPresets();
      renderCameraPresets();
      showToast(`Deleted “${preset.name}”`);
    });
    row.append(apply, remove);
    list.append(row);
  });
}

function applyLightingPreset(name) {
  const presets = {
    softbox: { exposure: 1, hemi: 1.15, key: 8.5, fill: 4.2, rim: 5.5, keyColor: 0xffffff, fillColor: 0xc8dcff, rimColor: 0x7dc244 },
    bright: { exposure: 1.25, hemi: 1.55, key: 11, fill: 7.5, rim: 6.5, keyColor: 0xffffff, fillColor: 0xffffff, rimColor: 0xffffff },
    dramatic: { exposure: .92, hemi: .48, key: 10.5, fill: 1.15, rim: 10, keyColor: 0xfff2dc, fillColor: 0x7aa3ff, rimColor: 0x7dc244 },
    catalog: { exposure: 1.18, hemi: 1.7, key: 7.5, fill: 6.8, rim: 4, keyColor: 0xffffff, fillColor: 0xf7fbff, rimColor: 0xffffff },
  };
  const p = presets[name];
  renderer.toneMappingExposure = p.exposure;
  hemi.intensity = p.hemi;
  keyLight.intensity = p.key;
  fillLight.intensity = p.fill;
  rimLight.intensity = p.rim;
  keyLight.color.setHex(p.keyColor);
  fillLight.color.setHex(p.fillColor);
  rimLight.color.setHex(p.rimColor);
  setRangePair('exposure', 'exposureValue', p.exposure);
}

function setBackdrop(name) {
  state.background = name;
  const colors = { cloud: 0xd8dcda, white: 0xffffff, charcoal: 0x272b2c };
  scene.background = name === 'transparent' ? null : new THREE.Color(colors[name]);
  const backdrop = $('#canvasBackdrop');
  backdrop.className = 'canvas-backdrop';
  if (name === 'white') backdrop.style.background = '#fff';
  else if (name === 'cloud') backdrop.style.background = 'radial-gradient(circle at 50% 42%, #f6f7f6 0%, #d7dcda 60%, #bdc3c1 100%)';
  else if (name === 'charcoal') backdrop.style.background = 'radial-gradient(circle at 50% 42%, #444b49 0%, #272b2c 62%, #171a1a 100%)';
  else backdrop.style.background = 'radial-gradient(circle at 50% 42%, #596160 0%, #343a39 44%, #222626 100%)';
  $$('.swatch').forEach((button) => button.classList.toggle('active', button.dataset.bg === name));
}

function updateRangeFill(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  input.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
}

function decimalPlaces(step) {
  const text = String(step || '1');
  return text.includes('.') ? text.split('.')[1].length : 0;
}

function writeNumberValue(input, value) {
  input.value = Number(value).toFixed(decimalPlaces(input.step));
}

function clampForInput(input, value) {
  const min = Number.isFinite(Number(input.min)) ? Number(input.min) : -Infinity;
  const max = Number.isFinite(Number(input.max)) ? Number(input.max) : Infinity;
  return THREE.MathUtils.clamp(value, min, max);
}

function setRangePair(rangeId, numberId, rangeValue, numberValue = rangeValue) {
  const range = $(`#${rangeId}`);
  const number = $(`#${numberId}`);
  range.value = String(clampForInput(range, Number(rangeValue)));
  writeNumberValue(number, clampForInput(number, Number(numberValue)));
  updateRangeFill(range);
}

function bindRangePair({ rangeId, numberId, rangeToNumber = (value) => value, numberToRange = (value) => value, onChange }) {
  const range = $(`#${rangeId}`);
  const number = $(`#${numberId}`);
  const applyRange = () => {
    const value = Number(range.value);
    writeNumberValue(number, clampForInput(number, rangeToNumber(value)));
    updateRangeFill(range);
    onChange(value);
  };
  const applyNumber = (commit = false) => {
    if (number.value.trim() === '') return;
    const typed = Number(number.value);
    if (!Number.isFinite(typed)) return;
    const numberValue = clampForInput(number, typed);
    if (commit) writeNumberValue(number, numberValue);
    const rangeValue = clampForInput(range, numberToRange(numberValue));
    range.value = String(rangeValue);
    updateRangeFill(range);
    onChange(rangeValue);
  };
  range.addEventListener('input', applyRange);
  number.addEventListener('input', () => applyNumber(false));
  number.addEventListener('change', () => applyNumber(true));
  number.addEventListener('keydown', (event) => { if (event.key === 'Enter') number.blur(); });
}
$$('input[type="range"]').forEach(updateRangeFill);

$('#loadButton').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', (event) => loadFiles([...event.target.files]));

let dragDepth = 0;
window.addEventListener('dragenter', (event) => {
  if (![...event.dataTransfer.types].includes('Files')) return;
  event.preventDefault(); dragDepth += 1; $('#dropZone').classList.add('visible');
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('dragleave', (event) => {
  event.preventDefault(); dragDepth -= 1; if (dragDepth <= 0) $('#dropZone').classList.remove('visible');
});
window.addEventListener('drop', (event) => {
  event.preventDefault(); dragDepth = 0; $('#dropZone').classList.remove('visible'); loadFiles([...event.dataTransfer.files]);
});

async function loadFiles(files) {
  if (!files.length) return;
  const supported = ['glb','gltf','obj','stl','fbx','usdz'];
  const primary = files.find((file) => supported.includes(extension(file.name)));
  if (!primary) return showToast('Choose a GLB, GLTF, OBJ, STL, FBX or USDZ file');
  showStatus(`Opening ${primary.name}…`);
  const objectUrls = [];
  try {
    const filesByName = new Map();
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      filesByName.set(file.name.toLowerCase(), url);
      filesByName.set(file.webkitRelativePath?.toLowerCase(), url);
    });
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const clean = decodeURIComponent(url.split('?')[0]);
      const basename = clean.split('/').pop().toLowerCase();
      return filesByName.get(clean.toLowerCase()) || filesByName.get(basename) || url;
    });
    const sourceUrl = filesByName.get(primary.name.toLowerCase());
    let loaded;
    switch (extension(primary.name)) {
      case 'glb':
      case 'gltf': {
        const gltf = await new GLTFLoader(manager).loadAsync(sourceUrl);
        loaded = gltf.scene;
        break;
      }
      case 'obj': {
        const loader = new OBJLoader(manager);
        const mtl = files.find((file) => extension(file.name) === 'mtl');
        if (mtl) {
          const materials = await new MTLLoader(manager).loadAsync(filesByName.get(mtl.name.toLowerCase()));
          materials.preload();
          loader.setMaterials(materials);
        }
        loaded = await loader.loadAsync(sourceUrl);
        break;
      }
      case 'stl': {
        const geometry = await new STLLoader(manager).loadAsync(sourceUrl);
        geometry.computeVertexNormals();
        loaded = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: 0xb9bebc, roughness: .3, metalness: .38, clearcoat: .35 }));
        break;
      }
      case 'fbx': loaded = await new FBXLoader(manager).loadAsync(sourceUrl); break;
      case 'usdz': loaded = await new USDZLoader(manager).loadAsync(sourceUrl); break;
    }
    replaceCurrentObject(loaded, primary.name, files.length);
    showToast(`${primary.name} is ready`);
  } catch (error) {
    console.error(error);
    showToast('That model could not be opened. GLB usually works best.');
  } finally {
    hideStatus();
    setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 12000);
    $('#fileInput').value = '';
  }
}

function replaceCurrentObject(object, name, fileCount) {
  disposeObject(currentObject);
  orientationPivot.remove(currentObject);
  currentObject = object;
  currentObject.name = name;
  pivotRoot.position.set(0, 0, 0);
  modelPivot.rotation.set(0, 0, 0);
  orientationPivot.rotation.set(0, 0, 0);
  orientationPivot.add(currentObject);
  prepareObject(currentObject);
  state.objectName = name.replace(/\.[^.]+$/, '');
  $('#fileName').textContent = name;
  $('#fileMeta').textContent = fileCount > 1 ? `${fileCount} files` : extension(name).toUpperCase();
  setRangePair('rotation', 'rotationValue', 0);
  setRangePair('rotateX', 'rotateXValue', 0);
  setRangePair('rotateY', 'rotateYValue', 0);
  resetAngleBaseline(false);
}

function disposeObject(root) {
  root?.traverse((child) => {
    child.geometry?.dispose?.();
    const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose?.();
    });
  });
}

function extension(name) { return name.split('.').pop().toLowerCase(); }

$('#environmentPreset').addEventListener('change', (event) => applyLightingPreset(event.target.value));
bindRangePair({
  rangeId: 'exposure',
  numberId: 'exposureValue',
  onChange: (value) => { renderer.toneMappingExposure = value; },
});
bindRangePair({
  rangeId: 'shadowStrength',
  numberId: 'shadowValue',
  rangeToNumber: (value) => value * 100,
  numberToRange: (value) => value / 100,
  onChange: (value) => { floorMaterial.opacity = value; },
});
bindRangePair({
  rangeId: 'focalLength',
  numberId: 'focalValue',
  onChange: (value) => {
    perspectiveCamera.setFocalLength(value);
    perspectiveCamera.updateProjectionMatrix();
  },
});
bindRangePair({
  rangeId: 'rotation',
  numberId: 'rotationValue',
  onChange: (value) => { modelPivot.rotation.y = THREE.MathUtils.degToRad(value); },
});
bindRangePair({
  rangeId: 'rotateX',
  numberId: 'rotateXValue',
  onChange: (value) => { orientationPivot.rotation.x = THREE.MathUtils.degToRad(value); },
});
bindRangePair({
  rangeId: 'rotateY',
  numberId: 'rotateYValue',
  onChange: (value) => { orientationPivot.rotation.y = THREE.MathUtils.degToRad(value); },
});
bindRangePair({
  rangeId: 'modelScale',
  numberId: 'scaleValue',
  rangeToNumber: (value) => value * 100,
  numberToRange: (value) => value / 100,
  onChange: (scale) => {
    state.modelScale = scale;
    currentObject.scale.setScalar(state.baseScale * scale);
    applyCenterline();
  },
});
bindRangePair({
  rangeId: 'centerlineX',
  numberId: 'centerlineXValue',
  onChange: (value) => setCenterline('x', value),
});
bindRangePair({
  rangeId: 'centerlineY',
  numberId: 'centerlineYValue',
  onChange: (value) => setCenterline('y', value),
});
bindRangePair({
  rangeId: 'centerlineZ',
  numberId: 'centerlineZValue',
  onChange: (value) => setCenterline('z', value),
});
$('#resetCenterline').addEventListener('click', () => resetCenterline(true));
$('#autoRotate').addEventListener('change', (event) => { controls.autoRotate = event.target.checked; controls.autoRotateSpeed = 1.1; });
$('#groundToggle').addEventListener('change', (event) => { floor.visible = event.target.checked; });
$('#gridToggle').addEventListener('change', (event) => { grid.visible = event.target.checked; });
$('#hqShadows').addEventListener('change', (event) => {
  shadowLight.shadow.mapSize.set(event.target.checked ? 2048 : 1024, event.target.checked ? 2048 : 1024);
  shadowLight.shadow.map?.dispose(); shadowLight.shadow.map = null;
});
$$('#cameraType button').forEach((button) => button.addEventListener('click', () => setActiveCamera(button.dataset.camera)));
$$('.swatch').forEach((button) => button.addEventListener('click', () => setBackdrop(button.dataset.bg)));
$$('.angle-grid button').forEach((button) => button.addEventListener('click', () => setViewAngle(button.dataset.angle)));
$('#setAngleBaseline').addEventListener('click', setAngleBaseline);
$('#resetAngleBaseline').addEventListener('click', () => resetAngleBaseline(true));
$('#saveCameraPreset').addEventListener('click', saveCurrentCamera);
$('#presetName').addEventListener('keydown', (event) => { if (event.key === 'Enter') saveCurrentCamera(); });
controls.addEventListener('start', () => $$('.angle-grid button').forEach((button) => button.classList.remove('active')));
$('#frameModel').addEventListener('click', () => {
  fitCameraToObject();
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
});
$('#frontView').addEventListener('click', () => {
  fitCameraToObject('front');
  $$('.angle-grid button').forEach((button) => button.classList.remove('active'));
});
$('#resetScene').addEventListener('click', resetScene);

function resetScene() {
  modelPivot.rotation.set(0, 0, 0);
  orientationPivot.rotation.set(0, 0, 0);
  setRangePair('rotation', 'rotationValue', 0);
  setRangePair('rotateX', 'rotateXValue', 0);
  setRangePair('rotateY', 'rotateYValue', 0);
  controls.autoRotate = false; $('#autoRotate').checked = false;
  floor.visible = false; $('#groundToggle').checked = false;
  currentObject.scale.setScalar(state.baseScale);
  state.modelScale = 1;
  setRangePair('modelScale', 'scaleValue', 1, 100);
  resetCenterline(false);
  $('#environmentPreset').value = 'softbox'; applyLightingPreset('softbox');
  resetAngleBaseline(false);
  fitCameraToObject(); showToast('Scene reset');
}

const sizePresets = {
  web: [2048, 2048],
  print: [4096, 4096],
  social: [2400, 3000],
};
$('#sizePreset').addEventListener('change', (event) => {
  if (sizePresets[event.target.value]) {
    const [width, height] = sizePresets[event.target.value];
    $('#exportWidth').value = width; $('#exportHeight').value = height;
    state.ratio = width / height; updateExportSummary();
  }
});
$('#ratioLock').addEventListener('click', () => {
  state.ratioLocked = !state.ratioLocked;
  $('#ratioLock').classList.toggle('active', state.ratioLocked);
  $('#ratioLock').setAttribute('aria-pressed', String(state.ratioLocked));
  if (state.ratioLocked) state.ratio = clampDimension($('#exportWidth').value) / clampDimension($('#exportHeight').value);
});
$('#exportWidth').addEventListener('input', () => {
  $('#sizePreset').value = 'custom';
  if (state.ratioLocked) $('#exportHeight').value = Math.round(clampDimension($('#exportWidth').value) / state.ratio);
  updateExportSummary();
});
$('#exportHeight').addEventListener('input', () => {
  $('#sizePreset').value = 'custom';
  if (state.ratioLocked) $('#exportWidth').value = Math.round(clampDimension($('#exportHeight').value) * state.ratio);
  updateExportSummary();
});
bindRangePair({
  rangeId: 'padding',
  numberId: 'paddingValue',
  onChange: (value) => { state.padding = value; },
});

function clampDimension(value) { return THREE.MathUtils.clamp(Math.round(Number(value) || 256), 256, 8192); }
function updateExportSummary() {
  const width = clampDimension($('#exportWidth').value);
  const height = clampDimension($('#exportHeight').value);
  $('#megapixels').textContent = `${(width * height / 1e6).toFixed(1)} megapixels`;
  $('#aspectRatio').textContent = `${ratioLabel(width, height)}`;
  $('#exportDimensions').textContent = `${width} × ${height} PNG`;
}
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function ratioLabel(width, height) { const d = gcd(width, height); const x = width / d, y = height / d; return x <= 20 && y <= 20 ? `${x}:${y}` : `${(width / height).toFixed(2)}:1`; }
updateExportSummary();

$('#exportButton').addEventListener('click', exportPng);
$('#exportLarge').addEventListener('click', exportPng);
$('#batchExport').addEventListener('click', exportAllAngles);

async function exportPng() {
  const width = clampDimension($('#exportWidth').value);
  const height = clampDimension($('#exportHeight').value);
  const maxPixels = 8192 * 8192;
  if (width * height > maxPixels) return showToast('Keep the total image size at or below 67 megapixels');
  showStatus(`Rendering ${width} × ${height}…`);
  await nextFrame();
  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalPixelRatio = renderer.getPixelRatio();
  const originalBackground = scene.background;
  const originalAspect = perspectiveCamera.aspect;
  const transparent = $('#transparentExport').checked;
  const previousAutoRotate = controls.autoRotate;
  controls.autoRotate = false;
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    perspectiveCamera.aspect = width / height;
    perspectiveCamera.updateProjectionMatrix();
    updateOrthoAspect(width / height);
    if (transparent) scene.background = null;
    else if (!scene.background) scene.background = new THREE.Color(0xf1f3f2);
    renderer.render(scene, activeCamera);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG encoding failed')), 'image/png'));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const cleanName = state.objectName.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'product';
    anchor.href = url; anchor.download = `${cleanName}-${width}x${height}.png`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast(`Downloaded ${width} × ${height} PNG`);
  } catch (error) {
    console.error(error);
    showToast('The render was too large for this device. Try a smaller size.');
  } finally {
    scene.background = originalBackground;
    renderer.setPixelRatio(originalPixelRatio);
    renderer.setSize(originalSize.x, originalSize.y, false);
    perspectiveCamera.aspect = originalAspect;
    perspectiveCamera.updateProjectionMatrix();
    updateOrthoAspect(originalAspect);
    controls.autoRotate = previousAutoRotate;
    hideStatus();
  }
}

const batchAngles = [
  { key: 'top', label: 'Top', file: 'top' },
  { key: 'bottom', label: 'Bottom', file: 'bottom' },
  { key: 'front', label: 'Front', file: 'front' },
  { key: 'front-elevated', label: 'Front elevated', file: 'front-elevated' },
  { key: 'back', label: 'Back', file: 'back' },
  { key: 'left', label: 'Left', file: 'left' },
  { key: 'right', label: 'Right', file: 'right' },
  { key: 'three-quarter-left', label: '3/4 left', file: 'three-quarter-left' },
  { key: 'three-quarter-right', label: '3/4 right', file: 'three-quarter-right' },
];

function snapshotCamera(camera) {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    up: camera.up.toArray(),
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
    aspect: camera.aspect,
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
  };
}

function restoreCamera(camera, saved) {
  camera.position.fromArray(saved.position);
  camera.quaternion.fromArray(saved.quaternion);
  camera.up.fromArray(saved.up);
  camera.near = saved.near;
  camera.far = saved.far;
  if (saved.zoom !== undefined) camera.zoom = saved.zoom;
  if (saved.aspect !== undefined) camera.aspect = saved.aspect;
  if (saved.left !== undefined) camera.left = saved.left;
  if (saved.right !== undefined) camera.right = saved.right;
  if (saved.top !== undefined) camera.top = saved.top;
  if (saved.bottom !== undefined) camera.bottom = saved.bottom;
  camera.updateProjectionMatrix();
}

async function canvasToPngBlob() {
  return new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG encoding failed')), 'image/png'));
}

async function exportAllAngles() {
  const width = clampDimension($('#exportWidth').value);
  const height = clampDimension($('#exportHeight').value);
  if (width > 4096 || height > 4096) {
    showToast('Batch exports support up to 4096 px per side. Choose a smaller size.');
    return;
  }

  const batchButton = $('#batchExport');
  const singleButtons = [$('#exportLarge'), $('#exportButton')];
  batchButton.disabled = true;
  singleButtons.forEach((button) => { button.disabled = true; });
  showStatus('Preparing 9-angle render…');
  await nextFrame();

  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalPixelRatio = renderer.getPixelRatio();
  const originalBackground = scene.background;
  const perspectiveState = snapshotCamera(perspectiveCamera);
  const orthographicState = snapshotCamera(orthographicCamera);
  const originalTarget = controls.target.toArray();
  const originalAutoRotate = controls.autoRotate;
  const originalAngle = document.querySelector('.angle-grid button.active')?.dataset.angle || null;
  const transparent = $('#transparentExport').checked;
  const cleanName = state.objectName.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'product';
  controls.autoRotate = false;

  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    perspectiveCamera.aspect = width / height;
    perspectiveCamera.updateProjectionMatrix();
    updateOrthoAspect(width / height);
    if (transparent) scene.background = null;
    else if (!scene.background) scene.background = new THREE.Color(0xf1f3f2);

    const zip = new JSZip();
    for (let index = 0; index < batchAngles.length; index += 1) {
      const angle = batchAngles[index];
      showStatus(`Rendering ${index + 1} of 9 · ${angle.label}`);
      setViewAngle(angle.key);
      await nextFrame();
      renderer.render(scene, activeCamera);
      const blob = await canvasToPngBlob();
      zip.file(`${cleanName}-${angle.file}-${width}x${height}.png`, blob);
    }

    showStatus('Packaging nine PNGs…');
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => { $('#renderStatusText').textContent = `Packaging · ${Math.round(metadata.percent)}%`; },
    );
    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${cleanName}-all-angles-${width}x${height}.zip`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    showToast('Downloaded all 9 object angles');
  } catch (error) {
    console.error(error);
    showToast('The batch render could not finish. Try a smaller output size.');
  } finally {
    scene.background = originalBackground;
    renderer.setPixelRatio(originalPixelRatio);
    renderer.setSize(originalSize.x, originalSize.y, false);
    restoreCamera(perspectiveCamera, perspectiveState);
    restoreCamera(orthographicCamera, orthographicState);
    controls.target.fromArray(originalTarget);
    controls.object = activeCamera;
    controls.autoRotate = originalAutoRotate;
    controls.update();
    $$('.angle-grid button').forEach((button) => button.classList.toggle('active', button.dataset.angle === originalAngle));
    batchButton.disabled = false;
    singleButtons.forEach((button) => { button.disabled = false; });
    hideStatus();
  }
}

function nextFrame() { return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); }
function showStatus(message) { $('#renderStatusText').textContent = message; $('#renderStatus').classList.add('show'); }
function hideStatus() { $('#renderStatus').classList.remove('show'); }
let toastTimer;
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

setBackdrop('transparent');
applyLightingPreset('softbox');
resizeRenderer();
fitCameraToObject();
updateAngleBaselineUi();
renderCameraPresets();
