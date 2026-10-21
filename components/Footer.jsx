import Link from "next/link";

const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Bole+Road%2C+Addis+Ababa%2C+Ethiopia";

// Small line icons that take the link's colour (purple on phones).
function Icon({ name }) {
  const paths = {
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  };
  return (
    <svg className="footer-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="footer-col footer-col--brand">
          <p className="footer-brand">Addis Eats</p>
          <p className="empty">Ethiopian food, cooked slow and ordered online.</p>
        </div>

        <div className="footer-col footer-col--visit">
          <p className="footer-col__title">Contact us</p>
          <div className="footer-contact">
            <a href="tel:+251110000000" className="footer-contact__item">
              <span className="footer-contact__label"><Icon name="phone" /> Call us</span>
              <span>+251 11 000 0000</span>
            </a>
            <a href="mailto:hello@addiseats.et" className="footer-contact__item">
              <span className="footer-contact__label"><Icon name="mail" /> Email us</span>
              <span>hello@addiseats.et</span>
            </a>
          </div>
          <p>
            <a href={MAP_URL} target="_blank" rel="noreferrer" className="footer-address">
              <Icon name="location" /> Bole Road, Addis Ababa, Ethiopia
            </a>
          </p>
        </div>

        <div className="footer-col footer-col--explore">
          <p className="footer-col__title">Explore</p>
          {/* Menu, Favorites and Orders are already in the phone tab bar. */}
          <p className="footer-link--tabbar"><Link href="/menu">Menu</Link></p>
          <p><Link href="/track">Live Courier Map</Link></p>
          <p className="footer-link--tabbar"><Link href="/favorites">Favorites</Link></p>
          <p className="footer-link--tabbar"><Link href="/orders">Order History</Link></p>
          <p><Link href="/profile">Your profile</Link></p>
        </div>

        <div className="footer-col footer-col--legal">
          <p className="footer-col__title">Legal</p>
          <p><Link href="/privacy">Privacy policy</Link></p>
          <p><Link href="/terms">Terms of service</Link></p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {year} Addis Eats. All rights reserved.</p>
      </div>
    </footer>
  );
}
