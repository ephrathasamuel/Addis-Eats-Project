import Link from "next/link";
import { BUSINESS, LEGAL_UPDATED } from "@/lib/business";
import { isOnlinePaymentEnabled } from "@/lib/payments";

export const metadata = {
  title: "Privacy policy",
  description: "What Addis Eats collects, why, who can see it and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <h1>Privacy policy</h1>
      <p className="text-muted">Last updated {LEGAL_UPDATED}</p>

      <p>
        This page explains what {BUSINESS.name} collects when you use this website, why we need it, who can see
        it and how to have it changed or removed. We aim to handle personal data in line with Ethiopia&apos;s
        Personal Data Protection Proclamation (No. 1321/2024).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address, and a password (stored only as a one-way
          hash, never in readable form). If you sign in with Google, we receive your name, email and profile
          picture from Google.
        </li>
        <li>
          <strong>Your orders:</strong> the dishes, prices, your phone number, the neighbourhood you chose,
          any directions you typed for the courier and, only if you choose to share it, your location on the
          map. We also keep the order times, its status and any review you write.
        </li>
        <li>
          <strong>Couriers&apos; location:</strong> while a courier is delivering an order, their phone sends
          its location so the customer can follow the delivery on the map.
        </li>
        <li>
          <strong>Staff details:</strong> for kitchen and delivery staff, their name, email, phone number,
          photo, kitchen PIN (stored as a hash) and the orders they handled.
        </li>
        <li>
          <strong>Notifications:</strong> if you turn on notifications, your browser gives us an address to
          send them to. You can turn them off at any time.
        </li>
        <li>
          <strong>On your device only:</strong> your cart, favourites and light/dark choice stay in your
          browser and are not sent to us.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To prepare and deliver your order, and to work out the delivery fee and time.</li>
        <li>So the kitchen, the courier and you can contact each other about an order.</li>
        <li>To keep you signed in and to protect accounts (for example, locking sign-in after repeated wrong passwords).</li>
        <li>To keep the restaurant&apos;s records: sales, costs and which staff member handled each order.</li>
      </ul>
      <p>We do not sell your data, and we do not use advertising or tracking cookies.</p>

      <h2>Who can see it</h2>
      <ul>
        <li><strong>You</strong> see your own orders, and the name, phone number and photo of the courier delivering them.</li>
        <li><strong>The kitchen</strong> sees what was ordered.</li>
        <li><strong>Your courier</strong> sees your name, phone number, delivery area, directions and map location for the order they deliver.</li>
        <li><strong>The restaurant administrator</strong> can see all orders and staff records.</li>
      </ul>
      <p>We use these services to run the website, and they process data only for that purpose:</p>
      <ul>
        <li><strong>Supabase</strong> stores accounts and orders and handles sign-in.</li>
        <li><strong>Vercel</strong> hosts the website.</li>
        <li><strong>Google</strong> is used only if you choose to sign in with Google.</li>
        <li>
          <strong>Map and route services</strong> (OpenStreetMap map tiles and a routing service) receive map
          positions to draw the map and estimate the drive time. They do not receive your name or phone number.
        </li>
        {isOnlinePaymentEnabled() && (
          <li>
            <strong>Chapa</strong> processes online payments. You enter your telebirr, CBE Birr or card details on
            Chapa&apos;s page, not ours; we only receive whether the payment succeeded.
          </li>
        )}
        <li><strong>Your browser&apos;s push service</strong> (from Google, Mozilla or Apple) delivers notifications if you turn them on.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Orders are kept as part of the restaurant&apos;s business records. Accounts are kept until you ask us to
        delete them. When an account is deleted we remove your name, email and phone number, and keep only
        anonymous order totals needed for the accounts.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us what data we hold about you, ask us to correct it, or ask us to delete your account.
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{" "}
        <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>. You can change your name, phone number and password
        yourself on your <Link href="/profile">profile</Link>.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date at the top of this page.</p>
    </div>
  );
}
