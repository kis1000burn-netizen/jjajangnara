import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import heroCharacterConfig from "./hero-character-config.js";

/**
 * @typedef {Object} HeroCharacterConfig
 * @property {boolean} enabled
 * @property {string} modelUrl
 * @property {string} fallbackImageUrl
 * @property {{ fov: number, position: number[], lookAt: number[] }} camera
 * @property {{ scale: number, position: number[], rotation: number[] }} model
 * @property {{ ambientIntensity: number, keyIntensity: number }} lighting
 * @property {{ clipName: string, autoRotate: boolean, rotateSpeed: number }} animation
 * @property {boolean} lazyRender
 */

/** @param {HTMLElement} root */
function setRootState(root, state) {
  root.classList.remove(
    "hero-character--pending",
    "hero-character--loading",
    "hero-character--loaded",
    "hero-character--error",
    "hero-character--static"
  );
  root.classList.add(state);
}

/** @param {HTMLElement} stage @param {string} message */
function setStatus(stage, message) {
  const status = document.getElementById("heroCharacterStatus");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.hidden = !message;
}

/** @param {HTMLElement} stage @param {HeroCharacterConfig} config */
function showFallbackImage(stage, config) {
  if (!config.fallbackImageUrl) {
    return false;
  }

  stage.innerHTML = "";
  const image = document.createElement("img");
  image.src = config.fallbackImageUrl;
  image.alt = "짜장나라 마스코트";
  image.className = "hero-character-fallback-image";
  image.decoding = "async";
  image.loading = "lazy";
  stage.appendChild(image);
  return true;
}

/** @param {HTMLElement} stage @param {HeroCharacterConfig} config */
async function loadCharacter(stage, config) {
  if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (showFallbackImage(stage, config)) {
      return "static";
    }
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.1, 100);
  camera.position.set(...config.camera.position);
  camera.lookAt(...config.camera.lookAt);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  stage.replaceChildren(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, config.lighting.ambientIntensity));
  const keyLight = new THREE.DirectionalLight(0xffffff, config.lighting.keyIntensity);
  keyLight.position.set(2, 4, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffd8a8, 0.45);
  fillLight.position.set(-2, 1, 2);
  scene.add(fillLight);

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(config.modelUrl);
  const model = gltf.scene;

  model.scale.setScalar(config.model.scale);
  model.position.set(...config.model.position);
  model.rotation.set(...config.model.rotation);
  scene.add(model);

  let mixer = null;
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    const clip = config.animation.clipName
      ? gltf.animations.find((item) => item.name === config.animation.clipName) || gltf.animations[0]
      : gltf.animations[0];
    mixer.clipAction(clip).play();
  }

  let width = 0;
  let height = 0;

  const resize = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  let animationFrame = 0;
  let isVisible = true;
  const clock = new THREE.Clock();
  let yaw = 0;

  const renderFrame = () => {
    animationFrame = 0;
    if (!isVisible) {
      return;
    }

    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    }

    if (config.animation.autoRotate) {
      yaw += delta * config.animation.rotateSpeed;
      model.rotation.y = config.model.rotation[1] + yaw;
    }

    renderer.render(scene, camera);
  };

  const requestRender = () => {
    if (animationFrame) {
      return;
    }

    animationFrame = globalThis.requestAnimationFrame(renderFrame);
  };

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) {
        requestRender();
      }
    },
    { threshold: 0.12 }
  );
  visibilityObserver.observe(stage);

  const animate = () => {
    globalThis.requestAnimationFrame(animate);
    if (isVisible) {
      requestRender();
    }
  };
  animate();

  globalThis.addEventListener("pagehide", () => {
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    renderer.dispose();
  }, { once: true });

  return "loaded";
}

async function initHeroCharacter() {
  const root = document.getElementById("heroCharacter");
  const stage = document.getElementById("heroCharacterStage");
  if (!root || !stage) {
    return;
  }

  if (!heroCharacterConfig.enabled) {
    root.hidden = true;
    root.closest(".hero-layout")?.classList.add("hero-layout--single");
    return;
  }

  root.hidden = false;

  root.hidden = false;
  root.closest(".hero-layout")?.classList.remove("hero-layout--single");

  setRootState(root, "hero-character--loading");
  setStatus(stage, "캐릭터를 불러오는 중입니다.");

  try {
    const result = await loadCharacter(stage, heroCharacterConfig);
    setRootState(root, result === "static" ? "hero-character--static" : "hero-character--loaded");
    setStatus(stage, "");
  } catch (error) {
    console.log("3D 캐릭터를 불러오지 못했습니다:", error);
    setRootState(root, "hero-character--error");

    if (showFallbackImage(stage, heroCharacterConfig)) {
      setRootState(root, "hero-character--static");
      setStatus(stage, "");
      return;
    }

    setStatus(stage, "캐릭터 파일을 확인해 주세요.");
  }
}

globalThis.addEventListener("DOMContentLoaded", initHeroCharacter);
