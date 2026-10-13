import { useState, useMemo } from 'react'
import { renderMarkdown } from '../utils/sanitize'
import { TodoEditModal, CategoryModal } from './TodoComponents'
import ExportModal from './ExportModal'


export default function TodoPage({ store, canEdit = true }) {
  const { todos, categories, priorities, addTodo, updateTodo, deleteTodo, toggleTodo, importTodos, addCategory, updateCategory, deleteCategory } = store
  const [editing, setEditing] = useState(null)
  const [showCat, setShowCat] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [filter, setFilter] = useState({ search: '', category: '', priority: '', status: 'all' })
  const [msg, setMsg] = useState(null)

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const priMap = useMemo(() => Object.fromEntries(priorities.map(p => [p.id, p])), [priorities])

  const filtered = useMemo(() => {
    return todos.filter(t => {
      if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false
      if (filter.category && t.category !== filter.category) return false
      if (filter.priority && t.priority !== filter.priority) return false
      if (filter.status === 'active' && t.completed) return false
      if (filter.status === 'done' && !t.completed) return false
      return true
    }).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return (priMap[b.priority]?.level || 0) - (priMap[a.priority]?.level || 0)
    })
  }, [todos, filter, priMap])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000) }
  const handleSave = (data) => { if (editing?.id) updateTodo(editing.id, data); else addTodo(data); setEditing(null) }

  // Excel 模板下载
  const downloadTemplateExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { '标题': '示例任务1', '分类': '学习', '优先级': '高', '开始日期': '2026-01-01', '结束日期': '', '详情': '这是任务描述，支持 Markdown', '已完成': '否', '显示在日历': '否' },
      { '标题': '示例任务2', '分类': '工作', '优先级': '中', '开始日期': '', '结束日期': '', '详情': '另一个任务', '已完成': '否', '显示在日历': '是' },
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '任务')
    XLSX.writeFile(wb, 'todo-template.xlsx')
    showMsg('success', '已下载 Excel 模板')
  }
  const downloadTemplateMD = () => {
    const tpl = `# 任务列表导入模板

> 修改下面的内容后保存为 .md 文件导入

## 待办（2）

### 示例任务1

- **分类**: 学习 | **优先级**: 高
- **日期**: 2026-01-01

这是任务描述，支持 **Markdown** 语法。

---

### 示例任务2

- **分类**: 工作 | **优先级**: 中

另一个任务的描述。

---

## 已完成（0）
`
    const blob = new Blob([tpl], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'todo-template.md'; a.click(); URL.revokeObjectURL(url)
    showMsg('success', '已下载 MD 模板')
  }

  // Excel 导入
  const handleImportExcel = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const newTodos = rows.map(r => ({
          title: r['标题'] || r['title'] || '',
          desc: r['详情'] || r['desc'] || '',
          category: categories.find(c => c.name === (r['分类'] || ''))?.id || 'study',
          priority: priorities.find(p => p.name === (r['优先级'] || ''))?.id || 'medium',
          date: r['开始日期'] || r['date'] || '',
          endDate: r['结束日期'] || r['endDate'] || '',
          showOnCalendar: (r['显示在日历'] || '') === '是',
          completed: (r['已完成'] || '') === '是',
        })).filter(t => t.title)
        if (newTodos.length > 0) { importTodos(newTodos, 'append'); showMsg('success', `已导入 ${newTodos.length} 条任务`) } else showMsg('error', '未找到有效任务')
      } catch { showMsg('error', 'Excel 文件格式错误') }
    }
    reader.readAsArrayBuffer(file); e.target.value = ''
  }

  const handleImportMD = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const lines = ev.target.result.split('\n')
        const newTodos = []; let cur = null
        for (const line of lines) {
          if (line.startsWith('### ')) { if (cur) newTodos.push(cur); cur = { title: line.slice(4).trim(), desc: '', category: 'study', priority: 'medium', completed: false, showOnCalendar: false } }
          else if (cur && line.startsWith('- **分类**')) { const cn = line.split(':')[1]?.trim().split('|')[0]?.trim(); const c = categories.find(c => c.name === cn); if (c) cur.category = c.id }
          else if (cur && line.startsWith('- **优先级**')) { const pn = line.split(':')[1]?.trim(); const p = priorities.find(p => p.name === pn); if (p) cur.priority = p.id }
          else if (cur && line.startsWith('- **日期**')) { const dp = line.split(':')[1]?.trim(); if (dp) { const ps = dp.split('→').map(s => s.trim()); cur.date = ps[0]; if (ps[1]) cur.endDate = ps[1] } }
          else if (cur && line.trim() && !line.startsWith('-') && !line.startsWith('---') && !line.startsWith('#') && !line.startsWith('>')) { cur.desc += (cur.desc ? '\n' : '') + line }
        }
        if (cur) newTodos.push(cur)
        if (newTodos.length > 0) { importTodos(newTodos, 'append'); showMsg('success', `已导入 ${newTodos.length} 条任务`) } else showMsg('error', '未找到有效任务')
      } catch { showMsg('error', 'Markdown 解析失败') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const counts = { total: todos.length, active: todos.filter(t => !t.completed).length, done: todos.filter(t => t.completed).length }

  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', background: msg.type === 'success' ? 'var(--accent-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '13px' }}>{msg.text}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input className="input" placeholder="搜索任务..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ flex: 1 }} />
        <select className="select" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} style={{ width: 'auto' }}><option value="all">全部</option><option value="active">待办</option><option value="done">已完成</option></select>
        <select className="select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ width: 'auto' }}><option value="">全分类</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {canEdit && <button className="btn btn-primary" onClick={() => setEditing({})}>+ 新建</button>}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{counts.active} 待办</span><span>{counts.done} 已完成</span><span>{counts.total} 总计</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setShowExport(true)}>导出</span>
          {canEdit && <label style={{ cursor: "pointer", color: "var(--accent)" }}>导入Excel<input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} /></label>}
          {canEdit && <label style={{ cursor: "pointer", color: "var(--accent)" }}>导入MD<input type="file" accept=".md,.markdown" onChange={handleImportMD} style={{ display: 'none' }} /></label>}
          <span style={{ cursor: 'pointer', color: 'var(--text-2)' }} onClick={downloadTemplateExcel}>模板Excel</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-2)' }} onClick={downloadTemplateMD}>模板MD</span>
          {canEdit && <span style={{ cursor: "pointer" }} onClick={() => setShowCat(true)}>管理分类</span>}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">✓</div><p>暂无任务</p>{canEdit && <button className="btn btn-primary" style={{ marginTop: "12px" }} onClick={() => setEditing({})}>创建第一个任务</button>}</div>
      ) : (
        <div>{filtered.map(todo => <TodoItem key={todo.id} todo={todo} cat={catMap[todo.category]} pri={priMap[todo.priority]} onToggle={() => toggleTodo(todo.id)} onEdit={() => setEditing(todo)} onDelete={() => deleteTodo(todo.id)} canEdit={canEdit} />)}</div>
      )}
      {editing && <TodoEditModal todo={editing} categories={categories} priorities={priorities} onSave={handleSave} onClose={() => setEditing(null)} />}
      {showCat && <CategoryModal categories={categories} onAdd={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} onClose={() => setShowCat(false)} />}
      {showExport && <ExportModal type="todo" items={todos} catMap={catMap} priMap={priMap} onClose={() => setShowExport(false)} />}
    </div>
  )
}

function TodoItem({ todo, cat, pri, onToggle, onEdit, onDelete, canEdit = true }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = todo.desc || todo.date || todo.endDate
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
        {hasDetail ? <span style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: '10px', width: '16px', textAlign: 'center', transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none' }} onClick={() => setExpanded(!expanded)}>▶</span> : <span style={{ width: '16px' }} />}
        <div className={`checkbox ${todo.completed ? 'checked' : ''}`} onClick={onToggle}>{todo.completed && '✓'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px', textDecoration: todo.completed ? 'line-through' : 'none', color: todo.completed ? 'var(--text-3)' : 'var(--text)' }}>{todo.title}</span>
          {cat && <span className="tag" style={{ background: cat.color + '15', color: cat.color, marginLeft: '8px' }}>{cat.name}</span>}
        </div>
        {todo.date && <span style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{todo.date}</span>}
        {pri && <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: pri?.color || 'transparent' }} />}
        {canEdit && <button className="btn btn-icon btn-sm" onClick={onEdit} style={{ opacity: 0.4 }}>✎</button>}
        {canEdit && <button className="btn btn-icon btn-sm btn-danger" onClick={onDelete} style={{ opacity: 0.4 }}>×</button>}
      </div>
      {expanded && hasDetail && (
        <div className="todo-detail fade-in" style={{ paddingLeft: '42px', paddingBottom: '10px' }}>
          {todo.date && <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>📅 {todo.date}{todo.endDate ? ` → ${todo.endDate}` : ''}{todo.showOnCalendar && ' · 📌 显示在日历'}</div>}
          {todo.desc && <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(todo.desc) }} />}
        </div>
      )}
    </div>
  )
}
