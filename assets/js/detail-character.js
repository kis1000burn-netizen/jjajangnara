/**
 * 상세·연관 페이지 미니 3D 캐릭터
 * - 기본: hyerie_phone → hyerie_15
 * - 매장둘러보기/바로주문: dance1/2/3 중 선택(홈에서 사전 워밍)
 * - 클릭 시 1초 전체화면 확대 후 복귀
 */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const ROOT_ID = "jjajang-detail-character";
const EXPAND_MS = 1000;

const DEFAULT_INTRO = "assets/character/hyerie_phone.fbx";
const DEFAULT_MAIN = "assets/character/hyerie_15.fbx";
const DANCE_URLS = [
  "assets/character/hyerie_dance1.fbx",
  "assets/character/hyerie_dance2.fbx",
  "assets/character/hyerie_dance3.fbx"
];

let activeController = null;
let hubObserver = null;

function isIndexPage() {
  try {
    const path = globalThis.location.pathname || "";
    return (
      /(?:^|\/)index\.html?$/i.test(path) ||
      path === "/" ||
      path === "" ||
      /\/$/.test(path) && !/\.html?$/i.test(path)
    );
  } catch (_) {
    return false;
  }
}

/** PC·모바일 공통: 진입 글자애니 없이 히어로+메뉴 허브로 복귀 */
function goHomeEntry() {
  try {
    sessionStorage.removeItem("jjajangnara-hub-dismissed");
    sessionStorage.removeItem("jjajangnara-store-video-enabled");
    sessionStorage.setItem("jjajangnara-intro-seen", "1");
    if (globalThis.JjajangDetail3D?.clearDanceMode) {
      globalThis.JjajangDetail3D.clearDanceMode();
    } else {
      sessionStorage.removeItem("jjajangnara-mini-rig");
      sessionStorage.removeItem("jjajangnara-mini-dance");
    }
  } catch (_) {}

  if (isIndexPage() && globalThis.EntryHub?.reopenHomeEntry) {
    try {
      globalThis.history.replaceState({}, "", globalThis.location.pathname || "/");
    } catch (_) {}
    globalThis.EntryHub.reopenHomeEntry();
    return;
  }

  location.href = "index.html?hub=1";
}

function resolveRigPlan() {
  if (globalThis.JjajangDetail3D?.getRigPlan) {
    return globalThis.JjajangDetail3D.getRigPlan();
  }
  try {
    if (sessionStorage.getItem("jjajangnara-mini-rig") === "dance") {
      const danceUrl =
        sessionStorage.getItem("jjajangnara-mini-dance") ||
        DANCE_URLS[Math.floor(Math.random() * DANCE_URLS.length)];
      return { mode: "dance", introUrl: null, mainUrl: danceUrl, randomStart: true };
    }
  } catch (_) {}
  return { mode: "default", introUrl: DEFAULT_INTRO, mainUrl: DEFAULT_MAIN, randomStart: false };
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) {
    root.querySelectorAll("img").forEach((img) => img.remove());
    return root;
  }

  root = document.createElement("aside");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "짜장나라 안내 캐릭터");
  root.setAttribute("aria-expanded", "false");
  root.setAttribute("role", "button");
  root.setAttribute("tabindex", "0");
  root.setAttribute("title", "캐릭터 자세히 보기");
  root.innerHTML =
    '<div class="detail-character__bubble" aria-hidden="true">메뉴·주문이 필요하면 눌러주세요</div>' +
    '<div class="detail-character__col">' +
    '<div class="detail-character__stage"></div>' +
    '<a class="detail-character__home" href="index.html?hub=1">홈복귀</a>' +
    "</div>";
  document.body.appendChild(root);
  return root;
}

function ensureStage(root) {
  if (!root.querySelector(".detail-character__bubble")) {
    const bubble = document.createElement("div");
    bubble.className = "detail-character__bubble";
    bubble.setAttribute("aria-hidden", "true");
    bubble.textContent = "메뉴·주문이 필요하면 눌러주세요";
    root.insertBefore(bubble, root.firstChild);
  }

  let col = root.querySelector(".detail-character__col");
  if (!col) {
    col = document.createElement("div");
    col.className = "detail-character__col";
    const existingStage = root.querySelector(".detail-character__stage");
    const existingHome = root.querySelector(".detail-character__home");
    if (existingStage) col.appendChild(existingStage);
    if (existingHome) col.appendChild(existingHome);
    root.appendChild(col);
  }

  let stage = col.querySelector(".detail-character__stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "detail-character__stage";
    col.insertBefore(stage, col.firstChild);
  }

  stage.querySelectorAll("img").forEach((img) => img.remove());

  if (!root.querySelector(".detail-character__home")) {
    const home = document.createElement("a");
    home.className = "detail-character__home";
    home.href = "index.html?hub=1";
    home.textContent = "홈복귀";
    col.appendChild(home);
  }

  return stage;
}

function bindInteractions(root) {
  const homeBtn = root.querySelector(".detail-character__home");
  if (homeBtn && !homeBtn.dataset.bound) {
    homeBtn.dataset.bound = "1";
    let homeLockUntil = 0;
    const onHome = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now < homeLockUntil) return;
      homeLockUntil = now + 700;
      goHomeEntry();
    };
    // click은 PC·모바일(탭) 공통. 터치 지연 대비 pointerup도 동일 핸들러(중복 방지 락)
    homeBtn.addEventListener("click", onHome);
    homeBtn.addEventListener("pointerup", onHome);
  }

  if (root.dataset.boundExpand === "1") return;
  root.dataset.boundExpand = "1";

  let restoreTimer = 0;
  const collapse = () => {
    clearTimeout(restoreTimer);
    root.classList.remove("is-expanded");
    root.setAttribute("aria-expanded", "false");
  };
  const expand = () => {
    if (root.classList.contains("is-expanded")) return;
    root.classList.add("is-expanded");
    root.setAttribute("aria-expanded", "true");
    restoreTimer = setTimeout(collapse, EXPAND_MS);
  };

  root.addEventListener("click", (event) => {
    if (event.target.closest(".detail-character__home")) return;
    event.preventDefault();
    expand();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      expand();
    } else if (event.key === "Escape") {
      collapse();
    }
  });
}

function softenMaterials(modelRoot) {
  modelRoot.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      if ("roughness" in material) material.roughness = Math.max(material.roughness || 0, 0.8);
      if ("metalness" in material) material.metalness = Math.min(material.metalness || 0, 0.03);
      if ("envMapIntensity" in material) material.envMapIntensity = 0.15;
      if ("shininess" in material) material.shininess = Math.min(material.shininess || 0, 7);
      if (material.specular?.setRGB) material.specular.setRGB(0.07, 0.07, 0.07);
      material.needsUpdate = true;
    });
  });
}

function fitModel(model) {
  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  model.position.sub(initialCenter);
  model.scale.setScalar(1.22 / Math.max(initialSize.y, 0.001));
  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  model.position.x -= fittedCenter.x;
  model.position.z -= fittedCenter.z;
  model.position.y -= fittedBox.min.y;
  model.rotation.set(0, 0, 0);
}

async function loadFbx(url) {
  const model = await new FBXLoader().loadAsync(url);
  softenMaterials(model);
  fitModel(model);
  return model;
}

function disposeController() {
  if (!activeController) return;
  activeController.dispose();
  activeController = null;
}

async function mount3D(stage, plan) {
  disposeController();
  stage.replaceChildren();

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.56));
  const key = new THREE.DirectionalLight(0xfff5e6, 0.58);
  key.position.set(2, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd8a8, 0.18);
  fill.position.set(-2, 1, 2);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.05, 3.5);
  camera.lookAt(0, 0.78, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  stage.appendChild(renderer.domElement);

  let mixer = null;
  let introFinished = plan.mode === "dance" || !plan.introUrl;
  let introElapsed = 0;
  let introMaxSeconds = 2.4;
  let introModel = null;
  let mainModel = null;

  if (plan.mode === "dance" || !plan.introUrl) {
    mainModel = await loadFbx(plan.mainUrl);
    scene.add(mainModel);
    if (mainModel.animations.length > 0) {
      mixer = new THREE.AnimationMixer(mainModel);
      const clip = mainModel.animations[0];
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      if (plan.randomStart && clip.duration > 0) {
        action.time = Math.random() * clip.duration;
      }
      action.play();
    }
  } else {
    const loaded = await Promise.all([loadFbx(plan.introUrl), loadFbx(plan.mainUrl)]);
    introModel = loaded[0];
    mainModel = loaded[1];
    scene.add(introModel);

    const playMain = () => {
      if (introFinished) return;
      introFinished = true;
      if (mixer) mixer.stopAllAction();
      scene.remove(introModel);
      scene.add(mainModel);
      mixer = null;
      if (mainModel.animations.length > 0) {
        mixer = new THREE.AnimationMixer(mainModel);
        mixer.clipAction(mainModel.animations[0]).setLoop(THREE.LoopRepeat, Infinity).play();
      }
    };

    if (introModel.animations.length > 0) {
      mixer = new THREE.AnimationMixer(introModel);
      const clip = introModel.animations[0];
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      mixer.addEventListener("finished", playMain);
      action.play();
      introMaxSeconds = Math.max(clip.duration + 0.25, introMaxSeconds);
    } else {
      playMain();
    }
  }

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const clock = new THREE.Clock();
  let frame = 0;
  let running = !document.hidden;
  let disposed = false;

  const render = () => {
    if (!running || disposed) return;
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (!introFinished && plan.mode !== "dance") {
      introElapsed += delta;
      if (introElapsed >= introMaxSeconds) {
        if (introModel && mainModel && scene.children.includes(introModel)) {
          if (mixer) mixer.stopAllAction();
          scene.remove(introModel);
          scene.add(mainModel);
          mixer = null;
          if (mainModel.animations.length > 0) {
            mixer = new THREE.AnimationMixer(mainModel);
            mixer.clipAction(mainModel.animations[0]).setLoop(THREE.LoopRepeat, Infinity).play();
          }
        }
        introFinished = true;
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };

  const onVisibility = () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frame);
    } else if (!running && !disposed) {
      running = true;
      clock.start();
      frame = requestAnimationFrame(render);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  renderer.render(scene, camera);
  if (running) frame = requestAnimationFrame(render);

  activeController = {
    planMode: plan.mode,
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      resizeObserver.disconnect();
      renderer.dispose();
      stage.replaceChildren();
    }
  };
}

function syncHubVisibility(root) {
  const hide =
    document.body.classList.contains("is-entry-hub-open") ||
    document.documentElement.classList.contains("entry-pending") ||
    document.body.classList.contains("is-intro-playing");
  root.hidden = hide;
  root.setAttribute("aria-hidden", hide ? "true" : "false");
}

async function remount() {
  const root = ensureRoot();
  const stage = ensureStage(root);
  const plan = resolveRigPlan();
  try {
    await mount3D(stage, plan);
  } catch (error) {
    console.warn("미니 3D 캐릭터 리마운트 실패:", error);
  }
}

function boot() {
  const root = ensureRoot();
  const stage = ensureStage(root);
  bindInteractions(root);
  syncHubVisibility(root);

  if (!hubObserver) {
    hubObserver = new MutationObserver(() => syncHubVisibility(root));
    hubObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    hubObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  remount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

globalThis.JjajangDetailCharacter = {
  goHomeEntry,
  remount,
  resolveRigPlan
};
