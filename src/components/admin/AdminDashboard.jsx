import { useCallback, useEffect, useState } from 'react'
import { biologyChapters } from '../../data/biologyData.js'
import { getAdminChapters, getAdminIdentityStatus, getHiddenChapterIds, hideChapter } from '../../lib/adminContent.js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.js'
import AdminChapterForm from './AdminChapterForm.jsx'
import AdminChapterList from './AdminChapterList.jsx'
import { Brand } from '../SiteHeader.jsx'

function combineChapters(storedChapters) {
  const chapterMap = new Map(biologyChapters.map((chapter) => [chapter.id, chapter]))
  storedChapters.forEach((chapter) => {
    chapterMap.set(chapter.id, chapter)
  })
  return [...chapterMap.values()].sort((left, right) =>
    left.class - right.class || left.chapterNumber - right.chapterNumber,
  )
}

function AdminDashboard() {
  const [access, setAccess] = useState('checking')
  const [chapters, setChapters] = useState(biologyChapters)
  const [hiddenIds, setHiddenIds] = useState([])
  const [activeView, setActiveView] = useState('manage')
  const [editingChapter, setEditingChapter] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [notice, setNotice] = useState('')
  const [identityStatus, setIdentityStatus] = useState(null)

  const refreshChapters = useCallback(async () => {
    const [storedChapters, hiddenChapterIds] = await Promise.all([
      getAdminChapters(),
      getHiddenChapterIds(),
    ])
    setChapters(combineChapters(storedChapters))
    setHiddenIds(hiddenChapterIds)
  }, [])

  useEffect(() => {
    let active = true
    async function checkAccess() {
      if (!isSupabaseConfigured || !supabase) {
        window.location.replace('/admin/login')
        return
      }
      const status = await getAdminIdentityStatus()
      if (!active) return
      setIdentityStatus(status)
      if (!status.sessionExists || !status.userId) {
        window.location.replace('/admin/login')
        return
      }
      if (!status.isAdmin) {
        setLoadError('This account is not authorized to manage Conceptra content.')
        setAccess('denied')
        return
      }
      const [storedChapters, hiddenChapterIds] = await Promise.all([
        getAdminChapters(),
        getHiddenChapterIds(),
      ])
      if (!active) return
      setChapters(combineChapters(storedChapters))
      setHiddenIds(hiddenChapterIds)
      setAccess('allowed')
    }
    checkAccess().catch((error) => {
      if (active) {
        setLoadError(error.message || 'Unable to verify administrator access.')
        setAccess('error')
      }
    })
    return () => { active = false }
  }, [])

  async function handleSaved() {
    await refreshChapters()
    setEditingChapter(null)
    setActiveView('manage')
    setNotice('Chapter saved and published.')
    setLoadError('')
  }

  async function handleDelete(chapter) {
    if (!window.confirm(`Hide "${chapter.title}" from the student website? It can be restored by editing and publishing it again.`)) return
    setDeletingId(chapter.id)
    setLoadError('')
    setNotice('')
    try {
      await hideChapter(chapter.id)
      await refreshChapters()
      setNotice(`"${chapter.title}" is now hidden from students.`)
    } catch (error) {
      setLoadError(`Unable to hide chapter: ${error.message}`)
    } finally {
      setDeletingId('')
    }
  }

  async function handleLogout() {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLoadError(`Unable to log out: ${error.message}`)
        return
      }
      window.location.replace('/admin/login')
    } catch (error) {
      setLoadError(`Unable to log out: ${error.message || 'Please try again.'}`)
    }
  }

  if (access === 'checking') {
    return <main className="admin-loading">Verifying secure admin access…</main>
  }
  if (access !== 'allowed') {
    return (
      <main className="admin-login-page">
        <div className="admin-login-card">
          <Brand />
          <h1>Admin access unavailable</h1>
          <p className="admin-error" role="alert">{loadError || 'Administrator access could not be verified.'}</p>
          {identityStatus && <IdentityDiagnostic status={identityStatus} />}
          <a className="admin-button admin-button-primary" href="/admin/login">Back to Admin Login</a>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-topbar">
          <Brand />
          <div className="admin-topbar-actions">
            <a className="admin-button admin-button-quiet" href="/" target="_blank" rel="noreferrer">View student site</a>
            <button className="admin-button admin-button-secondary" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <section className="admin-page-heading">
          <span className="admin-field-eyebrow">CONTENT MANAGEMENT</span>
          <h1>Conceptra Admin</h1>
          <p>Manage Class 11 and Class 12 Biology chapters, notes, videos and NEET PYQs.</p>
        </section>
        {identityStatus && <IdentityDiagnostic status={identityStatus} />}
        <nav className="admin-tabs" aria-label="Admin sections">
          <button className={activeView === 'manage' && !editingChapter ? 'admin-tab admin-tab-active' : 'admin-tab'} type="button" onClick={() => { setEditingChapter(null); setActiveView('manage') }}>Manage Chapters</button>
          <button className={activeView === 'add' ? 'admin-tab admin-tab-active' : 'admin-tab'} type="button" onClick={() => { setEditingChapter(null); setActiveView('add') }}>Add Chapter</button>
        </nav>
        {loadError && <div className="admin-error-banner" role="alert">{loadError}</div>}
        {notice && <div className="admin-success-banner" role="status">{notice}</div>}
        {editingChapter || activeView === 'add' ? (
          <AdminChapterForm
            chapter={editingChapter}
            chapters={chapters}
            onSaved={handleSaved}
            onIdentityStatus={setIdentityStatus}
            onCancel={editingChapter ? () => setEditingChapter(null) : undefined}
          />
        ) : (
          <AdminChapterList
            chapters={chapters}
            hiddenIds={hiddenIds}
            deletingId={deletingId}
            onEdit={(chapter) => setEditingChapter(chapter)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  )
}

function IdentityDiagnostic({ status }) {
  return (
    <section className="admin-identity-diagnostic" aria-label="Authentication diagnostic">
      <div><span>Authenticated user UUID</span><strong>{status.userId || 'Not available'}</strong></div>
      <div><span>Session exists</span><strong>{status.sessionExists ? 'Yes' : 'No'}</strong></div>
      <div><span>UUID is in admin_users</span><strong>{status.isAdmin ? 'Yes' : 'No'}</strong></div>
    </section>
  )
}

export default AdminDashboard
