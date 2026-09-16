import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { getStorefrontData } from "@/lib/data/storefront";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What TMG Cleaner collects when you place an order, why, and how long it is kept.",
};

export default async function PrivacyPage() {
  const { settings } = await getStorefrontData();

  return (
    <LegalPage title="Privacy" updated="September 2026">
      <p>
        This page describes what happens to your information when you order from
        this website. It reflects how the site actually works rather than
        general boilerplate.
      </p>

      <h2>What we collect</h2>
      <p>If you choose “Use my current location” at checkout, your browser asks for permission. Coordinates are sent to OpenStreetMap’s Nominatim service to find an address. We do not save the coordinates in your order. You can enter your address manually instead, and you should review any automatically filled fields.</p>
      <p>When you place an order we ask for:</p>
      <ul>
        <li>Your name and mobile number, so the courier can reach you.</li>
        <li>
          Your delivery address: province, district, municipality, ward, area and
          any landmark you add.
        </li>
        <li>Your email address, only if you choose to give one.</li>
        <li>Any delivery note you write.</li>
      </ul>
      <p>
        If you pay by QR or bank transfer we also store the transaction
        reference you give us, and the payment screenshot if you upload one.
      </p>
      <p>
        For each order we record the IP address and browser the order came from.
        This is used only to investigate fraudulent or abusive orders.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>
          <strong>We never see your card, bank or wallet credentials.</strong> No
          part of this site asks for a PIN, password or card number.
        </li>
        <li>We do not sell or rent your information to anyone.</li>
        <li>We do not use advertising or cross-site tracking cookies.</li>
      </ul>

      <h2>Where it is stored</h2>
      <p>
        Order data is stored in Google Firebase (Cloud Firestore), and uploaded
        payment screenshots in Firebase Storage. Screenshots are not publicly
        accessible: staff view them through links that expire after a few
        minutes.
      </p>

      <h2>Cookies</h2>
      <p>
        The storefront sets no tracking cookies. Your cart is kept in your own
        browser using local storage and never leaves your device until you place
        an order. Staff signing in to the admin area receive one secure,
        http-only session cookie, which exists purely to keep them signed in.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for as long as we need them for accounting and
        for handling questions about past orders. If you want your details
        removed, contact us and we will remove what we are not required to keep.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what we hold about you, ask for it to be corrected, or ask
        for it to be deleted. Contact us at {settings.contact.email} or{" "}
        {settings.contact.phone}.
      </p>

      <h2>Contact</h2>
      <p>
        TMG Cleaner, {settings.contact.address}. Email {settings.contact.email},
        phone {settings.contact.phone}.
      </p>
    </LegalPage>
  );
}
