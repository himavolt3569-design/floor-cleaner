import { requireSuperAdmin } from "@/lib/auth/session";
import { getStorefrontData } from "@/lib/data/storefront";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeading } from "@/components/admin/ui";
import { Notice } from "@/components/admin/ui";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const { settings, live } = await getStorefrontData();

  return (
    <>
      <PageHeading
        title="Settings"
        description="Storefront copy and contact details. Saving writes to Firestore, so nothing here needs a code change."
      />
      {!live && (
        <div className="mb-5">
          <Notice tone="warn">
            You are editing the bundled defaults. Saving creates the Firestore
            settings document, and the storefront will read from it from then on.
          </Notice>
        </div>
      )}
      <SettingsForm settings={settings} />
    </>
  );
}
