import { requireSuperAdmin } from "@/lib/auth/session";
import { partnerReportData } from "@/lib/partners/data";
import { listProducts } from "@/lib/data/admin";
import { PartnersWorkspace } from "@/components/admin/PartnersWorkspace";
import { PageHeading } from "@/components/admin/ui";
export default async function PartnersPage() {
  await requireSuperAdmin();
  const [data, products] = await Promise.all([partnerReportData(), listProducts()]);
  return <><PageHeading title="Partners & reports" description="Company-level sales, allocated inventory, courier assignments and money reconciliation."/><PartnersWorkspace {...data} skus={products.flatMap(p=>p.variants.map(v=>v.sku))}/></>;
}
