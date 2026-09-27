import { Brand } from './SiteHeader.jsx'

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-about">
          <Brand light />
          <p>Learn Biology. Understand Concepts.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/">Home</a>
          <a href="/class-11">Class 11</a>
          <a href="/class-12">Class 12</a>
        </nav>
        <div className="footer-meta">
          <a className="admin-login-link" href="/admin/login">Admin Login</a>
          <p className="copyright">© 2026 Conceptra</p>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
