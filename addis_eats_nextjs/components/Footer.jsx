import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="footer-col footer-col--brand">
          <p className="footer-brand">Addis Eats</p>
          <p className="empty">Ethiopian food, cooked slow and ordered online.</p>
          <div className="footer-social" aria-label="Social media">
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M4 4l16 16M20 4L4 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M14 8.5h2V5.6h-2c-2 0-3.5 1.6-3.5 3.6v1.8H8.5v2.6H10.5V19h2.7v-5.4h2l.4-2.6h-2.4V9.2c0-.5.3-.7.8-.7z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <p className="footer-col__title">Contact us</p>
          <p><a href="mailto:hello@addiseats.et">hello@addiseats.et</a></p>
          <p><a href="tel:+251110000000">+251 11 000 0000</a></p>
          <p className="empty">Bole Road, Addis Ababa, Ethiopia</p>
        </div>

        <div className="footer-col">
          <p className="footer-col__title">Explore</p>
          <p><Link href="/menu">Menu</Link></p>
          <p><Link href="/favorites">Favorites</Link></p>
          <p><Link href="/profile">Your profile</Link></p>
        </div>

        <div className="footer-col">
          <p className="footer-col__title">Legal</p>
          <p><Link href="/privacy">Privacy policy</Link></p>
          <p><Link href="/terms">Terms of service</Link></p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {year} Addis Eats. All rights reserved.</p>
        <p className="empty">A CodeOps Day 40 foundations project.</p>
      </div>
    </footer>
  );
}
