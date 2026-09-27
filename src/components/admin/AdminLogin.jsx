import { useState } from 'react'
import { supabase, supabaseConfigurationError } from '../../lib/supabase.js'
import { Brand } from '../SiteHeader.jsx'

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!supabase) {
      setError(`Authentication is unavailable. ${supabaseConfigurationError} Restart the dev server after updating the file.`)
      return
    }

    setSubmitting(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
        return
      }
      window.location.replace('/admin')
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <Brand />
        <div className="admin-login-heading">
          <span className="admin-field-eyebrow">CONCEPTRA CONTENT MANAGEMENT</span>
          <h1>Admin Login</h1>
          <p>Sign in with your authorized Conceptra owner account.</p>
        </div>
        {!supabase && (
          <div className="admin-notice" role="status">
            Authentication is not configured. {supabaseConfigurationError} Update <code>.env.local</code> and restart the dev server to enable secure login.
          </div>
        )}
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="admin-button admin-button-primary" type="submit" disabled={!supabase || submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <a className="admin-back-link" href="/">Back to Conceptra</a>
      </div>
    </main>
  )
}

export default AdminLogin
