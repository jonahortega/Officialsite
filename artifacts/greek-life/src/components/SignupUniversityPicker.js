import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { SIGNUP_UNIVERSITIES } from '../constants/signupUniversities';

/**
 * Custom school picker: menu is portaled to document.body so it always stacks
 * above sibling form rows (animated transform siblings otherwise paint on top).
 */
export default function SignupUniversityPicker({
  id = 'university',
  name = 'university',
  value,
  onChange,
  onBlurField,
  invalid = false,
  disabled = false,
  size = 'md',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const valueRef = useRef(value);
  const blurFieldRef = useRef(onBlurField);
  const [menuBox, setMenuBox] = useState(null);
  valueRef.current = value;
  blurFieldRef.current = onBlurField;

  const fontSize = size === 'lg' ? '1rem' : '0.875rem';
  const subSize = size === 'lg' ? '0.8125rem' : '0.75rem';
  const triggerPad = size === 'lg' ? '0.875rem 2.25rem 0.875rem 2.75rem' : '0.75rem 2.25rem 0.75rem 2.5rem';
  const mapLeft = size === 'lg' ? '0.875rem' : '0.75rem';
  const borderColor = invalid ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
  const selected = SIGNUP_UNIVERSITIES.find((u) => u.name === value);

  const syncMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuBox({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, 200),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null);
      return undefined;
    }
    syncMenuPosition();
    const onResizeOrScroll = () => syncMenuPosition();
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouse = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      blurFieldRef.current?.({ target: { name, value: valueRef.current } });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        blurFieldRef.current?.({ target: { name, value: valueRef.current } });
      }
    };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, name]);

  const pick = (uni) => {
    onChange(uni.name);
    valueRef.current = uni.name;
    setOpen(false);
    blurFieldRef.current?.({ target: { name, value: uni.name } });
  };

  const menuPanel = open && menuBox && (
    <ul
      ref={menuRef}
      role="listbox"
      aria-labelledby={id}
      className="signup-uni-picker-menu-portal"
      style={{
        position: 'fixed',
        top: menuBox.top,
        left: menuBox.left,
        width: menuBox.width,
        zIndex: 2147483646,
        margin: 0,
        padding: '6px',
        listStyle: 'none',
        borderRadius: '0.5rem',
        border: '1px solid rgb(167, 139, 250)',
        backgroundColor: 'rgb(28, 24, 52)',
        boxShadow:
          '0 22px 56px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {SIGNUP_UNIVERSITIES.map((uni) => {
        const isSel = uni.name === value;
        return (
          <li key={uni.id} role="presentation">
            <button
              type="button"
              className="signup-uni-picker-option"
              role="option"
              aria-selected={isSel}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(uni)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: size === 'lg' ? '12px 12px' : '10px 11px',
                margin: 0,
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: isSel ? 'rgb(67, 48, 120)' : 'rgb(36, 31, 65)',
                color: '#faf5ff',
                borderLeft: isSel ? '3px solid #ddd6fe' : '3px solid transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: '1.35rem',
                  height: '1.35rem',
                  borderRadius: '9999px',
                  border: isSel ? '2px solid #ddd6fe' : '2px solid rgba(255,255,255,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSel ? 'rgb(109, 71, 180)' : 'rgb(45, 39, 78)',
                }}
              >
                {isSel ? (
                  <Check style={{ width: '0.7rem', height: '0.7rem', color: '#ede9fe' }} strokeWidth={3} />
                ) : null}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize,
                    fontWeight: 600,
                    color: '#faf5ff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {uni.name}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: '0.0625rem',
                    fontSize: subSize,
                    color: 'rgb(216, 196, 255)',
                  }}
                >
                  {uni.campus}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className="signup-uni-picker-root" style={{ position: 'relative' }}>
      <MapPin
        style={{
          position: 'absolute',
          left: mapLeft,
          top: '50%',
          transform: 'translateY(-50%)',
          height: '1.25rem',
          width: '1.25rem',
          color: 'rgb(196, 181, 253)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="signup-uni-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: triggerPad,
          borderRadius: '0.5rem',
          border: `1px solid ${open ? 'rgba(167, 139, 250, 0.55)' : borderColor}`,
          background: 'rgba(255, 255, 255, 0.14)',
          color: 'white',
          fontSize,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(168, 85, 247, 0.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
        }}
        onFocus={(e) => {
          if (!open) {
            e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
            e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
          }
        }}
        onBlur={(e) => {
          if (!open) {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = 'none';
          }
        }}
      >
        <span style={{ display: 'block', paddingRight: '0.25rem' }}>
          {selected ? (
            <>
              <span style={{ fontWeight: 600, color: '#faf5ff', letterSpacing: '-0.01em' }}>{selected.name}</span>
              <span
                style={{
                  display: 'block',
                  marginTop: '0.125rem',
                  fontSize: subSize,
                  color: 'rgba(244, 232, 255, 0.55)',
                  fontWeight: 400,
                }}
              >
                {selected.campus}
              </span>
            </>
          ) : (
            <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Choose your school</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          style={{
            position: 'absolute',
            right: size === 'lg' ? '0.875rem' : '0.75rem',
            top: '50%',
            width: '1.125rem',
            height: '1.125rem',
            color: 'rgb(196, 181, 253)',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform 0.22s ease',
            pointerEvents: 'none',
          }}
        />
      </button>

      {typeof document !== 'undefined' && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
