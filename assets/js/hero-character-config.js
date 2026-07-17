const heroCharacterConfig = {
  /** 진입 허브·히어로에서 3D 표시 */
  enabled: true,

  /** 인사(heart) 1회 후 기본(hyerie_15) 루프 */
  introModelUrl: "assets/character/hyerie_heart.fbx",
  modelUrl: "assets/character/hyerie_15.fbx",

  /** 3D 로딩 전·실패 시 2D 이미지 */
  fallbackImageUrl: "assets/character/hyerie.png",

  /* Wither형 풀스크린 — 영역 안 전신 프레임 */
  camera: {
    fov: 34,
    position: [0, 1.05, 5.0],
    lookAt: [0, 0.82, 0],
  },

  model: {
    /** 0이면 바운딩박스 기준 자동 맞춤 */
    scale: 0,
    position: [0, 0, 0],
    rotation: [0, 0.08, 0],
    /** 자동 맞춤 시 목표 높이 (스테이지 밖으로 나가지 않도록 보수적) */
    fitHeight: 1.42,
  },

  lighting: {
    ambientIntensity: 0.58,
    keyIntensity: 0.62,
    fillIntensity: 0.2,
    rimIntensity: 0.08,
  },

  animation: {
    clipName: "",
    introClipName: "",
    introFallbackMs: 2400,
    autoRotate: false,
    rotateSpeed: 0,
  },

  lazyRender: true,
};

export default heroCharacterConfig;
