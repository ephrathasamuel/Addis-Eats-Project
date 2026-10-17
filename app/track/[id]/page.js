import { getOrderForUser, toOrderTrackingData } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import DeliveryMap from "./DeliveryMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order Delivery Map",
  description: "View order status, a customer-provided delivery pin, and courier GPS when the assigned courier shares it.",
};

export default async function TrackPage({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/track/${id}`)}`);

  const order = getOrderForUser(id, user.id, user.role);
  if (!order) notFound();

  return (
    <div className="page-wide">
      <DeliveryMap orderId={id} initialOrder={toOrderTrackingData(order)} viewerRole={user.role} />
    </div>
  );
}
