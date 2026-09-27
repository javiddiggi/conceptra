import { useState } from 'react'

function Brand({ light = false }) {
  return (
    <a className={`brand${light ? ' brand-light' : ''}`} href="/" aria-label="Conceptra home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M16 4.5v23M7.5 10.5c4.3 0 7 2 8.5 5.5-1.5 3.5-4.2 5.5-8.5 5.5M24.5 10.5c-4.3 0-7 2-8.5 5.5 1.5 3.5 4.2 5.5 8.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>conceptra</span>
    </a>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = window.location.pathname

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
        </button>
        <nav className={`main-nav${menuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
          <a className={pathname === '/' ? 'nav-active' : ''} aria-current={pathname === '/' ? 'page' : undefined} href="/" onClick={() => setMenuOpen(false)}>Home</a>
          <a className={pathname.startsWith('/class-11') ? 'nav-active' : ''} aria-current={pathname.startsWith('/class-11') ? 'page' : undefined} href="/class-11" onClick={() => setMenuOpen(false)}>Class 11</a>
          <a className={pathname.startsWith('/class-12') ? 'nav-active' : ''} aria-current={pathname.startsWith('/class-12') ? 'page' : undefined} href="/class-12" onClick={() => setMenuOpen(false)}>Class 12</a>
          <a className={`nav-search${pathname === '/search' ? ' nav-active' : ''}`} aria-current={pathname === '/search' ? 'page' : undefined} href="/search" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.7" />
              <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Search
          </a>
        </nav>
      </div>
    </header>
  )
}

export { Brand }
export default SiteHeader
