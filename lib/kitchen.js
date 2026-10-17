import "server-only";
import { getKitchenQueue, getStaffStats, startOfToday } from "@/lib/orders";
import { listStaff } from "@/lib/accounts";
import { getAllDishesAdmin } from "@/lib/dishes";

// Everything the kitchen board needs in one payload (queue, cook roster with
// today's counts, and dish availability). Used for the first render and polling.
export function getKitchenSnapshot() {
  const { cooks } = getStaffStats(startOfToday());
  return {
    queue: getKitchenQueue(),
    cooks: listStaff("staff").map(({ id, name, photo, hasPin }) => ({
      id,
      name,
      photo,
      hasPin,
      today: cooks[id] || { done: 0, cooking: 0, items: 0, avgCookMinutes: null },
    })),
    dishes: getAllDishesAdmin()
      .filter((dish) => !dish.isRemoved)
      .map(({ id, name, category, isSoldOut, image }) => ({ id, name, category, isSoldOut, image })),
  };
}
