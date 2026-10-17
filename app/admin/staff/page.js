import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listStaff } from "@/lib/accounts";
import { getStaffStats, startOfToday } from "@/lib/orders";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff",
  robots: { index: false },
};

export default async function StaffPage() {
  const user = await getSession();
  if (!user) redirect("/signin?next=/admin/staff");
  if (user.role !== "admin") redirect("/menu");

  const today = getStaffStats(startOfToday());
  const allTime = getStaffStats();
  const staff = listStaff().map((member) => ({
    ...member,
    stats: {
      today: member.role === "staff" ? today.cooks[member.id]?.done || 0 : today.couriers[member.id]?.delivered || 0,
      allTime: member.role === "staff" ? allTime.cooks[member.id]?.done || 0 : allTime.couriers[member.id]?.delivered || 0,
    },
  }));

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Staff accounts</h1>
          <p>
            Only accounts created here can use the kitchen and delivery boards. Kitchen staff also get a PIN for
            claiming orders on the shared kitchen tablet.
          </p>
        </div>
      </div>
      <StaffManager initialStaff={staff} />
    </div>
  );
}
