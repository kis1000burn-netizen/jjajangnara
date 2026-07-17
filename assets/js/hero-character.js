import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import heroCharacterConfig from "./hero-character-config.js?v=20260717af";

const mountedStages = new WeakSet();
const stageControllers = new WeakMap();
const desiredStageActivity = new WeakMap();

let preloadPromise = null;
let preloadedAssets = null;

function showFallbackImage(stage, config) {
  if (!config.fallbackImageUrl) return false;
  stage.innerHTML = "";
  const image = document.createElement("img");
  image.src = config.fallbackImageUrl;
  image.alt = "짜장나라 마스코트";
  image.className = "hero-character-fallback-image";
  image.decoding = "async";
  stage.appendChild(image);
  return true;
}

async function loadModel(url) {
  if (/\.fbx(?:$|\?)/i.test(url || "")) {
    const object = await new FBXLoader().loadAsync(url);
    return { template: object, animations: object.animations || [] };
  }

  const gltf = await new GLTFLoader().loadAsync(url);
  return { template: gltf.scene, animations: gltf.animations || [] };
}

function softenMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      if ("roughness" in material) material.roughness = Math.max(material.roughness || 0, 0.78);
      if ("metalness" in material) material.metalness = Math.min(material.metalness || 0, 0.04);
      if ("envMapIntensity" in material) material.envMapIntensity = 0.18;
      if ("shininess" in material) material.shininess = Math.min(material.shininess || 0, 8);
      if (material.specular?.setRGB) material.specular.setRGB(0.08, 0.08, 0.08);
      material.needsUpdate = true;
    });
  });
}

function preload(config = heroCharacterConfig) {
  if (!config.enabled) return Promise.resolve(null);
  if (preloadPromise) return preloadPromise;

  const startedAt = performance.now();
  preloadPromise = Promise.all([
    loadModel(config.introModelUrl),
    loadModel(config.modelUrl),
  ])
    .then(([intro, main]) => {
      softenMaterials(intro.template);
      softenMaterials(main.template);
      preloadedAssets = { intro, main };
      console.log(
        "[HeroCharacter] bow + main preload ready in",
        Math.round(performance.now() - startedAt),
        "ms"
      );
      return preloadedAssets;
    })
    .catch((error) => {
      preloadPromise = null;
      preloadedAssets = null;
      console.log("[HeroCharacter] preload failed:", error);
      throw error;
    });

  return preloadPromise;
}

function cloneAsset(asset) {
  let model;
  try {
    model = cloneSkinned(asset.template);
  } catch (_) {
    model = asset.template.clone(true);
  }
  return { model, animations: asset.animations };
}

function fitModelToStage(model, config) {
  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  model.position.sub(initialCenter);

  const targetHeight = config.model.fitHeight || 1.85;
  const scale =
    config.model.scale > 0
      ? config.model.scale
      : targetHeight / Math.max(initialSize.y, 0.001);
  model.scale.setScalar(scale);

  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  const fittedSize = fittedBox.getSize(new THREE.Vector3());
  model.position.x -= fittedCenter.x;
  model.position.z -= fittedCenter.z;
  model.position.y -= fittedBox.min.y;
  model.position.add(new THREE.Vector3(...config.model.position));
  model.rotation.set(...config.model.rotation);
  return { lookY: fittedSize.y * 0.55 };
}

async function loadCharacter(stage, config) {
  const assets = preloadedAssets || (await preload(config));
  if (!assets) throw new Error("캐릭터 preload 결과가 없습니다.");

  let reduceMotion = false;
  try {
    reduceMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {}

  const intro = cloneAsset(assets.intro);
  const main = cloneAsset(assets.main);
  const introFit = fitModelToStage(intro.model, config);
  const mainFit = fitModelToStage(main.model, config);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.1, 200);
  const lookY = Math.max(introFit.lookY, mainFit.lookY);
  camera.position.set(
    config.camera.position[0],
    Math.max(config.camera.position[1], lookY + 0.15),
    config.camera.position[2]
  );
  const lookTarget = config.camera.lookAt || [0, lookY, 0];
  camera.lookAt(lookTarget[0], lookTarget[1] ?? lookY, lookTarget[2] ?? 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  stage.replaceChildren(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    width: "100%",
    height: "100%",
    display: "block",
  });

  const lighting = config.lighting;
  scene.add(new THREE.AmbientLight(0xffffff, lighting.ambientIntensity));
  const keyLight = new THREE.DirectionalLight(0xfff5e6, lighting.keyIntensity);
  keyLight.position.set(2.2, 4.2, 3.2);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffd8a8, lighting.fillIntensity);
  fillLight.position.set(-2.4, 1.2, 2.2);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xd9a441, lighting.rimIntensity);
  rimLight.position.set(0, 2, -3);
  scene.add(rimLight);

  let currentModel = intro.model;
  let mixer = null;
  let introFinished = false;
  let introElapsed = 0;
  let introMaxSeconds = config.animation.introFallbackMs / 1000;
  scene.add(currentModel);

  const playMain = () => {
    if (introFinished) return;
    introFinished = true;
    if (mixer) mixer.stopAllAction();
    scene.remove(intro.model);
    currentModel = main.model;
    scene.add(currentModel);
    mixer = null;

    if (main.animations.length > 0 && !reduceMotion) {
      mixer = new THREE.AnimationMixer(currentModel);
      const clip =
        main.animations.find((item) => item.name === config.animation.clipName) ||
        main.animations[0];
      mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
    }
  };

  if (intro.animations.length > 0 && !reduceMotion) {
    mixer = new THREE.AnimationMixer(currentModel);
    const clip =
      intro.animations.find((item) => item.name === config.animation.introClipName) ||
      intro.animations[0];
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    mixer.addEventListener("finished", playMain);
    action.play();
    introMaxSeconds = Math.max(clip.duration + 0.25, introMaxSeconds);
  } else {
    // 모션 감소 설정 또는 애니메이션 없는 FBX는 기본 캐릭터로 즉시 전환
    playMain();
  }

  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  let frame = 0;
  let isVisible = true;
  let isActive = desiredStageActivity.get(stage) !== false;
  let isRunning = false;
  let disposed = false;
  const clock = new THREE.Clock();
  let yaw = config.model.rotation[1] || 0;

  const renderFrame = () => {
    if (!isRunning || disposed) return;
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (!introFinished) {
      introElapsed += delta;
      if (introElapsed >= introMaxSeconds) playMain();
    }
    if (config.animation.autoRotate && !reduceMotion && introFinished) {
      yaw += delta * config.animation.rotateSpeed;
      currentModel.rotation.y = yaw;
    }
    renderer.render(scene, camera);
    frame = globalThis.requestAnimationFrame(renderFrame);
  };

  const start = () => {
    if (isRunning || disposed || !isVisible || !isActive) return;
    isRunning = true;
    clock.start();
    frame = globalThis.requestAnimationFrame(renderFrame);
  };

  const stop = () => {
    if (!isRunning) return;
    isRunning = false;
    globalThis.cancelAnimationFrame(frame);
    frame = 0;
    clock.stop();
  };

  const sync = () => {
    if (isVisible && isActive) start();
    else stop();
  };

  stageControllers.set(stage, {
    setActive(active) {
      isActive = Boolean(active);
      sync();
    },
  });

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { threshold: 0.08 }
  );
  visibilityObserver.observe(stage);

  renderer.render(scene, camera);
  sync();

  globalThis.addEventListener(
    "pagehide",
    () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
      stageControllers.delete(stage);
    },
    { once: true }
  );
}

async function mountIntoStage(stage) {
  if (!stage) return;
  if (mountedStages.has(stage)) {
    setStageActive(stage, true);
    return;
  }
  if (!heroCharacterConfig.enabled) {
    showFallbackImage(stage, heroCharacterConfig);
    return;
  }

  mountedStages.add(stage);
  stage.style.position = stage.style.position || "relative";
  let loading = null;

  if (!preloadedAssets) {
    loading = document.createElement("div");
    loading.className = "eh-character-loading";
    loading.textContent = "캐릭터 불러오는 중…";
    loading.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "color:#f3d28a;font-size:.82rem;background:rgba(0,0,0,.25);z-index:2;";
    stage.appendChild(loading);
  }

  try {
    await preload(heroCharacterConfig);
    loading?.remove();
    await loadCharacter(stage, heroCharacterConfig);
  } catch (error) {
    console.log("3D 캐릭터 마운트 실패:", error);
    mountedStages.delete(stage);
    loading?.remove();
    if (!showFallbackImage(stage, heroCharacterConfig)) {
      stage.innerHTML =
        '<div style="color:#ff9f9f;font-size:.8rem;padding:1rem;text-align:center;">캐릭터를 불러오지 못했습니다</div>';
    }
  }
}

function setStageActive(stageOrId, active) {
  const stage =
    typeof stageOrId === "string" ? document.getElementById(stageOrId) : stageOrId;
  if (!stage) return;
  desiredStageActivity.set(stage, Boolean(active));
  stageControllers.get(stage)?.setActive(active);
}

globalThis.HeroCharacter = {
  preload: () => preload(heroCharacterConfig),
  mountInto: (stageOrId) => {
    const stage =
      typeof stageOrId === "string" ? document.getElementById(stageOrId) : stageOrId;
    return mountIntoStage(stage);
  },
  setActive: setStageActive,
  isReady: () => Boolean(preloadedAssets),
  config: heroCharacterConfig,
};

if (heroCharacterConfig.enabled) {
  preload(heroCharacterConfig).catch(() => {});
}

function initDom() {
  const root = document.getElementById("heroCharacter");
  if (root) {
    root.hidden = true;
    root.closest(".hero-layout")?.classList.add("hero-layout--single");
  }

  const observer = new MutationObserver(() => {
    const stage = document.getElementById("entryCharacterStage");
    if (stage) {
      observer.disconnect();
      mountIntoStage(stage);
    }
  });
  const stage = document.getElementById("entryCharacterStage");
  if (stage) mountIntoStage(stage);
  else {
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis.setTimeout(() => observer.disconnect(), 20000);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDom);
} else {
  initDom();
}
