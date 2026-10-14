import { getOrderForUser, getOrderFromCookies, toOrderTrackingData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DeliveryMap from "./DeliveryMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Delivery Tracking",
  description: "Track your Addis Eats courier in real-time on OpenStreetMap.",
};

export default async function TrackPage({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/track/${id}`)}`);

  const cookieStore = await cookies();
  getOrderFromCookies(id, cookieStore);

  const order = getOrderForUser(id, user.id, user.role);
  if (!order) notFound();

  return (
    <main style={{ maxWidth: "1040px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <DeliveryMap orderId={id} initialOrder={toOrderTrackingData(order)} />
    </main>
  );
}
