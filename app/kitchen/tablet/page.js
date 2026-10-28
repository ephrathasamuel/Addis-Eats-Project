import { getSession, KITCHEN_TABLET_ROLE } from "@/lib/session";
import { getKitchenSnapshot } from "@/lib/kitchen";
import { signOut } from "@/app/actions";
import { KitchenBoard } from "../KitchenBoard";
import { TabletSignIn } from "./TabletSignIn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kitchen tablet",
  robots: { index: false },
};

// The kitchen tablet portal: a shared device that only shows the kitchen
// board. It is opened once with a cook's or the admin's own sign-in; after
// that every claim needs the cook's PIN.
export default async function KitchenTabletPage() {
  const user = await getSession();

  if (user?.role !== KITCHEN_TABLET_ROLE) {
    return <TabletSignIn signedInAs={user ? user.name : ""} />;
  }

  return (
    <div className="page-wide">
      <div className="page-heading">
        <div>
          <h1>Kitchen tablet</h1>
        </div>
        <div className="tablet-session">
          <span className="text-muted">Opened by {user.openedBy}</span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost">Close tablet</button>
          </form>
        </div>
      </div>
      <KitchenBoard initialSnapshot={getKitchenSnapshot()} viewer={{ id: user.id, name: user.name, role: user.role }} mode="station" />
    </div>
  );
}
