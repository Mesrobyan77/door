import type { PaymentAdapter } from "@/lib/payments/types";

/** Cash on Delivery — P0 payment adapter. */
export function createCodPaymentAdapter(): PaymentAdapter {
  return {
    name: "cod",
    async createPayment() {
      return {
        provider: "cod",
        status: "pending",
        providerReference: null,
      };
    },
  };
}
