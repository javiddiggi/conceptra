function AdminChapterList({ chapters, hiddenIds, onEdit, onDelete, deletingId }) {
  return (
    <section className="admin-content-card">
      <div className="admin-card-heading">
        <div>
          <span className="admin-field-eyebrow">BIOLOGY CONTENT</span>
          <h2>Manage Chapters</h2>
          <p>Review existing NCERT chapters and manage published content.</p>
        </div>
        <span className="admin-count">{chapters.length} chapters</span>
      </div>
      {chapters.length ? (
        <div className="admin-table-scroll">
          <table className="admin-chapter-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Chapter</th>
                <th>YouTube</th>
                <th>Notes</th>
                <th>NEET PYQs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((chapter) => {
                const isHidden = hiddenIds.includes(chapter.id) || chapter.isPublished === false
                return (
                  <tr key={chapter.id}>
                    <td>Class {chapter.class}</td>
                    <td>
                      <div className="admin-table-chapter">
                        <strong>{chapter.chapterNumber}. {chapter.title}</strong>
                        {!isHidden && <span className="admin-published-badge">Published</span>}
                        {isHidden && <span className="admin-draft-badge">Hidden</span>}
                      </div>
                    </td>
                    <td>{chapter.youtubeUrl ? <span className="admin-yes">Added</span> : <span className="admin-no">—</span>}</td>
                    <td>{chapter.notesPdf ? <span className="admin-yes">PDF</span> : <span className="admin-no">—</span>}</td>
                    <td>{chapter.questions.length}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-link-button" type="button" onClick={() => onEdit(chapter)}>Edit</button>
                        <button
                          className="admin-link-button admin-danger-link"
                          type="button"
                          disabled={deletingId === chapter.id || isHidden}
                          onClick={() => onDelete(chapter)}
                        >
                          {deletingId === chapter.id ? 'Hiding…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="admin-empty">No chapters found.</p>}
    </section>
  )
}

export default AdminChapterList
