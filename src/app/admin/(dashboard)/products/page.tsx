import { requireSuperAdmin } from "@/lib/auth/session";
import { listProducts } from "@/lib/data/admin";
import { ProductsEditor } from "@/components/admin/ProductsEditor";
import { PageHeading } from "@/components/admin/ui";

export default async function AdminProductsPage() {
  await requireSuperAdmin();
  const products = await listProducts();

  return (
    <>
      <PageHeading
        title="Products"
        description="Prices and stock are read straight from here when an order is placed. Changing a price changes it everywhere at once."
      />
      <ProductsEditor products={products} />
    </>
  );
}
