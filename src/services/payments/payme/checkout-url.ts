export function buildPaymeCheckoutUrl(params: {
  merchantId: string;
  orderId: number;
  amountTiyin: number;
  returnUrl: string;
}): string {
  const parts = [
    `m=${params.merchantId}`,
    `ac.order_id=${params.orderId}`,
    `a=${params.amountTiyin}`,
    `c=${params.returnUrl}`,
  ].join(";");
  const encoded = Buffer.from(parts, "utf8").toString("base64");
  return `https://checkout.paycom.uz/${encoded}`;
}
