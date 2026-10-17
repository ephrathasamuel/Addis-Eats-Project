import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getKitchenSnapshot } from "@/lib/kitchen";
import { KitchenBoard } from "./KitchenBoard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kitchen",
  robots: { index: false },
};

export default async function KitchenPage() {
  const user = await getSession();

  if (!user) {
    redirect("/signin?next=/kitchen");
  }

  if (user.role !== "staff" && user.role !== "admin") {
    return (
      <div className="empty-state" style={{ maxWidth: "620px", margin: "4rem auto" }}>
        <h1>Kitchen staff only</h1>
        <p>
          The kitchen board is for restaurant staff. You are signed in as <strong>{user.name}</strong>.
        </p>
        <Link href="/menu" className="btn-secondary">
          Back to the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Kitchen</h1>
          <p>Claim tickets, cook, and mark them ready. Updates appear automatically.</p>
        </div>
        <span className={`role-pill role-pill--${user.role}`}>{user.role === "admin" ? "Admin view" : user.name}</span>
      </div>
      <KitchenBoard
        initialSnapshot={getKitchenSnapshot()}
        viewer={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
