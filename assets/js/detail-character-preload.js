/**
 * 미니 3D 사전 준비
 * - 기본: phone + hyerie_15
 * - 댄스: dance1/2/3 (홈 허브에서 비활성 워밍 → 매장둘러보기/바로주문 시 활성화)
 */
(function () {
  "use strict";

  var INTRO_MODEL_URL = "assets/character/hyerie_phone.fbx";
  var MAIN_MODEL_URL = "assets/character/hyerie_15.fbx";
  var DANCE_URLS = [
    "assets/character/hyerie_dance1.fbx",
    "assets/character/hyerie_dance2.fbx",
    "assets/character/hyerie_dance3.fbx"
  ];
  var RIG_KEY = "jjajangnara-mini-rig";
  var DANCE_KEY = "jjajangnara-mini-dance";
  var warmPromise = null;
  var danceWarmPromise = null;

  function addPrefetch(href) {
    if (!href || document.querySelector('link[data-jjajang-prefetch="' + href + '"]')) return;
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    link.setAttribute("data-jjajang-prefetch", href);
    document.head.appendChild(link);
  }

  function warmDance() {
    if (danceWarmPromise) return danceWarmPromise;
    DANCE_URLS.forEach(addPrefetch);
    danceWarmPromise = Promise.all(
      DANCE_URLS.map(function (url) {
        return fetch(url, { cache: "force-cache", credentials: "same-origin" }).then(function (res) {
          return res.ok ? res.arrayBuffer() : null;
        });
      })
    )
      .then(function () {
        return true;
      })
      .catch(function () {
        danceWarmPromise = null;
        return false;
      });
    return danceWarmPromise;
  }

  function warm() {
    if (warmPromise) {
      warmDance();
      return warmPromise;
    }

    addPrefetch(INTRO_MODEL_URL);
    addPrefetch(MAIN_MODEL_URL);

    warmPromise = Promise.all([
      fetch(INTRO_MODEL_URL, { cache: "force-cache", credentials: "same-origin" }).then(function (res) {
        return res.ok ? res.arrayBuffer() : null;
      }),
      fetch(MAIN_MODEL_URL, { cache: "force-cache", credentials: "same-origin" }).then(function (res) {
        return res.ok ? res.arrayBuffer() : null;
      }),
      import("three"),
      import("three/addons/loaders/FBXLoader.js")
    ])
      .then(function () {
        try {
          globalThis.sessionStorage.setItem("jjajangnara-detail-3d-warm", "1");
        } catch (_) {}
        // 기본 워밍 직후 댄스도 백그라운드 적재 (비활성 준비)
        warmDance();
        return true;
      })
      .catch(function () {
        warmPromise = null;
        return false;
      });

    return warmPromise;
  }

  function pickDanceUrl() {
    return DANCE_URLS[Math.floor(Math.random() * DANCE_URLS.length)];
  }

  function activateDanceMode() {
    var url = pickDanceUrl();
    try {
      globalThis.sessionStorage.setItem(RIG_KEY, "dance");
      globalThis.sessionStorage.setItem(DANCE_KEY, url);
    } catch (_) {}
    warmDance();
    return url;
  }

  function clearDanceMode() {
    try {
      globalThis.sessionStorage.removeItem(RIG_KEY);
      globalThis.sessionStorage.removeItem(DANCE_KEY);
    } catch (_) {}
  }

  function getRigPlan() {
    try {
      if (globalThis.sessionStorage.getItem(RIG_KEY) === "dance") {
        var danceUrl = globalThis.sessionStorage.getItem(DANCE_KEY) || pickDanceUrl();
        return {
          mode: "dance",
          introUrl: null,
          mainUrl: danceUrl,
          randomStart: true
        };
      }
    } catch (_) {}
    return {
      mode: "default",
      introUrl: INTRO_MODEL_URL,
      mainUrl: MAIN_MODEL_URL,
      randomStart: false
    };
  }

  globalThis.JjajangDetail3D = {
    warm: warm,
    warmDance: warmDance,
    activateDanceMode: activateDanceMode,
    clearDanceMode: clearDanceMode,
    getRigPlan: getRigPlan,
    INTRO_MODEL_URL: INTRO_MODEL_URL,
    MAIN_MODEL_URL: MAIN_MODEL_URL,
    DANCE_URLS: DANCE_URLS
  };
})();
