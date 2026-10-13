import { useState, useMemo } from 'react'
import { safeUrl } from '../utils/sanitize'

/**
 * 资料分享页面 — 网盘链接形式
 * 字段：分类, 网盘, 网址, 共享密码, 备注, 共享人
 * 功能：搜索、Excel 批量导入导出、管理员可增删改
 */
export default function ResourcePage({ store, isAdmin }) {
  const { resources, resourceCategories, addResource, updateResource, deleteResource, importResources, addResourceCategory, updateResourceCategory, deleteResourceCategory } = store
  const [editing, setEditing] = useState(null)
  const [showCat, setShowCat] = useState(false)
  const [filter, setFilter] = useState({ search: '', category: '' })
  const [msg, setMsg] = useState(null)

  const catMap = useMemo(() => Object.fromEntries(resourceCategories.map(c => [c.id, c])), [resourceCategories])
  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000) }

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (filter.search) {
        const q = filter.search.toLowerCase()
        const hay = `${r.drive} ${r.url} ${r.note} ${r.sharer}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filter.category && r.category !== filter.category) return false
      return true
    })
  }, [resources, filter])

  const handleSave = (data) => { if (editing?.id) updateResource(editing.id, data); else addResource(data); setEditing(null) }

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    if (filtered.length === 0) return
    const rows = filtered.map(r => ({
      '分类': catMap[r.category]?.name || '', '网盘': r.drive || '', '网址': r.url || '',
      '共享密码': r.sharePassword || '', '备注': r.note || '', '共享人': r.sharer || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '资料')
    XLSX.writeFile(wb, `resources-${new Date().toISOString().slice(0, 10)}.xlsx`)
    showMsg('success', `已导出 ${filtered.length} 条资料`)
  }

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { '分类': '算法', '网盘': '百度网盘', '网址': 'https://pan.baidu.com/s/xxxxx', '共享密码': 'ab12', '备注': '算法竞赛资料合集', '共享人': '张三' },
      { '分类': '数学', '网盘': '阿里云盘', '网址': 'https://alipan.com/s/yyyyy', '共享密码': '', '备注': '数学分析教材', '共享人': '李四' },
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '资料')
    XLSX.writeFile(wb, 'resource-template.xlsx')
    showMsg('success', '已下载 Excel 模板')
  }

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const newResources = rows.map(r => ({
          category: resourceCategories.find(c => c.name === (r['分类'] || ''))?.id || 'other',
          drive: r['网盘'] || r['drive'] || '', url: r['网址'] || r['url'] || '',
          sharePassword: r['共享密码'] || r['sharePassword'] || '', note: r['备注'] || r['note'] || '',
          sharer: r['共享人'] || r['sharer'] || '',
        })).filter(r => r.url || r.drive || r.note)
        if (newResources.length > 0) { importResources(newResources, 'append'); showMsg('success', `已导入 ${newResources.length} 条资料`) } else showMsg('error', '未找到有效资料')
      } catch { showMsg('error', 'Excel 文件格式错误') }
    }
    reader.readAsArrayBuffer(file); e.target.value = ''
  }

  const copyToClipboard = (text) => { navigator.clipboard?.writeText(text).then(() => showMsg('success', '已复制到剪贴板')).catch(() => {}) }

  return (
    <div className="fade-in" style={{ maxWidth: '840px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', background: msg.type === 'success' ? 'var(--accent-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '13px' }}>{msg.text}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input className="input" placeholder="搜索网盘/网址/备注/共享人..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ flex: 1 }} />
        <select className="select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ width: 'auto' }}>
          <option value="">全分类</option>{resourceCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing({})}>+ 添加</button>}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{filtered.length} 条资料</span>
        {isAdmin && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={handleExport}>导出Excel</span>
            <label style={{ cursor: 'pointer', color: 'var(--accent)' }}>导入Excel<input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} /></label>
            <span style={{ cursor: 'pointer', color: 'var(--text-2)' }} onClick={downloadTemplate}>模板Excel</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setShowCat(true)}>管理分类</span>
          </span>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📁</div><p>暂无资料</p>{isAdmin && <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setEditing({})}>添加第一条资料</button>}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {catMap[r.category] && <span className="tag" style={{ background: catMap[r.category].color + '15', color: catMap[r.category].color }}>{catMap[r.category].name}</span>}
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{r.drive || '未标注网盘'}</span>
                {r.sharer && <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: 'auto' }}>共享人: {r.sharer}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {r.url && (<><a href={r.url} target="_blank" rel="noopener" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</a><button className="btn btn-icon btn-sm" onClick={() => copyToClipboard(r.url)} title="复制链接" style={{ opacity: 0.4 }}>📋</button></>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-3)' }}>
                {r.sharePassword && (<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>密码: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{r.sharePassword}</code><button className="btn btn-icon btn-sm" onClick={() => copyToClipboard(r.sharePassword)} title="复制密码" style={{ opacity: 0.4, width: '20px', height: '20px' }}>📋</button></span>)}
                {r.note && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {r.note}</span>}
                {isAdmin && (<span style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}><button className="btn btn-icon btn-sm" onClick={() => setEditing(r)} style={{ opacity: 0.4 }}>✎</button><button className="btn btn-icon btn-sm btn-danger" onClick={() => { if (confirm('确定删除？')) deleteResource(r.id) }} style={{ opacity: 0.4 }}>×</button></span>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ResourceEditModal resource={editing} resourceCategories={resourceCategories} addResourceCategory={addResourceCategory} onSave={handleSave} onClose={() => setEditing(null)} />}
      {showCat && <ResourceCategoryModal categories={resourceCategories} onAdd={addResourceCategory} onUpdate={updateResourceCategory} onDelete={deleteResourceCategory} onClose={() => setShowCat(false)} />}
    </div>
  )
}

function ResourceEditModal({ resource, resourceCategories, addResourceCategory, onSave, onClose }) {
  const [data, setData] = useState({
    category: resource.category || resourceCategories[0]?.id || 'other',
    drive: resource.drive || '', url: resource.url || '',
    sharePassword: resource.sharePassword || '', note: resource.note || '', sharer: resource.sharer || '',
  })
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const set = (k, v) => setData(p => ({ ...p, [k]: v }))

  const handleCategoryChange = (e) => {
    if (e.target.value === '__new__') { setShowNewCat(true); return }
    setShowNewCat(false); set('category', e.target.value)
  }

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return
    const colors = ['#2d7d6e', '#3b5998', '#b04050', '#b07000', '#7c5cbf', '#6e7681', '#27ae60', '#e67e22']
    addResourceCategory({ name: newCatName.trim(), color: colors[resourceCategories.length % colors.length] })
    setNewCatName(''); setShowNewCat(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{resource.id ? '编辑资料' : '添加资料'}</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>分类</label>
              <select className="select" value={showNewCat ? '__new__' : data.category} onChange={handleCategoryChange}>
                {resourceCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ 新建分类…</option>
              </select>
              {showNewCat && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <input className="input" placeholder="输入新分类名" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateCategory()} autoFocus style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={handleCreateCategory}>添加</button>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>网盘</label>
              <input className="input" placeholder="如: 百度网盘" value={data.drive} onChange={e => set('drive', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>分享网址</label>
            <input className="input" placeholder="https://pan.baidu.com/s/xxxxx" value={data.url} onChange={e => set('url', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>共享密码</label>
              <input className="input" placeholder="如: ab12" value={data.sharePassword} onChange={e => set('sharePassword', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>共享人</label>
              <input className="input" placeholder="姓名" value={data.sharer} onChange={e => set('sharer', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>备注</label>
            <textarea className="textarea" placeholder="资料说明..." value={data.note} onChange={e => set('note', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(data)} disabled={!data.url && !data.drive}>保存</button>
        </div>
      </div>
    </div>
  )
}

function ResourceCategoryModal({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [newCat, setNewCat] = useState({ name: '', color: '#2d7d6e' })
  const colors = ['#2d7d6e', '#3b5998', '#b04050', '#b07000', '#7c5cbf', '#6e7681', '#27ae60', '#e67e22']
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>管理资料分类</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.color, flexShrink: 0 }} />
              <input className="input" value={c.name} onChange={e => onUpdate(c.id, { name: e.target.value })} style={{ flex: 1 }} />
              <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`确定删除分类「${c.name}」？`)) onDelete(c.id) }} style={{ padding: "4px 10px" }}>删除</button>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
            <input className="input" placeholder="新分类名" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} style={{ flex: 1 }} />
            <select className="select" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} style={{ width: '60px' }}>
              {colors.map(c => <option key={c} value={c}>{c.slice(1)}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => { if (newCat.name) { onAdd(newCat); setNewCat({ name: '', color: '#2d7d6e' }) } }}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}
