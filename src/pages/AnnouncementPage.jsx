import { useState, useMemo } from 'react'
import { renderMarkdown } from '../utils/sanitize'


/**
 * 公告页面 — blog 形式
 * props:
 *   store: useStore 数据
 *   isAdmin: 是否管理员（可发布/编辑/删除）
 */
export default function AnnouncementPage({ store, isAdmin }) {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = store
  const [editing, setEditing] = useState(null)
  const [reading, setReading] = useState(null)
  const [msg, setMsg] = useState(null)

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000) }

  const sorted = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
  }, [announcements])

  const handleSave = (data) => {
    if (editing?.id) { updateAnnouncement(editing.id, data); showMsg('success', '公告已更新') }
    else { addAnnouncement(data); showMsg('success', '公告已发布') }
    setEditing(null)
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (reading) {
    return <AnnouncementDetail ann={reading} onBack={() => setReading(null)} fmtDate={fmtDate} />
  }

  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', background: msg.type === 'success' ? 'var(--accent-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '13px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{sorted.length} 篇公告</div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing({})}>+ 发布公告</button>}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📢</div>
          <p>暂无公告</p>
          {isAdmin && <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setEditing({})}>发布第一篇公告</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sorted.map(ann => (
            <div key={ann.id} className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => setReading(ann)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {ann.pinned && <span className="tag" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>📌 置顶</span>}
                <h3 style={{ fontSize: '16px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.title}</h3>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.content || '') }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '12px', color: 'var(--text-3)' }}>
                <span>👤 {ann.author || '管理员'}</span>
                <span>🕒 {fmtDate(ann.createdAt)}</span>
                {ann.updatedAt && ann.updatedAt !== ann.createdAt && <span>（已编辑）</span>}
                {isAdmin && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-icon btn-sm" onClick={() => setEditing(ann)} style={{ opacity: 0.5 }}>✎</button>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => { if (confirm('确定删除这篇公告？')) { deleteAnnouncement(ann.id); showMsg('success', '已删除') } }} style={{ opacity: 0.5 }}>×</button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <AnnouncementEditModal ann={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AnnouncementDetail({ ann, onBack, fmtDate }) {
  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <button className="btn btn-sm" onClick={onBack} style={{ marginBottom: '16px' }}>← 返回列表</button>
      <div className="card" style={{ padding: '32px' }}>
        {ann.pinned && <div style={{ marginBottom: '12px' }}><span className="tag" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>📌 置顶</span></div>}
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', lineHeight: '1.4' }}>{ann.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-3)' }}>
          <span>👤 {ann.author || '管理员'}</span>
          <span>🕒 {fmtDate(ann.createdAt)}</span>
          {ann.updatedAt && ann.updatedAt !== ann.createdAt && <span>✏️ {fmtDate(ann.updatedAt)}</span>}
        </div>
        <div className="markdown-body" style={{ fontSize: '14px', lineHeight: '1.8' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.content || '') }} />
      </div>
    </div>
  )
}

function AnnouncementEditModal({ ann, onSave, onClose }) {
  const [data, setData] = useState({
    title: ann.title || '',
    content: ann.content || '',
    author: ann.author || '管理员',
    pinned: ann.pinned ?? false,
  })
  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  const [preview, setPreview] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{ann.id ? '编辑公告' : '发布公告'}</h3>
          <button className="btn btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input" placeholder="公告标题" value={data.title} onChange={e => set('title', e.target.value)} autoFocus style={{ fontSize: '15px', fontWeight: 500 }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>作者</label>
              <input className="input" value={data.author} onChange={e => set('author', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', paddingBottom: '8px' }}>
                <input type="checkbox" checked={data.pinned} onChange={e => set('pinned', e.target.checked)} />置顶
              </label>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)' }}>内容（支持 Markdown）</label>
              <button className="btn btn-sm" onClick={() => setPreview(!preview)}>{preview ? '编辑' : '预览'}</button>
            </div>
            {preview ? (
              <div className="markdown-body" style={{ minHeight: '200px', padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content || '') }} />
            ) : (
              <textarea className="textarea" placeholder="输入公告内容，支持 Markdown 语法..." value={data.content} onChange={e => set('content', e.target.value)} rows={10} style={{ fontSize: '13px', lineHeight: '1.6' }} />
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(data)} disabled={!data.title}>发布</button>
        </div>
      </div>
    </div>
  )
}
