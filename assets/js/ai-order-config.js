(function () {
  "use strict";

  globalThis.JJAJANG_AI_ORDER_CONFIG = Object.freeze({
    minimumOrderAmount: 15000,
    products: [
      { id: "jjajang", name: "짜장면", price: 8000, large: true, aliases: ["짜장면", "짜장"] },
      { id: "jjambbong", name: "짬뽕", price: 9000, large: true, aliases: ["짬뽕"] },
      { id: "jjamjja", name: "짬짜면", price: 9000, large: false, aliases: ["짬짜면", "짬자면"] },
      { id: "kongguksu", name: "콩국수", price: 10000, large: true, aliases: ["콩국수"] },
      { id: "chadol-jjambbong", name: "차돌짬뽕", price: 12000, large: true, aliases: ["차돌짬뽕", "차돌 짬뽕"] },
      { id: "tangmini", name: "미니탕수육", price: 12000, large: false, aliases: ["미니탕수육", "초미니탕수육"] },
      { id: "tangjung", name: "탕수육(중)", price: 17000, large: false, aliases: ["탕수육", "탕수육중", "탕수육 중"] },
      { id: "jjambbongbap", name: "짬뽕밥", price: 10000, large: true, aliases: ["짬뽕밥"] },
      { id: "bokkeumbap", name: "볶음밥", price: 10000, large: true, aliases: ["볶음밥"] },
      { id: "mapabap", name: "마파두부밥", price: 10000, large: false, aliases: ["마파두부밥", "마파두부"] },
      { id: "bibimbap", name: "중화비빔밥", price: 10000, large: true, aliases: ["중화비빔밥", "비빔밥"] },
      { id: "jeyukbap", name: "제육덮밥", price: 11000, large: true, aliases: ["제육덮밥", "제육밥"] },
      { id: "japchaebap", name: "잡채밥", price: 11000, large: false, aliases: ["잡채밥"] }
    ],
    sets: [
      {
        id: "solo",
        name: "혼밥세트",
        price: 16000,
        desc: "초미니탕수육 + 메인 1개 · 짜장/짬뽕 추가금 0원 · 짬짜면/볶음밥/중화비빔밥 +1,000원 · 제육덮밥 +2,000원 · 잡채밥 +3,000원"
      },
      {
        id: "couple",
        name: "달달커플세트",
        price: 22000,
        desc: "초미니탕수육 + 메인 2개 · 변경 추가금은 메뉴 1개당 각각 적용됩니다."
      },
      {
        id: "family",
        name: "패밀리세트",
        price: 31000,
        desc: "미니탕수육 + 메인 3개 · 변경 추가금은 메뉴 1개당 각각 적용됩니다."
      }
    ],
    voice: {
      opening: "최소 주문금액은 만 오천 원입니다. 먼저 단품으로 주문하실지, 세트메뉴로 주문하실지, 또는 세트메뉴에 단품을 추가하실지 말씀해 주세요.",
      chooseMode: "주문 유형을 먼저 말씀해 주세요. 단품, 세트, 세트에 단품 추가 중에서 선택할 수 있습니다.",
      singleReady: "단품 주문으로 안내하겠습니다. 메뉴명과 수량을 말씀해 주세요.",
      setReady: "세트 주문으로 안내하겠습니다. 혼밥세트, 달달커플세트, 패밀리세트 중에서 말씀해 주세요.",
      mixedReady: "세트에 단품 추가 주문으로 안내하겠습니다. 먼저 구성할 세트 이름을 말씀해 주세요."
    }
  });
})();
