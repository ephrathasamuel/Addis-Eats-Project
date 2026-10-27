"use client";

import { thumbnailSrc } from "@/lib/images";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleSoldOutAction,
  removeDishAction,
  restoreDishAction,
  addDishAction,
  editDishAction,
  addDailyExpenseAction,
  adminEditOrderAction,
} from "@/app/actions";
import { DELIVERY_LOCATIONS } from "@/lib/locations";
import { ImagePicker } from "@/components/ImagePicker";

const GALLERY_IMAGES = [
  { label: "Doro Wat", path: "/images/food/doro-wat.jpg" },
  { label: "Special Kitfo", path: "/images/food/kitfo.jpg" },
  { label: "Shekla Tibs", path: "/images/food/shekla-tibs.jpg" },
  { label: "Shiro Tegabino", path: "/images/food/shiro.jpg" },
  { label: "Beyaynetu", path: "/images/food/beyaynetu.jpg" },
  { label: "Tibs Firfir", path: "/images/food/firfir.jpg" },
  { label: "Gomen Wat", path: "/images/food/gomen-wat.jpg" },
  { label: "Kik Alicha", path: "/images/food/kik-alicha.jpg" },
  { label: "Crispy Derek Tibs", path: "/images/food/derek-tibs.jpg" },
  { label: "Authentic Misir Wat", path: "/images/food/misir-wat.jpg" },
  { label: "Spicy Beef Key Wat", path: "/images/food/key-wat.jpg" },
  { label: "Crispy Asa Tibs", path: "/images/food/asa-tibs.jpg" },
  { label: "Cheeseburger", path: "/images/food/cheeseburger.jpg" },
  { label: "Crispy Fried Chicken", path: "/images/food/crispy-fried-chicken.jpg" },
  { label: "Wood-Fired Pizza", path: "/images/food/margherita-pizza.jpg" },
  { label: "Chicken Alfredo", path: "/images/food/chicken-alfredo.jpg" },
  { label: "Penne Arrabbiata", path: "/images/food/penne-arrabbiata.jpg" },
  { label: "Ribeye Steak", path: "/images/food/ribeye-steak.jpg" },
  { label: "BBQ Beef Ribs", path: "/images/food/bbq-ribs.jpg" },
  { label: "Chicken Caesar Salad", path: "/images/food/caesar-salad.jpg" },
  { label: "Buna Ceremony", path: "/images/food/buna-ceremony.jpg" },
  { label: "Spiced Chai", path: "/images/food/spiced-chai.jpg" },
  { label: "Fresh Spris", path: "/images/food/spris-juice.jpg" },
  { label: "Avocado Lime Shake", path: "/images/food/avocado-smoothie.jpg" },
  { label: "Mango Passion Juice", path: "/images/food/mango-passion.jpg" },
  { label: "Besso Smoothie", path: "/images/food/besso-smoothie.jpg" },
  { label: "Lemon Mint Cooler", path: "/images/food/lemon-mint.jpg" },
  { label: "Telba Drink", path: "/images/food/telba-drink.jpg" },
  { label: "Tej Wine", path: "/images/food/tej.jpg" },
  { label: "Hibiscus Iced Tea", path: "/images/food/hibiscus-tea.jpg" },
  { label: "Ambo Mineral Water", path: "/images/food/mineral-water.jpg" },
];

// ledgerData and rankedFavorites are computed on the server from the real
// order and expense stores and refreshed with router.refresh().
export function AdminDashboard({ initialDishes, initialOrders, ledgerData, rankedFavorites, mustChangePassword }) {
  const router = useRouter();
  const [dishes, setDishes] = useState(initialDishes);
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "favorites" | "analytics" | "timings"
  const [loadingId, setLoadingId] = useState(null);
  const [notification, setNotification] = useState("");

  // Edit Dish state
  const [editingDish, setEditingDish] = useState(null);

  // Add Dish state
  const [showAddDish, setShowAddDish] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newCategory, setNewCategory] = useState("Traditional");
  const [newPrice, setNewPrice] = useState("");
  const [newSpicy, setNewSpicy] = useState(false);
  const [newTag, setNewTag] = useState("Chef's Special");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Daily Expense insertion state
  // Today in Addis Ababa (UTC+3), so late-evening entries land on the right day.
  const [expenseDate, setExpenseDate] = useState(() => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10));
  const [expenseReason, setExpenseReason] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [expenseRaw, setExpenseRaw] = useState("");
  const [expenseTransport, setExpenseTransport] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Financial Ledger Full History Toggle
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Admin Order Edit state
  const [editingOrder, setEditingOrder] = useState(null);
  const [editOrderPhone, setEditOrderPhone] = useState("");
  const [editOrderLocation, setEditOrderLocation] = useState("Bole");
  const [editOrderNote, setEditOrderNote] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  const handleToggleSoldOut = async (dishId, currentSoldOut) => {
    setLoadingId(dishId);
    const res = await toggleSoldOutAction(dishId);
    setLoadingId(null);
    if (res?.ok) {
      setDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, isSoldOut: !currentSoldOut } : d))
      );
      showToast(currentSoldOut ? "Dish marked as Available in menu" : "Dish marked as Sold Out");
    } else {
      alert(res?.error || "Failed to update dish status.");
    }
  };

  const handleRemoveDish = async (dishId, dishName) => {
    if (!confirm(`Are you sure you want to remove "${dishName}" from active customer menu?`)) return;
    setLoadingId(dishId);
    const res = await removeDishAction(dishId);
    setLoadingId(null);
    if (res?.ok) {
      setDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, isRemoved: true } : d))
      );
      showToast(`"${dishName}" removed from menu.`);
    } else {
      alert(res?.error || "Failed to remove dish.");
    }
  };

  const handleRestoreDish = async (dishId, dishName) => {
    setLoadingId(dishId);
    const res = await restoreDishAction(dishId);
    setLoadingId(null);
    if (res?.ok) {
      setDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, isRemoved: false, isSoldOut: false } : d))
      );
      showToast(`"${dishName}" restored to active menu.`);
    } else {
      alert(res?.error || "Failed to restore dish.");
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      alert("Please enter a dish name.");
      return;
    }
    if (!newPrice || Number(newPrice) <= 0) {
      alert("Please enter a valid price in ETB.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("name", newDishName.trim());
    formData.set("category", newCategory);
    formData.set("price", newPrice);
    formData.set("spicy", newSpicy ? "true" : "false");
    formData.set("tag", newTag.trim() || "Chef's Special");
    formData.set("description", newDescription.trim() || "Freshly cooked specialty.");
    formData.set("image", newImage);

    const res = await addDishAction(formData);
    setIsSubmitting(false);

    if (res?.ok && res?.dish) {
      setDishes((prev) => [res.dish, ...prev]);
      showToast(`"${res.dish.name}" added to menu successfully!`);
      setNewDishName("");
      setNewPrice("");
      setNewDescription("");
      setNewImage("");
      setShowAddDish(false);
    } else {
      alert(res?.error || "Failed to add dish.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDish) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("id", editingDish.id);
    formData.set("name", editingDish.name);
    formData.set("category", editingDish.category);
    formData.set("price", String(editingDish.price));
    formData.set("spicy", editingDish.spicy ? "true" : "false");
    formData.set("tag", editingDish.tag || "");
    formData.set("description", editingDish.description || "");
    formData.set("image", editingDish.image || "");

    const res = await editDishAction(formData);
    setIsSubmitting(false);

    if (res?.ok && res?.dish) {
      setDishes((prev) =>
        prev.map((d) => (d.id === editingDish.id ? { ...d, ...res.dish } : d))
      );
      showToast(`"${res.dish.name}" details updated successfully!`);
      setEditingDish(null);
    } else {
      alert(res?.error || "Failed to update dish.");
    }
  };

  // Picking a day that already has costs loads them, so the admin edits
  // rather than overwrites, and asks for a reason for the change.
  const pickExpenseDate = (date) => {
    setExpenseDate(date);
    setExpenseError("");
    setExpenseReason("");
    const recorded = ledgerData.ledger.find((row) => row.date === date && row.costsRecorded);
    setExpenseRaw(recorded ? String(recorded.rawMaterials) : "");
    setExpenseTransport(recorded ? String(recorded.transport) : "");
    setExpenseNote(recorded ? recorded.note : "");
  };
  const editingRecordedDay = ledgerData.ledger.some((row) => row.date === expenseDate && row.costsRecorded);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseDate) return;
    setIsSavingExpense(true);
    setExpenseError("");

    const formData = new FormData();
    formData.set("date", expenseDate);
    formData.set("rawMaterials", expenseRaw || "0");
    formData.set("transport", expenseTransport || "0");
    formData.set("note", expenseNote || "");
    formData.set("reason", expenseReason || "");

    const res = await addDailyExpenseAction(formData);
    setIsSavingExpense(false);

    if (res?.ok) {
      showToast(res.edited ? `Costs for ${expenseDate} updated. The change and its reason are in the ledger.` : `Costs for ${expenseDate} saved.`);
      setExpenseReason("");
      router.refresh();
    } else {
      setExpenseError(res?.error || "Failed to save daily expense.");
    }
  };

  const handleAdminEditOrder = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsSavingOrder(true);
    const formData = new FormData();
    formData.set("id", editingOrder.id);
    formData.set("phone", editOrderPhone);
    formData.set("location", editOrderLocation);
    formData.set("note", editOrderNote);
    const res = await adminEditOrderAction(formData);
    setIsSavingOrder(false);
    if (res?.ok && res?.order) {
      setOrders((prev) =>
        prev.map((o) => (o.id === editingOrder.id ? { ...res.order } : o))
      );
      showToast(`Order #${editingOrder.id} updated by management.`);
      setEditingOrder(null);
    } else {
      alert(res?.error || "Failed to update order details.");
    }
  };

  const { ledger, recent5Days, totals } = ledgerData;

  const totalDishes = dishes.filter((d) => !d.isRemoved).length;
  return (
    <div>
      {/* Admin Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.85rem" }}>Restaurant Admin Panel</h1>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "750",
                textTransform: "uppercase",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                backgroundColor: "var(--brand)",
                color: "var(--on-brand)",
              }}
            >
              Administrator
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            Real-time menu control, financial ledger and order timing analytics
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/staff" className="btn-primary" style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}>
            Manage staff
          </Link>
          <Link href="/admin/team" className="btn-secondary" style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}>
            Team performance
          </Link>
          <Link href="/menu" className="btn-secondary" style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}>
            Customer Menu
          </Link>
        </div>
      </div>

      {mustChangePassword && (
        <div className="board__hint" role="alert" style={{ border: "1px solid #d97706" }}>
          <strong>Security:</strong> this admin account still uses the default password.{" "}
          <Link href="/profile">Change it now</Link> before anyone else can guess it.
        </div>
      )}

      {notification && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid #16a34a",
            borderRadius: "12px",
            color: "#16a34a",
            fontWeight: "600",
            fontSize: "0.9rem",
            marginBottom: "1.25rem",
          }}
        >
          {notification}
        </div>
      )}

      {/* Navigation Tabs (Strictly Separated) */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          style={{
            padding: "0.65rem 0.95rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "inventory" ? "3px solid var(--brand)" : "3px solid transparent",
            color: activeTab === "inventory" ? "var(--brand-dark)" : "var(--muted)",
            fontWeight: activeTab === "inventory" ? "750" : "500",
            fontSize: "0.92rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Menu ({totalDishes})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          style={{
            padding: "0.65rem 0.95rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "favorites" ? "3px solid var(--brand)" : "3px solid transparent",
            color: activeTab === "favorites" ? "var(--brand-dark)" : "var(--muted)",
            fontWeight: activeTab === "favorites" ? "750" : "500",
            fontSize: "0.92rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Favorites by Location
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          style={{
            padding: "0.65rem 0.95rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "analytics" ? "3px solid var(--brand)" : "3px solid transparent",
            color: activeTab === "analytics" ? "var(--brand-dark)" : "var(--muted)",
            fontWeight: activeTab === "analytics" ? "750" : "500",
            fontSize: "0.92rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Revenue &amp; Costs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timings")}
          style={{
            padding: "0.65rem 0.95rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "timings" ? "3px solid var(--brand)" : "3px solid transparent",
            color: activeTab === "timings" ? "var(--brand-dark)" : "var(--muted)",
            fontWeight: activeTab === "timings" ? "750" : "500",
            fontSize: "0.92rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Kitchen &amp; Delivery Activity
        </button>
      </div>

      {/* ========================================================
          TAB 1: MENU INVENTORY & DISH DETAILS EDIT
          ======================================================== */}
      {activeTab === "inventory" && (
        <section aria-label="Menu Inventory Controls">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Dish Availability &amp; Details Management</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Edit food details, price, descriptions, or toggle Sold Out status in real-time.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDish(!showAddDish)}
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.95rem" }}
            >
              {showAddDish ? "Close Form" : "+ Add New Dish"}
            </button>
          </div>

          {/* Add New Dish Form (Collapsible) */}
          {showAddDish && (
            <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--brand)", borderRadius: "20px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 14px var(--shadow-color)" }}>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.2rem" }}>Add New Dish to Menu</h3>
              <p style={{ margin: "0 0 1.25rem", color: "var(--muted)", fontSize: "0.88rem" }}>
                Enter the dish specifics. Once saved, it immediately appears on the customer menu.
              </p>

              <form onSubmit={handleAddDish}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Dish Name *</label>
                    <input
                      type="text"
                      required
                      value={newDishName}
                      onChange={(e) => setNewDishName(e.target.value)}
                      placeholder="e.g. Bozena Shiro"
                    />
                  </div>

                  <div className="field" style={{ margin: 0 }}>
                    <label>Category *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="Traditional">Traditional Ethiopian</option>
                      <option value="Western">Western Cuisine</option>
                      <option value="Breakfast">Breakfast &amp; Bites</option>
                      <option value="Drinks">Drinks &amp; Coffee</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Price in ETB *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="e.g. 280"
                    />
                  </div>

                  <div className="field" style={{ margin: 0 }}>
                    <label>Tag / Badge</label>
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="e.g. Chef's Special, Vegan, Popular"
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: "1rem" }}>
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the flavors, preparation, and ingredients..."
                  />
                </div>

                <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input
                    id="add-spicy"
                    type="checkbox"
                    checked={newSpicy}
                    onChange={(e) => setNewSpicy(e.target.checked)}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <label htmlFor="add-spicy" style={{ cursor: "pointer", fontWeight: "600", fontSize: "0.92rem" }}>
                    Spicy Dish (Berbere / Mitmita spiced)
                  </label>
                </div>

                {/* Photo: attach, paste or drag a picture, or reuse a stock photo */}
                <ImagePicker label="Dish photo" value={newImage} onChange={setNewImage} listenToWindowPaste />
                <details style={{ marginBottom: "1.25rem" }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.88rem", color: "var(--muted)" }}>Or pick a stock photo</summary>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {GALLERY_IMAGES.map((img) => (
                      <button
                        key={img.path}
                        type="button"
                        onClick={() => setNewImage(img.path)}
                        style={{
                          border: newImage === img.path ? "3px solid var(--brand)" : "1px solid var(--border)",
                          borderRadius: "8px",
                          overflow: "hidden",
                          padding: 0,
                          cursor: "pointer",
                          background: "none",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbnailSrc(img.path, 128)} alt={img.label} style={{ width: "100%", height: "48px", objectFit: "cover", display: "block" }} />
                        <span style={{ fontSize: "0.6rem", display: "block", textAlign: "center", background: "var(--card-bg)", color: "var(--text)" }}>{img.label}</span>
                      </button>
                    ))}
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: "0.6rem 1.25rem" }}
                >
                  {isSubmitting ? "Saving..." : "Save & Add to Live Menu"}
                </button>
              </form>
            </div>
          )}

          {/* Edit Dish Modal / Drawer */}
          {editingDish && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: "1rem",
              }}
            >
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "1.75rem",
                  maxWidth: "580px",
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.3rem" }}>Edit Dish: {editingDish.name}</h3>
                  <button
                    type="button"
                    onClick={() => setEditingDish(null)}
                    className="btn-ghost"
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    x
                  </button>
                </div>

                <form onSubmit={handleEditSubmit}>
                  <div className="field">
                    <label>Dish Name</label>
                    <input
                      type="text"
                      required
                      value={editingDish.name}
                      onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="field">
                      <label>Category</label>
                      <select
                        value={editingDish.category}
                        onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                      >
                        <option value="Traditional">Traditional</option>
                        <option value="Western">Western</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Dessert">Dessert</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Price (ETB)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingDish.price}
                        onChange={(e) => setEditingDish({ ...editingDish, price: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Tag / Badge</label>
                    <input
                      type="text"
                      value={editingDish.tag || ""}
                      onChange={(e) => setEditingDish({ ...editingDish, tag: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={editingDish.description || ""}
                      onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                    />
                  </div>

                  <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <input
                      id="edit-spicy"
                      type="checkbox"
                      checked={Boolean(editingDish.spicy)}
                      onChange={(e) => setEditingDish({ ...editingDish, spicy: e.target.checked })}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <label htmlFor="edit-spicy" style={{ cursor: "pointer", fontWeight: "600" }}>
                      Spicy Dish
                    </label>
                  </div>

                  <ImagePicker
                    label="Dish photo"
                    value={editingDish.image || ""}
                    onChange={(image) => setEditingDish({ ...editingDish, image })}
                    listenToWindowPaste
                  />

                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setEditingDish(null)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Dishes List with Edit Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {dishes.map((dish) => {
              const isBusy = loadingId === dish.id;

              return (
                <div
                  key={dish.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    opacity: dish.isRemoved ? 0.6 : dish.isSoldOut ? 0.85 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                    <div className="order-item-frame" style={{ width: "56px", height: "56px", flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnailSrc(dish.image)} alt={dish.name} className="order-item-thumb" />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem 0.5rem", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.05rem" }}>{dish.name}</strong>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            background: "var(--brand-light)",
                            color: "var(--brand-dark)",
                            fontWeight: 600,
                          }}
                        >
                          {dish.category}
                        </span>
                        {dish.spicy && (
                          <span style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700 }}>
                            Spicy
                          </span>
                        )}
                        {dish.tag && (
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                            • {dish.tag}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        Price: <strong>{dish.price} ETB</strong> | {dish.ordersCount || 0} orders | {dish.reviewsCount ? `Rating ${dish.rating} / 5 (${dish.reviewsCount} reviews)` : "No reviews yet"}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit Details, Sold Out, Remove - Uniform box sizing */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setEditingDish({ ...dish })}
                      style={{
                        height: "34px",
                        padding: "0 0.85rem",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        borderRadius: "8px",
                        border: "1px solid rgba(124, 92, 255, 0.35)",
                        backgroundColor: "rgba(124, 92, 255, 0.15)",
                        color: "#c084fc",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Edit Details
                    </button>

                    {!dish.isRemoved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleSoldOut(dish.id, dish.isSoldOut)}
                          disabled={isBusy}
                          style={{
                            height: "34px",
                            padding: "0 0.85rem",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            borderRadius: "8px",
                            border: dish.isSoldOut
                              ? "1px solid rgba(22, 163, 74, 0.35)"
                              : "1px solid rgba(239, 68, 68, 0.35)",
                            backgroundColor: dish.isSoldOut
                              ? "rgba(22, 163, 74, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                            color: dish.isSoldOut ? "#22c55e" : "#f87171",
                            cursor: isBusy ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isBusy ? "Updating..." : dish.isSoldOut ? "Mark Available" : "Mark Sold Out"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveDish(dish.id, dish.name)}
                          disabled={isBusy}
                          style={{
                            height: "34px",
                            padding: "0 0.85rem",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                            color: "var(--muted)",
                            cursor: isBusy ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestoreDish(dish.id, dish.name)}
                        disabled={isBusy}
                        style={{
                          height: "34px",
                          padding: "0 0.85rem",
                          fontSize: "0.82rem",
                          fontWeight: "600",
                          borderRadius: "8px",
                          border: "1px solid var(--brand)",
                          backgroundColor: "var(--brand)",
                          color: "var(--on-brand)",
                          cursor: isBusy ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isBusy ? "Restoring..." : "Restore"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          TAB 2: FAVORITES RANKED WITH RESPECTIVE LOCATIONS
          ======================================================== */}
      {activeTab === "favorites" && (
        <section aria-label="Customer Favorites by Location">
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.3rem" }}>
              Most Ordered Food Ranked with Respective Locations
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              Analyzes real order volumes and breaks down which Addis Ababa neighborhoods order each dish the most.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1.25rem" }}>
            {rankedFavorites.map((dish, idx) => (
              <div
                key={dish.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "1.25rem",
                  boxShadow: "0 2px 8px var(--shadow-color)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: "800",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        background: idx === 0 ? "rgba(241, 196, 15, 0.2)" : "var(--brand-light)",
                        color: idx === 0 ? "#b7791f" : "var(--brand-dark)",
                      }}
                    >
                      #{idx + 1} Most Bought
                    </span>
                    <strong style={{ fontSize: "0.9rem", color: "var(--brand-dark)" }}>
                      {dish.totalUnits} Units Sold
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", marginBottom: "0.85rem" }}>
                    <div className="order-item-frame" style={{ width: "60px", height: "60px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnailSrc(dish.image || "/images/food/doro-wat.jpg")} alt={dish.name} className="order-item-thumb" />
                    </div>
                    <div>
                      <strong style={{ fontSize: "1.1rem" }}>{dish.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        {dish.price} ETB | Revenue: {dish.totalRevenue.toLocaleString()} ETB
                      </div>
                    </div>
                  </div>

                  {/* Respective Locations Breakdown */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                      Top Ordering Neighborhoods:
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {dish.topLocations?.map((loc) => (
                        <span
                          key={loc.location}
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "8px",
                            backgroundColor: "var(--brand-light)",
                            color: "var(--brand-dark)",
                            fontWeight: "600",
                          }}
                        >
                          {loc.location} (<strong>{loc.count}</strong>)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                  Total Orders: {dish.totalOrders} customer orders
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================
          TAB 3: REVENUE, RAW MATERIALS, TRANSPORT & 5-DAY LEDGER
          ======================================================== */}
      {activeTab === "analytics" && (
        <section aria-label="Revenue and Cost Ledger">
          {/* KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.1rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Total Real Revenue</span>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--brand-dark)", marginTop: "0.25rem" }}>
                {totals.revenue.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{totals.itemsSold} items sold</span>
            </div>

            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.1rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Raw Material Cost</span>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#dc2626", marginTop: "0.25rem" }}>
                -{totals.rawMaterials.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Meat, spices, ingredients</span>
            </div>

            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.1rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Transport Cost</span>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#e67e22", marginTop: "0.25rem" }}>
                -{totals.transport.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Couriers fuel &amp; delivery</span>
            </div>

            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.1rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "650" }}>Net Profit</span>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#16a34a", marginTop: "0.25rem" }}>
                +{totals.netProfit.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: "650" }}>{totals.margin}% margin</span>
            </div>
          </div>

          {/* Daily Operational Cost Entry Form */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 2px 8px var(--shadow-color)" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.2rem" }}>Insert Daily Raw Materials &amp; Transport Costs</h3>
            <p style={{ margin: "0 0 1.25rem", color: "var(--muted)", fontSize: "0.88rem" }}>
              Register today&apos;s or past expenses to keep the restaurant profit ledger accurate.
            </p>

            <form onSubmit={handleAddExpense} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Date *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  max={new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)}
                  onChange={(e) => pickExpenseDate(e.target.value)}
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Raw Materials (ETB) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="no-spinner"
                  min="0"
                  required
                  value={expenseRaw}
                  onChange={(e) => setExpenseRaw(e.target.value)}
                  placeholder="e.g. 3850"
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Transport &amp; Fuel (ETB) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="no-spinner"
                  min="0"
                  required
                  value={expenseTransport}
                  onChange={(e) => setExpenseTransport(e.target.value)}
                  placeholder="e.g. 750"
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Notes / Supplies</label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="e.g. Merkato berbere &amp; Debre Zeyit chicken"
                />
              </div>

              {editingRecordedDay && (
                <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <label>Reason for changing {expenseDate} *</label>
                  <input
                    type="text"
                    required
                    value={expenseReason}
                    onChange={(e) => setExpenseReason(e.target.value)}
                    placeholder="e.g. Forgot the fuel receipt, supplier invoice corrected"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingExpense}
                className="btn-primary"
                style={{ padding: "0.7rem 1.2rem", height: "42px" }}
              >
                {isSavingExpense ? "Saving..." : editingRecordedDay ? "Save changes" : "Save Daily Costs"}
              </button>
              {expenseError && <p className="field-error" role="alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{expenseError}</p>}
              {editingRecordedDay && (
                <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                  Costs for this day are already recorded. The current values are loaded above; the old values and your reason are kept in the ledger.
                </p>
              )}
            </form>
          </div>

          {/* Financial Ledger Table (5-Day / Full Archive Toggle) */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 8px var(--shadow-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {showAllHistory ? `Full Historical Ledger (${ledger.length} Days)` : "Recent 5-Day Income & Expense Ledger"}
                </h3>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  Daily breakdown of real sales revenue, raw material costs, and delivery transport.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.45rem 0.95rem" }}
              >
                {showAllHistory ? "Switch to 5-Day View" : `View Complete History (${ledger.length} Days)`}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--muted)" }}>
                    <th style={{ padding: "0.75rem" }}>Date</th>
                    <th style={{ padding: "0.75rem" }}>Orders</th>
                    <th style={{ padding: "0.75rem" }}>Revenue</th>
                    <th style={{ padding: "0.75rem" }}>Raw Materials</th>
                    <th style={{ padding: "0.75rem" }}>Transport</th>
                    <th style={{ padding: "0.75rem" }}>Total Expenses</th>
                    <th style={{ padding: "0.75rem" }}>Net Profit</th>
                    <th style={{ padding: "0.75rem" }}>Margin</th>
                    <th style={{ padding: "0.75rem" }}>Notes &amp; changes</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllHistory ? ledger : recent5Days).map((row) => (
                    <tr key={row.date} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem", fontWeight: "700" }}>{row.date}</td>
                      <td style={{ padding: "0.75rem" }}>{row.ordersCount}</td>
                      <td style={{ padding: "0.75rem", fontWeight: "750", color: "var(--brand-dark)" }}>
                        {row.revenue.toLocaleString()} ETB
                      </td>
                      <td style={{ padding: "0.75rem", color: "#dc2626" }}>-{row.rawMaterials.toLocaleString()} ETB</td>
                      <td style={{ padding: "0.75rem", color: "#e67e22" }}>-{row.transport.toLocaleString()} ETB</td>
                      <td style={{ padding: "0.75rem", fontWeight: "650", color: "#dc2626" }}>-{row.totalExpenses.toLocaleString()} ETB</td>
                      <td style={{ padding: "0.75rem", fontWeight: "800", color: row.netProfit < 0 ? "#dc2626" : "#16a34a" }}>
                        {row.netProfit < 0 ? "-" : "+"}{Math.abs(row.netProfit).toLocaleString()} ETB
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: "700" }}>{row.margin}%</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.82rem", color: "var(--muted)", minWidth: "220px" }}>
                        {!row.costsRecorded && <span>No costs entered</span>}
                        {row.note && <div>{row.note}</div>}
                        {row.history.length > 0 && (
                          <details className="ledger-history">
                            <summary>Edited {row.history.length}x, last by {row.updatedBy || "admin"}</summary>
                            <ul>
                              {[...row.history].reverse().map((change, index) => (
                                <li key={index}>
                                  <strong>{new Date(change.replacedAt).toLocaleString()}</strong> by {change.replacedBy}: &quot;{change.reason}&quot;
                                  <br />
                                  Was raw {Number(change.rawMaterials).toLocaleString()} ETB, transport {Number(change.transport).toLocaleString()} ETB
                                  {change.note ? ` (${change.note})` : ""}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Watch the Whole History Link */}
            <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
              <Link
                href="/admin/finances"
                className="btn-primary"
                style={{ display: "inline-block", padding: "0.75rem 1.75rem", fontSize: "0.98rem" }}
              >
                Watch the whole history : Dedicated Financial History Page
              </Link>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                Access the dedicated archive page with all registered historical records.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          TAB 4: KITCHEN & DELIVERY ACTIVITY & ORDER TIMINGS
          ======================================================== */}
      {activeTab === "timings" && (
        <section aria-label="Kitchen and Delivery Operations Tracking">
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.3rem" }}>
              Kitchen &amp; Delivery Activity Monitoring
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              Real-time monitoring of kitchen cooking operations, courier delivery transit, and full order timing performance.
            </p>
          </div>

          {/* Dual Operations Overview: Kitchen Activity vs Delivery Activity */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.25rem",
              marginBottom: "1.75rem",
            }}
          >
            {/* Kitchen Activity Panel */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1.5px solid #e67e22",
                borderRadius: "18px",
                padding: "1.25rem",
                boxShadow: "0 2px 8px var(--shadow-color)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#e67e22" }}>
                  Kitchen Activity
                </h3>
                <Link
                  href="/kitchen"
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                >
                  Open Kitchen Panel &gt;
                </Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "var(--brand-light)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", display: "block" }}>
                    Placed (In Queue)
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--brand-dark)" }}>
                    {orders.filter((o) => o.status === "placed").length} Orders
                  </strong>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.12)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#d97706", textTransform: "uppercase", display: "block" }}>
                    Cooking in Kitchen
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "#d97706" }}>
                    {orders.filter((o) => o.status === "preparing").length} Dishes
                  </strong>
                </div>

                <div style={{ background: "rgba(34, 197, 94, 0.12)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#16a34a", textTransform: "uppercase", display: "block" }}>
                    Kitchen Served
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "#16a34a" }}>
                    {orders.filter((o) => o.status === "served").length} Served
                  </strong>
                </div>

                <div style={{ background: "var(--brand-light)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", display: "block" }}>
                    Average Cook Time
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--text)" }}>
                    17 mins
                  </strong>
                </div>
              </div>
            </div>

            {/* Delivery Activity Panel */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1.5px solid #2563eb",
                borderRadius: "18px",
                padding: "1.25rem",
                boxShadow: "0 2px 8px var(--shadow-color)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#2563eb" }}>
                  Delivery Activity
                </h3>
                <Link
                  href="/delivery"
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                >
                  Open Delivery Panel &gt;
                </Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "rgba(230, 126, 34, 0.12)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#e67e22", textTransform: "uppercase", display: "block" }}>
                    Ready for Courier
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "#e67e22" }}>
                    {orders.filter((o) => o.status === "served").length} Pickups
                  </strong>
                </div>

                <div style={{ background: "rgba(37, 99, 235, 0.12)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#2563eb", textTransform: "uppercase", display: "block" }}>
                    Couriers In Transit
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "#2563eb" }}>
                    {orders.filter((o) => o.status === "on-the-way").length} Driving
                  </strong>
                </div>

                <div style={{ background: "rgba(34, 197, 94, 0.12)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#16a34a", textTransform: "uppercase", display: "block" }}>
                    Delivered to Door
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "#16a34a" }}>
                    {orders.filter((o) => o.status === "delivered").length} Done
                  </strong>
                </div>

                <div style={{ background: "var(--brand-light)", padding: "0.65rem 0.85rem", borderRadius: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", display: "block" }}>
                    Average Delivery Time
                  </span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--text)" }}>
                    20 mins
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {orders.map((order) => {
              const placedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const kitchenPrep = order.kitchenDurationMinutes ? `${order.kitchenDurationMinutes} mins` : order.status === "preparing" ? "Cooking now..." : "In Queue";
              const courierTransit = order.deliveryDurationMinutes ? `${order.deliveryDurationMinutes} mins` : order.status === "on-the-way" ? "Driving now..." : order.status === "served" ? "Ready for pickup" : "Waiting for kitchen";
              const customerReceived = order.receivedAt
                ? new Date(order.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : order.status === "delivered"
                ? "Awaiting confirmation"
                : "In transit";
              const totalDoor = order.totalDoorToDoorMinutes
                ? `${order.totalDoorToDoorMinutes} mins door-to-door`
                : order.totalDurationMinutes
                ? `${order.totalDurationMinutes} mins total`
                : "In Progress";
              const foodCost = order.foodTotal || (order.total - (order.deliveryFee || 50));
              const deliveryCost = order.deliveryFee || 50;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "18px",
                    padding: "1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                      <strong style={{ fontSize: "1.1rem" }}>Order #{order.id}</strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "750",
                          textTransform: "uppercase",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          background: order.status === "delivered" ? "rgba(34, 197, 94, 0.15)" : order.status === "served" ? "rgba(230, 126, 34, 0.15)" : "var(--brand-light)",
                          color: order.status === "delivered" ? "#16a34a" : order.status === "served" ? "#e67e22" : "var(--brand-dark)",
                        }}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                      Customer: <strong>{order.name}</strong> ({order.phone}) | Destination: <strong>{order.location}</strong>
                      {order.courierName && <span> | Courier: <strong>{order.courierName}</strong></span>}
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      Food: {foodCost} ETB | Delivery: {deliveryCost} ETB | Total: <strong>{order.total} ETB</strong>
                    </div>

                    {order.adminEdited && (
                      <div
                        style={{
                          background: "rgba(124, 92, 255, 0.12)",
                          border: "1px solid rgba(124, 92, 255, 0.3)",
                          borderRadius: "10px",
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.82rem",
                          color: "var(--brand-dark)",
                          marginTop: "0.45rem",
                        }}
                      >
                        <strong>Admin Edited:</strong> Management updated order for {order.name} ({order.adminEditedBy || "Admin"} at {new Date(order.adminEditedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}): {order.adminEditNote}
                      </div>
                    )}
                  </div>

                  {/* Timings Audit & Admin Edit button */}
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center", background: "var(--brand-light)", padding: "0.45rem 0.75rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block", textTransform: "uppercase", fontWeight: "700" }}>
                        1. Placed At
                      </span>
                      <strong style={{ fontSize: "0.92rem" }}>{placedTime}</strong>
                    </div>

                    <div style={{ textAlign: "center", background: "rgba(230, 126, 34, 0.1)", padding: "0.45rem 0.75rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#e67e22", display: "block", textTransform: "uppercase", fontWeight: "700" }}>
                        2. Kitchen Prep
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "#e67e22" }}>{kitchenPrep}</strong>
                    </div>

                    <div style={{ textAlign: "center", background: "rgba(37, 99, 235, 0.1)", padding: "0.45rem 0.75rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#2563eb", display: "block", textTransform: "uppercase", fontWeight: "700" }}>
                        3. Courier Delivery
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "#2563eb" }}>{courierTransit}</strong>
                    </div>

                    <div style={{ textAlign: "center", background: "rgba(34, 197, 94, 0.1)", padding: "0.45rem 0.75rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#16a34a", display: "block", textTransform: "uppercase", fontWeight: "700" }}>
                        4. Customer Received
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "#16a34a" }}>{customerReceived}</strong>
                    </div>

                    <div style={{ textAlign: "right", minWidth: "90px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>Door-to-Door</span>
                      <strong style={{ fontSize: "1rem", color: order.status === "delivered" ? "#16a34a" : "var(--brand-dark)" }}>
                        {totalDoor}
                      </strong>
                    </div>

                    <Link
                      href={`/track/${encodeURIComponent(String(order.id))}`}
                      style={{
                        height: "34px",
                        padding: "0 0.85rem",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        borderRadius: "8px",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        backgroundColor: "rgba(34, 197, 94, 0.12)",
                        color: "#4ade80",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      View Map
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrder(order);
                        setEditOrderPhone(order.phone || "");
                        setEditOrderLocation(order.location || "Bole");
                        setEditOrderNote(order.adminEditNote || "Customer requested contact or destination adjustment");
                      }}
                      style={{
                        height: "34px",
                        padding: "0 0.85rem",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        borderRadius: "8px",
                        border: "1px solid rgba(124, 92, 255, 0.35)",
                        backgroundColor: "rgba(124, 92, 255, 0.15)",
                        color: "#c084fc",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Edit Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Admin Edit Order Modal */}
      {editingOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "1.75rem",
              maxWidth: "520px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Edit Order #{editingOrder.id} for {editingOrder.name}</h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="btn-ghost"
                style={{ padding: "0.3rem 0.6rem" }}
              >
                x
              </button>
            </div>

            <form onSubmit={handleAdminEditOrder}>
              <div className="field">
                <label>Customer Name</label>
                <input type="text" disabled value={editingOrder.name} style={{ opacity: 0.7 }} />
              </div>

              <div className="field">
                <label>Customer Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={editOrderPhone}
                  onChange={(e) => setEditOrderPhone(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Delivery Neighborhood Location *</label>
                <select
                  value={editOrderLocation}
                  onChange={(e) => setEditOrderLocation(e.target.value)}
                >
                  {DELIVERY_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} (+{loc.fee} ETB delivery) : {loc.driveTime}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Admin Update Reason / Note</label>
                <input
                  type="text"
                  required
                  value={editOrderNote}
                  onChange={(e) => setEditOrderNote(e.target.value)}
                  placeholder="e.g. Customer called to change drop-off landmark"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrder}
                  className="btn-primary"
                >
                  {isSavingOrder ? "Saving..." : "Save Order Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
