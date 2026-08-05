window.JJAJANGNARA_PAYMENT_CONFIG = {
  tossClientKey: "YOUR_TOSS_CLIENT_KEY",
  siteUrl: "https://짜장나라.com",
  successPath: "/payment-success.html",
  failPath: "/payment-fail.html",
  /**
   * RC1 Slice 1 — 서버 권위 주문 생성 경로
   * 기본 OFF. 켜려면 true 로 두고 Netlify env RC1_SERVER_ORDER=1 도 함께 설정한다.
   * 혼합 배포 금지: 클라만 ON / 서버만 ON 상태로 실결제하지 말 것.
   */
  rc1ServerOrder: false,
};