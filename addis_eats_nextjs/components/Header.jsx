"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthStatus } from "@/components/AuthStatus";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const [role, setRole] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data?.user) {
          setRole(data.user.role);
        } else {
          setRole(null);
        }
      })
      .catch(() => {
        if (active) setRole(null);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const isActive = (path) => {
    if (!pathname) return false;
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isDelivery = role === "delivery";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Addis Eats Traditional & Western">
          <span className="brand-logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">Addis Eats</span>
            <span className="brand-sub">Traditional & Western</span>
          </span>
        </Link>

        <nav aria-label="Main Navigation" className="site-header__nav">
          <Link href="/menu" className={`nav-link ${isActive("/menu") ? "nav-link--active" : ""}`}>
            Menu
          </Link>

          {isAdmin ? (
            /* Admin Only Navigation: Admin can access Kitchen, Delivery, and Admin Panel */
            <>
              <Link href="/kitchen" className={`nav-link ${isActive("/kitchen") ? "nav-link--active" : ""}`}>
                Kitchen
              </Link>
              <Link href="/delivery" className={`nav-link ${isActive("/delivery") ? "nav-link--active" : ""}`}>
                Delivery
              </Link>
              <Link href="/admin" className={`nav-link ${isActive("/admin") ? "nav-link--active" : ""}`}>
                Admin Panel
              </Link>
            </>
          ) : isDelivery ? (
            /* Delivery Courier Navigation: strictly their own Delivery Panel */
            <>
              <Link href="/delivery" className={`nav-link ${isActive("/delivery") ? "nav-link--active" : ""}`}>
                Delivery
              </Link>
            </>
          ) : isStaff ? (
            /* Kitchen Staff Navigation: strictly their own Kitchen Panel */
            <>
              <Link href="/kitchen" className={`nav-link ${isActive("/kitchen") ? "nav-link--active" : ""}`}>
                Kitchen
              </Link>
            </>
          ) : (
            /* Regular Customer Navigation */
            <>
              <Link href="/orders" className={`nav-link ${isActive("/orders") ? "nav-link--active" : ""}`}>
                Orders
              </Link>
              <Link href="/favorites" className={`nav-link ${isActive("/favorites") ? "nav-link--active" : ""}`}>
                Favorites
              </Link>
              <Link href="/cart" className={`nav-link nav-link--cart ${isActive("/cart") ? "nav-link--active" : ""}`}>
                <span>Cart</span>
                <span className="nav-cart-indicator">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </span>
              </Link>
            </>
          )}
        </nav>

        <div className="site-header__actions">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}

export default Header;
