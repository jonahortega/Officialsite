import React from 'react';
import './DarkModeToggle.css';

const DarkModeToggle = ({ isDarkMode, onToggle }) => {
  return (
    <div className="dark-mode-toggle">
      <button 
        className={`toggle-button ${isDarkMode ? 'dark' : 'light'}`}
        onClick={onToggle}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="toggle-icon">
          {isDarkMode ? '☀️' : '🌙'}
        </span>
      </button>
    </div>
  );
};

export default DarkModeToggle; 