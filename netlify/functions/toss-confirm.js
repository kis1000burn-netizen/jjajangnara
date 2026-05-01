exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "TOSS_SECRET_KEY is not configured." }),
    };
  }

  try {
    const { paymentKey, orderId, amount } = JSON.parse(event.body || "{}");

    if (!paymentKey || !orderId || typeof amount === "undefined") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "paymentKey, orderId, amount are required." }),
      };
    }

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: result.message || "Payment confirmation failed.",
          code: result.code || "TOSS_CONFIRM_FAILED",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentKey: result.paymentKey,
        orderId: result.orderId,
        method: result.method,
        status: result.status,
        totalAmount: result.totalAmount,
        approvedAt: result.approvedAt,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Unknown server error",
      }),
    };
  }
};