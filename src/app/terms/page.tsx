import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { getStorefrontData } from "@/lib/data/storefront";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that apply when you order TMG Cleaner from this website.",
};

export default async function TermsPage() {
  const { settings, deliveryMethods, paymentMethods } = await getStorefrontData();

  return (
    <LegalPage title="Terms" updated="September 2026">
      <p>
        These terms apply when you order TMG Cleaner through this website. They
        are written to describe how ordering actually works here.
      </p>

      <h2>Orders</h2>
      <p>
        Placing an order is an offer to buy. The order is confirmed once we have
        checked stock and, where payment is made in advance, confirmed the
        payment. If an item sells out between your order and our confirmation we
        will contact you and either arrange an alternative or cancel the order.
      </p>
      <p>
        Prices shown are in Nepalese rupees. The total you see before confirming
        is calculated on our server from the current price, the delivery option
        you select and any discount that applies. That total is the one that
        binds.
      </p>

      <h2>Payment</h2>
      {paymentMethods.length > 0 ? (
        <>
          <p>We currently accept:</p>
          <ul>
            {paymentMethods.map((method) => (
              <li key={method.id}>
                <strong>{method.name}.</strong> {method.description}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Accepted payment methods are shown at checkout.</p>
      )}
      <p>
        For QR and bank transfer payments, pressing <strong>I have paid</strong>{" "}
        records your claim and nothing more. We check the payment by hand before
        the order is treated as paid, and your order will show as awaiting
        verification until we have done so.
      </p>

      <h2>Delivery</h2>
      {deliveryMethods.length > 0 ? (
        <>
          <p>The options currently offered are:</p>
          <ul>
            {deliveryMethods.map((method) => (
              <li key={method.id}>
                <strong>{method.name}.</strong> {method.description} Estimated{" "}
                {method.estimate.toLowerCase()}.
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Delivery options are shown at checkout for your address.</p>
      )}
      <p>
        Delivery times are estimates, not guarantees. Weather, strikes and road
        conditions can delay a courier, and we will keep you informed if that
        happens. Please make sure the mobile number you give us is reachable:
        couriers usually call before arriving.
      </p>

      <h2>Cancellations, returns and damaged goods</h2>
      <p>
        If your order arrives damaged or leaking, contact us on the day it
        arrives and we will replace it. To cancel an order, contact us before it
        has been dispatched. For anything else, contact us and we will deal with
        it case by case.
      </p>

      <h2>Using the product</h2>
      <p>
        Use TMG Cleaner according to the instructions printed on the bottle, and
        keep it out of reach of children. Surfaces and finishes vary, so test a
        small hidden area before cleaning a surface for the first time. We are
        not responsible for damage caused by use that does not follow the
        instructions on the packaging.
      </p>

      <h2>Contact</h2>
      <p>
        TMG Cleaner, {settings.contact.address}. Email {settings.contact.email},
        phone {settings.contact.phone}. Nepali law applies to these terms.
      </p>
    </LegalPage>
  );
}
