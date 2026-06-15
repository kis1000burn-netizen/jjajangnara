const heroCharacterConfig = {
  /** false: 화면에 표시하지 않음. GLB 준비 후 true 로 변경 */
  enabled: false,

  /** GLB 또는 GLTF 경로 (assets/character/ 폴더에 업로드) */
  modelUrl: "assets/character/mascot.glb",

  /** 3D 로딩 전·실패 시 보여줄 2D 이미지(선택). 예: "assets/character/mascot-preview.png" */
  fallbackImageUrl: "",

  camera: {
    fov: 35,
    position: [0, 1.2, 2.8],
    lookAt: [0, 0.9, 0],
  },

  model: {
    scale: 1,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },

  lighting: {
    ambientIntensity: 0.85,
    keyIntensity: 1.1,
  },

  animation: {
    /** GLB 애니메이션 클립 이름. 빈 문자열이면 첫 번째 클립 사용 */
    clipName: "",
    autoRotate: true,
    rotateSpeed: 0.35,
  },

  /** 화면에 보일 때만 렌더링 (성능) */
  lazyRender: true,
};

export default heroCharacterConfig;
