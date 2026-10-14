import { getOrder } from "@/lib/orders";
import { notFound } from "next/navigation";
import DeliveryMap from "./DeliveryMap";

export const metadata = {
  title: "Live Delivery Tracking",
  description: "Track your Addis Eats courier in real-time on OpenStreetMap.",
};

export default async function TrackPage({ params }) {
  const { id } = await params;
  const order = getOrder(id);

  if (!order) {
    notFound();
  }

  return (
    <main style={{ maxWidth: "1040px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <DeliveryMap orderId={id} initialOrder={order} />
    </main>
  );
}
