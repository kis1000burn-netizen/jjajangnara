const crypto = require("crypto");
const {
  getRuntimeStatus,
  listOrders,
  updateOrder,
  updateRuntimeStatus,
} = require("./_orders");

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: responseHeaders,
    body: JSON.stringify(data),
  };
}

function isAuthorized(event) {
  const expected = process.env.POS_API_TOKEN || "";
  const authorization = event.headers.authorization || event.headers.Authorization || "";
  const supplied = authorization.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: responseHeaders, body: "" };
  }
  if (!isAuthorized(event)) {
    return json(401, { message: "POS 인증 토큰을 확인해 주세요." });
  }

  try {
    if (event.httpMethod === "GET") {
      const [orders, runtime] = await Promise.all([
        listOrders(event),
        getRuntimeStatus(event),
      ]);
      return json(200, { orders, runtime, serverTime: new Date().toISOString() });
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      if (body.action === "heartbeat") {
        const runtime = await updateRuntimeStatus(event, {
          heartbeatAt: new Date().toISOString(),
          stationName: body.stationName || "counter-pos",
        });
        return json(200, { runtime });
      }
      if (body.action === "business-status") {
        const patch = {};
        if (typeof body.holiday === "boolean") patch.holiday = body.holiday;
        if (typeof body.holidayMessage === "string") patch.holidayMessage = body.holidayMessage;
        if (Object.prototype.hasOwnProperty.call(body, "holidayUntil")) {
          patch.holidayUntil = body.holidayUntil || null;
        }
        if (typeof body.forceClosed === "boolean") patch.forceClosed = body.forceClosed;
        if (typeof body.forceOpen === "boolean") patch.forceOpen = body.forceOpen;
        if (Number.isFinite(Number(body.openMinutes))) patch.openMinutes = Number(body.openMinutes);
        if (Number.isFinite(Number(body.closeMinutes))) patch.closeMinutes = Number(body.closeMinutes);
        const runtime = await updateRuntimeStatus(event, patch);
        return json(200, { runtime });
      }
      if (!body.orderId) return json(400, { message: "orderId가 필요합니다." });
      const order = await updateOrder(event, body.orderId, {
        status: body.status,
        printRequestedAt: body.printRequestedAt,
        printedAt: body.printedAt,
      });
      if (!order) return json(404, { message: "주문을 찾지 못했습니다." });
      return json(200, { order });
    }

    return json(405, { message: "Method Not Allowed" });
  } catch (error) {
    return json(500, { message: error.message || "POS 주문 처리 오류" });
  }
};
