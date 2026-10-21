import Link from "next/link";

const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Bole+Road%2C+Addis+Ababa%2C+Ethiopia";

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
              <span className="footer-contact__label">Call us</span>
              <span>+251 11 000 0000</span>
            </a>
            <a href="mailto:hello@addiseats.et" className="footer-contact__item">
              <span className="footer-contact__label">Email us</span>
              <span>hello@addiseats.et</span>
            </a>
          </div>
          <p>
            <a href={MAP_URL} target="_blank" rel="noreferrer" className="footer-address">
              Bole Road, Addis Ababa, Ethiopia
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
