import Link from "next/link";
import { BUSINESS, LEGAL_UPDATED } from "@/lib/business";
import { getPricing } from "@/lib/pricing";

export const metadata = {
  title: "Terms of service",
  description: "How ordering, delivery fees, payment and cancellation work at Addis Eats.",
};

export default function TermsPage() {
  const { baseFee, baseKm, perKm } = getPricing();

  return (
    <div className="legal-page">
      <h1>Terms of service</h1>
      <p className="text-muted">Last updated {LEGAL_UPDATED}</p>

      <p>
        These terms apply when you order from {BUSINESS.name} through this website. By placing an order you
        agree to them.
      </p>

      <h2>Ordering</h2>
      <ul>
        <li>You need an account to order. Please give a name and phone number the courier can reach you on.</li>
        <li>Dishes can sell out. A dish marked sold out cannot be ordered until the kitchen makes it available again.</li>
        <li>An order is accepted once you see its confirmation page.</li>
      </ul>

      <h2>Prices and delivery fee</h2>
      <ul>
        <li>All prices are in Ethiopian birr (ETB).</li>
        <li>
          The delivery fee is {baseFee} ETB for the first {baseKm} km and {perKm} ETB for each extra
          kilometre, by road from the restaurant. You see the exact fee at checkout before you order.
        </li>
        <li>We deliver within {BUSINESS.city} only.</li>
      </ul>

      <h2>Payment</h2>
      <p>You pay the courier in cash when your order arrives. Online payment is not available yet.</p>

      <h2>Cancelling</h2>
      <p>
        You can cancel an order yourself within 5 minutes of placing it, as long as the kitchen has not started
        cooking it. After that, please call us on <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
      </p>

      <h2>Delivery times</h2>
      <p>
        The times we show are estimates based on the kitchen&apos;s recent cooking times and the route. Traffic and
        busy hours can make an order later than estimated.
      </p>

      <h2>Reviews</h2>
      <p>
        You can review an order after it is delivered and edit your review for 48 hours. Please keep reviews
        honest and polite; we may remove abusive ones.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your password to yourself. You are responsible for orders placed from your account. Kitchen and
        delivery accounts are created by the restaurant and used only for work.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or problems with an order: <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a> or{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. See also our{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </div>
  );
}
