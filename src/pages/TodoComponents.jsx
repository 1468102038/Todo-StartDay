import DatePicker from "../components/DatePicker.jsx"
import { useState } from 'react'

export function TodoEditModal({ todo, categories, priorities, onSave, onClose }) {
  const [data, setData] = useState({
    title: todo.title || '', desc: todo.desc || '',
    category: todo.category || categories[0]?.id || '',
    priority: todo.priority || priorities[0]?.id || '',
    date: todo.date || '', endDate: todo.endDate || '',
    showOnCalendar: todo.showOnCalendar ?? false,
  })
  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{todo.id ? '编辑任务' : '新建任务'}</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input" placeholder="任务标题" value={data.title} onChange={e => set('title', e.target.value)} autoFocus />
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>详情（支持 Markdown）</label>
            <textarea className="textarea" placeholder="支持 **粗体**、*斜体*、列表、代码块等" value={data.desc} onChange={e => set('desc', e.target.value)} rows={5} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>分类</label>
              <select className="select" value={data.category} onChange={e => set('category', e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>优先级</label>
              <select className="select" value={data.priority} onChange={e => set('priority', e.target.value)}>{priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>📅 开始日期</label>
              <DatePicker value={data.date} onChange={v => set("date", v)} placeholder="选择开始日期" style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>📅 结束日期（可选）</label>
              <DatePicker value={data.endDate} onChange={v => set("endDate", v)} placeholder="选择结束日期" style={{ width: "100%" }} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={data.showOnCalendar} onChange={e => set('showOnCalendar', e.target.checked)} />显示在日历
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(data)} disabled={!data.title}>保存</button>
        </div>
      </div>
    </div>
  )
}

export function CategoryModal({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [newCat, setNewCat] = useState({ name: '', color: '#3498db' })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>管理分类</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={c.color} onChange={e => onUpdate(c.id, { color: e.target.value })} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
              <input className="input" value={c.name} onChange={e => onUpdate(c.id, { name: e.target.value })} style={{ flex: 1 }} />
              <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`确定删除分类「${c.name}」？`)) onDelete(c.id) }} style={{ padding: '4px 10px' }}>删除</button>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
            <input className="input" placeholder="新分类" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => { if (newCat.name) { onAdd(newCat); setNewCat({ name: '', color: '#3498db' }) } }}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContestCategoryModal({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [newCat, setNewCat] = useState({ name: '', color: '#3498db' })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>管理竞赛分类</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={c.color} onChange={e => onUpdate(c.id, { color: e.target.value })} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
              <input className="input" value={c.name} onChange={e => onUpdate(c.id, { name: e.target.value })} style={{ flex: 1 }} />
              <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`确定删除分类「${c.name}」？`)) onDelete(c.id) }} style={{ padding: '4px 10px' }}>删除</button>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
            <input className="input" placeholder="新分类" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => { if (newCat.name) { onAdd(newCat); setNewCat({ name: '', color: '#3498db' }) } }}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}
