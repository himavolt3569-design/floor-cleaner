import { requireSuperAdmin } from "@/lib/auth/session";
import { listDeliveryMethods } from "@/lib/data/admin";
import { DeliveryEditor } from "@/components/admin/DeliveryEditor";
import { PageHeading } from "@/components/admin/ui";

export default async function AdminDeliveryPage() {
  await requireSuperAdmin();
  const methods = await listDeliveryMethods();

  return (
    <>
      <PageHeading
        title="Delivery"
        description="Customers are only shown the options that match the province and district they enter at checkout."
      />
      <DeliveryEditor methods={methods} />
    </>
  );
}
