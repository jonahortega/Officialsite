import React, { useCallback, memo, useMemo } from 'react';
import './Navigation.css';
import {
  Home,
  Search,
  MapPin,
  Ticket,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { screen: 'home', Icon: Home },
  { screen: 'search', Icon: Search },
  { screen: 'map', Icon: MapPin },
  { screen: 'tickets', Icon: Ticket },
  { screen: 'profile', Icon: User },
];

function Navigation({ currentScreen, onNavigate }) {
  const handleNavClick = useCallback(
    (screen) => {
      if (!screen || screen === currentScreen) return;
      if (screen && onNavigate) onNavigate(screen);
    },
    [currentScreen, onNavigate]
  );

  const items = useMemo(
    () =>
      NAV_ITEMS.map(({ screen, Icon }) => ({
        screen,
        Icon,
        active: currentScreen === screen,
      })),
    [currentScreen]
  );

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        <ul className="bottom-nav-list">
          {items.map(({ screen, Icon, active }) => (
            <li key={screen} className="bottom-nav-item">
              <button
                type="button"
                onClick={() => handleNavClick(screen)}
                className={`bottom-nav-button ${active ? 'active' : ''}`}
              >
                <span className={`bottom-nav-icon ${active ? 'active' : ''}`}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default memo(Navigation);
