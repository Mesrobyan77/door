import { createId } from "@/lib/id";
import type { EmailAdapter } from "@/lib/email/types";
import { logger } from "@/lib/observability/logger";

export function createStubEmailAdapter(): EmailAdapter {
  return {
    name: "stub-email",
    async send(message) {
      const id = createId();
      logger.info("email.stub.send", {
        id,
        to: message.to,
        subject: message.subject,
        ...(process.env.NODE_ENV !== "production"
          ? { text: message.text }
          : {}),
      });
      return { id };
    },
  };
}
