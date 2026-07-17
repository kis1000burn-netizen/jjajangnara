const {
  deletePendingOrder,
  getPendingOrder,
  savePendingOrder,
} = require("./_orders");

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: responseHeaders,
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: responseHeaders, body: "" };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const orderId = String(body.orderId || "").trim();
      if (!orderId || !body.order) {
        return json(400, { message: "orderId와 order가 필요합니다." });
      }
      const pending = await savePendingOrder(event, orderId, body.order);
      return json(200, { ok: true, orderId: pending.orderId });
    }

    if (event.httpMethod === "GET") {
      const orderId = String(event.queryStringParameters?.orderId || "").trim();
      if (!orderId) {
        return json(400, { message: "orderId가 필요합니다." });
      }
      const pending = await getPendingOrder(event, orderId);
      if (!pending) {
        return json(404, { message: "대기 주문 정보를 찾지 못했습니다." });
      }
      return json(200, { order: pending });
    }

    if (event.httpMethod === "DELETE") {
      const orderId = String(
        event.queryStringParameters?.orderId ||
          JSON.parse(event.body || "{}").orderId ||
          ""
      ).trim();
      if (!orderId) {
        return json(400, { message: "orderId가 필요합니다." });
      }
      await deletePendingOrder(event, orderId);
      return json(200, { ok: true });
    }

    return json(405, { message: "Method Not Allowed" });
  } catch (error) {
    return json(500, { message: error.message || "대기 주문 처리 오류" });
  }
};
