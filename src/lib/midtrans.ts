import { createHash } from "node:crypto";

const MIDTRANS_SNAP_BASE_URL = "https://app.sandbox.midtrans.com";

type MidtransItemDetail = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CreateMidtransTransactionInput = {
  orderNumber: string;
  grossAmount: number;
  customerName: string;
  items: MidtransItemDetail[];
  finishRedirectUrl: string;
};

type MidtransSnapResponse = {
  token: string;
  redirect_url: string;
};

type MidtransNotificationPayload = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
};

function getMidtransServerKey() {
  return process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
}

export function isMidtransConfigured() {
  return Boolean(getMidtransServerKey() && getAppUrl());
}

export function getMidtransConfigurationError() {
  if (!getMidtransServerKey()) {
    return "MIDTRANS_SERVER_KEY belum diisi.";
  }

  if (!getAppUrl()) {
    return "NEXT_PUBLIC_APP_URL belum diisi.";
  }

  return null;
}

export async function createMidtransTransaction({
  orderNumber,
  grossAmount,
  customerName,
  items,
  finishRedirectUrl,
}: CreateMidtransTransactionInput) {
  const serverKey = getMidtransServerKey();
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  const response = await fetch(`${MIDTRANS_SNAP_BASE_URL}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderNumber,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: customerName,
      },
      item_details: items.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name.slice(0, 50),
      })),
      callbacks: {
        finish: finishRedirectUrl,
        unfinish: finishRedirectUrl,
        error: finishRedirectUrl,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Midtrans gagal membuat transaksi: ${message}`);
  }

  return (await response.json()) as MidtransSnapResponse;
}

export function isValidMidtransNotificationSignature(payload: MidtransNotificationPayload) {
  const serverKey = getMidtransServerKey();
  if (!serverKey) {
    return false;
  }

  const orderId = payload.order_id ?? "";
  const statusCode = payload.status_code ?? "";
  const grossAmount = payload.gross_amount ?? "";
  const signature = payload.signature_key ?? "";

  const expectedSignature = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  return expectedSignature === signature;
}

export type { MidtransNotificationPayload };
