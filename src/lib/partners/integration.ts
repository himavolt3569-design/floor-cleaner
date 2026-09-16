import type { PartnerEntry, PartnerOrder } from "@/types/partners";

/** Provider boundary reserved for authenticated server-side adapters.
 * No live adapter is registered: manual tracking is the current capability.
 * Credentials belong in server environment/secret storage, never Partner docs.
 */
export interface PartnerIntegrationAdapter {
  provider: string;
  pullTransactions(input: { accountReference: string; cursor?: string }): Promise<{
    entries: Omit<PartnerEntry, "id" | "partnerId" | "actor" | "createdAt">[];
    nextCursor?: string;
  }>;
  getShipment?(trackingNumber: string): Promise<{ status: string; updatedAt: string }>;
  createShipment?(order: PartnerOrder): Promise<{ trackingNumber: string; externalReference: string }>;
}
export const PARTNER_CONNECTION_MODE = "manual" as const;
