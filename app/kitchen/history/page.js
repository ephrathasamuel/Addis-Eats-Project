import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMyHistory } from "@/lib/team";
import { StaffHistory } from "@/components/StaffHistory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My kitchen history",
  robots: { index: false },
};

export default async function HistoryPage() {
  const user = await getSession();
  if (!user) redirect("/staff/signin?next=/kitchen/history");
  // The admin sees everyone's work on the team page.
  if (user.role === "admin") redirect("/admin/team");
  if (user.role !== "staff") redirect("/menu");

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>My kitchen history</h1>
          <p>Everything you&apos;ve finished, day by day.</p>
        </div>
        <Link href="/kitchen" className="btn-ghost">← Back to the kitchen</Link>
      </div>
      <StaffHistory history={getMyHistory(user)} />
    </div>
  );
}
