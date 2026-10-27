import { Link, useLocation } from 'react-router-dom';
import './Nav.css';

export default function Nav() {
  const location = useLocation();

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand">
          <span className="nav__wordmark">Verity</span>
          <span className="nav__tagline">Verify before you buy</span>
        </Link>
        <ul className="nav__links">
          <li>
            <Link
              to="/"
              className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}
            >
              Search
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              className={`nav__link ${location.pathname === '/about' ? 'nav__link--active' : ''}`}
            >
              Methodology
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
