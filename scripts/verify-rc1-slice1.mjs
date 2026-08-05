/**
 * RC1 Slice 1 검증 게이트
 * 가격 재계산·권위 필드 거절·멱등성·토큰 해시·플래그 fail-closed
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const catalog = require("../netlify/functions/_menu-catalog.js");
const rc1 = require("../netlify/functions/_rc1-orders.js");
const createOrder = require("../netlify/functions/create-order.js");

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`PASS  ${name}`);
}

function expectFail(fn, code) {
  let caught;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected failure");
  if (code) assert.equal(caught.code, code);
  return caught;
}

async function expectFailAsync(fn, code) {
  let caught;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected failure");
  if (code) assert.equal(caught.code, code);
  return caught;
}

function validBody(overrides = {}) {
  return {
    items: [{ menuId: "jjajang", quantity: 2, optionIds: ["large"] }],
    utensils: "O",
    address: "세종특별자치시 조치원읍 테스트로 1",
    phone: "01012345678",
    request: "단무지 많이 주세요",
    ...overrides,
  };
}

async function run() {
  // --- 정상 단품·세트 계산 ---
  const single = rc1.priceItems([{ menuId: "jjajang", quantity: 2, optionIds: ["large"] }]);
  assert.equal(single[0].lineTotal, 18000);
  assert.equal(single[0].menuNameSnapshot, "짜장면");
  pass("정상 단품 주문 → 서버 계산");

  const set = rc1.priceItems([
    { setId: "solo", quantity: 1, mains: [{ mainId: "m3", optionIds: ["double"] }] },
  ]);
  assert.equal(set[0].lineTotal, 18000);
  pass("세트·옵션 추가금 → 서버 계산");

  // --- 거절 게이트 ---
  expectFail(() => rc1.priceItems([{ menuId: "nope", quantity: 1 }]), "UNKNOWN_MENU");
  pass("존재하지 않는 메뉴 ID → 거절");

  expectFail(
    () => rc1.priceItems([{ menuId: "jjajang", quantity: 1, optionIds: ["xl"] }]),
    "UNKNOWN_OPTION"
  );
  expectFail(
    () => rc1.priceItems([{ menuId: "jjamjja", quantity: 1, optionIds: ["large"] }]),
    "UNKNOWN_OPTION"
  );
  expectFail(
    () =>
      rc1.priceItems([
        { setId: "solo", quantity: 1, mains: [{ mainId: "m99", optionIds: [] }] },
      ]),
    "UNKNOWN_SET_MAIN"
  );
  expectFail(
    () =>
      rc1.priceItems([
        {
          setId: "couple",
          quantity: 1,
          mains: [{ mainId: "m1", optionIds: [] }],
        },
      ]),
    "INVALID_SET_MAINS"
  );
  pass("존재하지 않는 옵션·잘못된 조합 → 거절");

  expectFail(() => rc1.priceItems([{ menuId: "jjajang", quantity: 0 }]), "INVALID_QUANTITY");
  expectFail(() => rc1.priceItems([{ menuId: "jjajang", quantity: -1 }]), "INVALID_QUANTITY");
  expectFail(() => rc1.priceItems([{ menuId: "jjajang", quantity: 1.5 }]), "INVALID_QUANTITY");
  expectFail(() => rc1.priceItems([{ menuId: "jjajang", quantity: 99 }]), "INVALID_QUANTITY");
  assert.equal(catalog.MAX_LINE_QUANTITY, 20);
  pass("음수·0·소수·과도한 수량 → 거절 (상한 존재)");

  expectFail(
    () => rc1.assertNoClientAuthorityFields({ items: [{ menuId: "jjajang", quantity: 2, price: 1 }] }),
    "CLIENT_AUTHORITY_FORBIDDEN"
  );
  expectFail(
    () => rc1.assertNoClientAuthorityFields({ total: 1, items: [{ menuId: "jjajang", quantity: 2 }] }),
    "CLIENT_AUTHORITY_FORBIDDEN"
  );
  expectFail(
    () =>
      rc1.assertNoClientAuthorityFields({
        items: [{ menuId: "jjajang", quantity: 2, name: "가짜메뉴" }],
      }),
    "CLIENT_AUTHORITY_FORBIDDEN"
  );
  pass("클라이언트 price/total/메뉴명 무시·거절");

  expectFail(
    () => rc1.assertNoClientAuthorityFields({ orderId: "client-chosen", ...validBody() }),
    "CLIENT_AUTHORITY_FORBIDDEN"
  );
  pass("orderId를 클라이언트가 지정할 수 없음");

  expectFail(
    () =>
      rc1.assertNoClientAuthorityFields({
        expiresAt: "2099-01-01T00:00:00.000Z",
        ...validBody(),
      }),
    "CLIENT_AUTHORITY_FORBIDDEN"
  );
  pass("만료시간을 클라이언트가 조작할 수 없음");

  // --- 토큰·원장 ---
  const token = rc1.createCheckoutToken();
  assert.ok(token.length >= 40, "token length");
  assert.notEqual(token, rc1.createCheckoutToken());
  const hashed = rc1.hashToken(token);
  assert.equal(hashed.length, 64);
  assert.notEqual(hashed, token);
  pass("checkoutToken이 충분히 길고 암호학적으로 안전하게 생성됨");

  const store = rc1.createMemoryStore();
  const created = await rc1.createPaymentPendingOrder(null, validBody({ clientRequestId: "idem-1" }), {
    force: true,
    store,
    idempotencyKey: "idem-1",
  });
  assert.equal(created.status, "PAYMENT_PENDING");
  assert.equal(created.amount, 18000);
  assert.ok(created.checkoutToken);
  assert.ok(created.orderId.startsWith("jjn_"));
  assert.notEqual(created.orderId, "client-chosen");

  const saved = await store.get(rc1.rc1PendingKey(created.orderId), { type: "json" });
  assert.ok(saved);
  assert.equal(saved.checkoutTokenHash, rc1.hashToken(created.checkoutToken));
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "checkoutToken"), false);
  assert.ok(saved.items[0].unitPriceSnapshot);
  pass("checkoutToken 원문이 서버에 그대로 저장되지 않음");
  pass("생성된 주문 기본 상태 → PAYMENT_PENDING");

  const replay = await expectFailAsync(
    () =>
      rc1.createPaymentPendingOrder(null, validBody({ clientRequestId: "idem-1" }), {
        force: true,
        store,
        idempotencyKey: "idem-1",
      }),
    "IDEMPOTENT_REPLAY"
  );
  assert.equal(replay.payload.orderId, created.orderId);
  assert.equal(replay.payload.replay, true);
  assert.equal(Object.prototype.hasOwnProperty.call(replay.payload, "checkoutToken"), false);

  let pendingCount = 0;
  for (const key of ["rc1-pending/" + created.orderId]) {
    if (await store.get(key, { type: "json" })) pendingCount += 1;
  }
  assert.equal(pendingCount, 1);
  pass("동일 요청 재전송·응답 유실 재시도 → 중복 주문 방지");

  // --- 만료 ---
  expectFail(
    () =>
      rc1.assertOrderPayable({
        status: "PAYMENT_PENDING",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    "ORDER_EXPIRED"
  );
  pass("만료된 주문 → 승인 불가");

  // --- 플래그 fail-closed ---
  const prev = process.env.RC1_SERVER_ORDER;
  delete process.env.RC1_SERVER_ORDER;
  assert.equal(rc1.isRc1Enabled(), false);

  const disabledRes = await createOrder.handler({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify(validBody()),
  });
  assert.equal(disabledRes.statusCode, 503);
  const disabledBody = JSON.parse(disabledRes.body);
  assert.equal(disabledBody.code, "RC1_DISABLED");
  pass("서버 플래그 OFF · 클라 ON 가정 → create-order 503 (결제창 미개방 fail-closed)");

  process.env.RC1_SERVER_ORDER = "1";
  assert.equal(rc1.isRc1Enabled(), true);
  if (prev === undefined) delete process.env.RC1_SERVER_ORDER;
  else process.env.RC1_SERVER_ORDER = prev;
  assert.equal(rc1.isRc1Enabled(), false);
  pass("RC1 서버 플래그 기본 OFF 유지");

  // --- 로그·오류 응답 비노출 ---
  const replayJson = JSON.stringify(replay.payload);
  assert.equal(replayJson.includes("checkoutToken"), false);
  assert.equal(replayJson.includes("01012345678"), false);
  assert.equal(replayJson.includes("세종"), false);
  pass("주소·전화번호·토큰이 재시도 오류 payload에 노출되지 않음");

  const createOrderSrc = fs.readFileSync(path.join(root, "netlify/functions/create-order.js"), "utf8");
  assert.ok(createOrderSrc.includes('console.log("create-order failed:"'));
  assert.equal(/console\.log\([^)]*phone/i.test(createOrderSrc), false);
  assert.equal(/console\.log\([^)]*address/i.test(createOrderSrc), false);
  assert.equal(/console\.log\([^)]*checkoutToken/i.test(createOrderSrc), false);
  assert.ok(createOrderSrc.includes("sanitizePublicError"));
  pass("서버 로그 경로에 주소·전화번호·토큰 미노출 (소스 검사)");

  if (prev === undefined) delete process.env.RC1_SERVER_ORDER;
  else process.env.RC1_SERVER_ORDER = prev;

  // --- 클라/서버 혼합 금지 (소스 fail-closed) ---
  const paymentConfigSrc = fs.readFileSync(path.join(root, "payment-config.js"), "utf8");
  assert.match(paymentConfigSrc, /rc1ServerOrder:\s*false/);
  assert.match(paymentConfigSrc, /YOUR_TOSS_CLIENT_KEY/);

  const orderHtml = fs.readFileSync(path.join(root, "order.html"), "utf8");
  assert.match(orderHtml, /isRc1ServerOrderEnabled/);
  assert.match(orderHtml, /레거시 경로로 절대 폴백하지 않는다/);
  assert.match(orderHtml, /create-order \/ checkoutToken 경로와 혼합하지 않는다/);
  assert.equal(/createServerPendingOrder[\s\S]{0,400}catch[\s\S]{0,200}savePendingOrder/.test(orderHtml), false);
  pass("서버 ON·클라 OFF / 클라 ON·서버 OFF → 경로 혼합 금지 (fail-closed 코드)");

  // --- 최소금액 ---
  const below = rc1.priceItems([{ menuId: "jjajang", quantity: 1 }]);
  assert.ok(below[0].lineTotal < catalog.MINIMUM_ORDER_AMOUNT);
  await expectFailAsync(
    () =>
      rc1.createPaymentPendingOrder(
        null,
        {
          items: [{ menuId: "jjajang", quantity: 1 }],
          utensils: "O",
          address: "세종특별자치시 조치원읍 테스트로 1",
          phone: "01012345678",
          request: "없음",
          clientRequestId: "below-min",
        },
        { force: true, store: rc1.createMemoryStore(), idempotencyKey: "below-min" }
      ),
    "BELOW_MINIMUM"
  );
  pass("최소 주문금액 미달 → 주문 생성 거절 (결제창 미개방)");

  // --- 공개 응답 계약 ---
  const view = rc1.publicOrderView(
    {
      orderId: "jjn_test",
      status: "PAYMENT_PENDING",
      amount: 18000,
      orderName: "짜장면 곱빼기 2개",
      expiresAt: "2026-08-05T07:30:00.000Z",
      currency: "KRW",
    },
    "token-plain"
  );
  assert.deepEqual(Object.keys(view).sort(), [
    "amount",
    "checkoutToken",
    "currency",
    "expiresAt",
    "orderId",
    "orderName",
    "status",
  ]);
  pass("공개 응답 계약 (orderId·amount·orderName·checkoutToken·expiresAt)");

  const failed = results.filter((r) => !r.ok);
  assert.equal(failed.length, 0);
  console.log(`\nRC1 Slice 1 verify gate: PASS (${results.length} scenarios)`);
}

run().catch((error) => {
  console.error("RC1 Slice 1 verify gate: FAIL", error);
  process.exit(1);
});
