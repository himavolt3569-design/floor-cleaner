import { requireSuperAdmin } from "@/lib/auth/session";
import { listPaymentMethods } from "@/lib/data/admin";
import { PaymentsEditor } from "@/components/admin/PaymentsEditor";
import { PageHeading } from "@/components/admin/ui";

export default async function AdminPaymentsPage() {
  await requireSuperAdmin();
  const methods = await listPaymentMethods();

  return (
    <>
      <PageHeading
        title="Payments"
        description="Only the methods switched on here appear at checkout. Manual methods stay unpaid until you confirm them on the Orders page."
      />
      <PaymentsEditor methods={methods} />
    </>
  );
}
