import { useState, useMemo } from 'react'

/**
 * 建议页面 — 所有人都能发建议和评论
 * props:
 *   store: useStore 数据
 *   isAdmin: 是否管理员（可删除建议和评论）
 */
export default function SuggestionPage({ store, isAdmin }) {
  const { suggestions, addSuggestion, deleteSuggestion, addComment, deleteComment } = store
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [msg, setMsg] = useState(null)
  const [author, setAuthor] = useState(() => localStorage.getItem('sd:author') || '')

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000) }

  const sorted = useMemo(() => {
    return [...suggestions].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [suggestions])

  const handlePost = (data) => {
    if (data.author) localStorage.setItem('sd:author', data.author)
    addSuggestion(data)
    setEditing(null)
    showMsg('success', '建议已发布')
  }

  const handleComment = (suggId, content) => {
    if (!content.trim()) return
    addComment(suggId, { content, author: author || '匿名用户' })
    if (author) localStorage.setItem('sd:author', author)
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', background: msg.type === 'success' ? 'var(--accent-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '13px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{sorted.length} 条建议</div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing({})}>+ 发表建议</button>}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💡</div>
          <p>暂无建议</p>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setEditing({})}>发表第一条建议</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sorted.map(s => (
            <SuggestionItem
              key={s.id} sugg={s} expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              author={author} setAuthor={setAuthor}
              onComment={(content) => handleComment(s.id, content)}
              onDelete={() => { if (confirm('确定删除这条建议？')) { deleteSuggestion(s.id); showMsg('success', '已删除') } }}
              onDeleteComment={(cid) => deleteComment(s.id, cid)}
              fmtDate={fmtDate} isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {editing && <SuggestionEditModal author={author} setAuthor={setAuthor} onSave={handlePost} onClose={() => setEditing(null)} />}
    </div>
  )
}

function SuggestionItem({ sugg, expanded, onToggle, author, setAuthor, onComment, onDelete, onDeleteComment, fmtDate, isAdmin }) {
  const [commentText, setCommentText] = useState('')
  const commentCount = (sugg.comments || []).length

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{sugg.title}</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{sugg.content}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-icon btn-sm btn-danger" onClick={onDelete} style={{ opacity: 0.4, flexShrink: 0 }}>×</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', fontSize: '12px', color: 'var(--text-3)' }}>
        <span>👤 {sugg.author}</span>
        <span>🕒 {fmtDate(sugg.createdAt)}</span>
        <span
          style={{ cursor: 'pointer', color: 'var(--accent)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={onToggle}
        >
          💬 {commentCount} 条评论 {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div className="fade-in" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          {/* 评论列表 */}
          {(sugg.comments || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {(sugg.comments || []).map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{c.author}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '8px' }}>{fmtDate(c.createdAt)}</span>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '2px' }}>{c.content}</div>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => onDeleteComment(c.id)} style={{ opacity: 0.3, width: '20px', height: '20px' }}>×</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>暂无评论</div>
          )}

          {/* 发评论 */}
          {isAdmin && <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input" placeholder="你的名字（选填）" value={author}
              onChange={e => setAuthor(e.target.value)} style={{ width: '120px', flexShrink: 0 }}
            />
            <input
              className="input" placeholder="写评论..." value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) { onComment(commentText); setCommentText('') } }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { if (commentText.trim()) { onComment(commentText); setCommentText('') } }}
              disabled={!commentText.trim()}
            >发送</button>
          </div>}
        </div>
      )}
    </div>
  )
}

function SuggestionEditModal({ author, setAuthor, onSave, onClose }) {
  const [data, setData] = useState({ title: '', content: '', author })
  const set = (k, v) => { setData(p => ({ ...p, [k]: v })); if (k === 'author') setAuthor(v) }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>发表建议</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input" placeholder="建议标题" value={data.title} onChange={e => set('title', e.target.value)} autoFocus />
          <textarea className="textarea" placeholder="详细描述你的建议..." value={data.content} onChange={e => set('content', e.target.value)} rows={5} />
          <input className="input" placeholder="你的名字（选填，默认匿名）" value={data.author} onChange={e => set('author', e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(data)} disabled={!data.title}>发布</button>
        </div>
      </div>
    </div>
  )
}
