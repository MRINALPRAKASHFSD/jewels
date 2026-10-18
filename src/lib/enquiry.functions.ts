/**
 * TanStack Start server functions for public enquiry submission.
 *
 * Exposes the RPC endpoint for public forms while keeping
 * server-side logic and credentials safely isolated.
 *
 * Copyright © 2026 Mrinal Prakash. All rights reserved.
 */
import { createServerFn } from "@tanstack/react-start";
import type { EnquirySubmissionResult } from "./enquiry.server";

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator((d: unknown) => d)
  .handler(async ({ data }): Promise<EnquirySubmissionResult> => {
    const { processEnquirySubmission } = await import("./enquiry.server");
    return processEnquirySubmission(data);
  });
