import DatePicker from "../components/DatePicker.jsx"
import { useState, useMemo } from 'react'
import ExportModal from './ExportModal'
import { ContestCategoryModal } from './TodoComponents'
import { safeUrl } from '../utils/sanitize'

export default function ContestPage({ store, canEdit = true }) {
  const { contests, contestCategories, addContest, updateContest, deleteContest, importContests, addContestCategory, updateContestCategory, deleteContestCategory } = store
  const [editing, setEditing] = useState(null)
  const [showCat, setShowCat] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [filter, setFilter] = useState({ search: '', category: '', showOnCalendar: 'all' })
  const [msg, setMsg] = useState(null)

  const catMap = useMemo(() => Object.fromEntries(contestCategories.map(c => [c.id, c])), [contestCategories])
  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000) }

  const filtered = useMemo(() => {
    return contests.filter(c => {
      if (filter.search && !c.name.toLowerCase().includes(filter.search.toLowerCase())) return false
      if (filter.category && c.category !== filter.category) return false
      if (filter.showOnCalendar === 'yes' && !c.showOnCalendar) return false
      if (filter.showOnCalendar === 'no' && c.showOnCalendar) return false
      return true
    }).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  }, [contests, filter])

  const handleSave = (data) => { if (editing?.id) updateContest(editing.id, data); else addContest(data); setEditing(null) }

  // Excel 模板下载
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { '名称': '示例竞赛1', '分类': '算法', '开始日期': '2026-03-01', '结束日期': '2026-03-05', '链接': 'https://example.com', '描述': '竞赛描述', '显示在日历': '是' },
      { '名称': '示例竞赛2', '分类': '数学', '开始日期': '2026-04-10', '结束日期': '', '链接': '', '描述': '', '显示在日历': '否' },
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '竞赛')
    XLSX.writeFile(wb, 'contest-template.xlsx')
    showMsg('success', '已下载 Excel 模板')
  }

  // Excel 导入
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const newContests = rows.map(r => ({
          name: r['名称'] || r['name'] || '',
          category: contestCategories.find(c => c.name === (r['分类'] || ''))?.id || 'algorithm',
          startDate: r['开始日期'] || r['startDate'] || '',
          endDate: r['结束日期'] || r['endDate'] || '',
          url: r['链接'] || r['url'] || '',
          desc: r['描述'] || r['desc'] || '',
          showOnCalendar: (r['显示在日历'] || '是') === '是',
        })).filter(c => c.name)
        if (newContests.length > 0) { importContests(newContests, 'append'); showMsg('success', `已导入 ${newContests.length} 条竞赛`) } else showMsg('error', '未找到有效竞赛')
      } catch { showMsg('error', 'Excel 文件格式错误') }
    }
    reader.readAsArrayBuffer(file); e.target.value = ''
  }

  const toggleCalendar = (id, current) => { updateContest(id, { showOnCalendar: !current }) }

  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', background: msg.type === 'success' ? 'var(--accent-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '13px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input className="input" placeholder="搜索竞赛..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ flex: 1 }} />
        <select className="select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ width: 'auto' }}>
          <option value="">全分类</option>{contestCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={filter.showOnCalendar} onChange={e => setFilter({ ...filter, showOnCalendar: e.target.value })} style={{ width: 'auto' }}>
          <option value="all">全部</option><option value="yes">日历可见</option><option value="no">日历隐藏</option>
        </select>
        {canEdit && <button className="btn btn-primary" onClick={() => setEditing({})}>+ 添加</button>}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{contests.length} 个竞赛</span>
        <span>{contests.filter(c => c.showOnCalendar).length} 显示在日历</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setShowExport(true)}>导出</span>
          {canEdit && <label style={{ cursor: 'pointer', color: 'var(--accent)' }}>导入Excel<input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} /></label>}
          <span style={{ cursor: 'pointer', color: 'var(--text-2)' }} onClick={downloadTemplate}>模板Excel</span>
          {canEdit && <span style={{ cursor: 'pointer' }} onClick={() => setShowCat(true)}>管理分类</span>}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🏆</div><p>暂无竞赛</p>{canEdit && <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setEditing({})}>添加第一个竞赛</button>}</div>
      ) : (
        <div>{filtered.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', background: c.showOnCalendar ? 'var(--accent)' : 'var(--surface-2)', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }} onClick={() => toggleCalendar(c.id, c.showOnCalendar)}>
              <div style={{ position: 'absolute', top: '2px', left: c.showOnCalendar ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                {catMap[c.category] && <span className="tag" style={{ background: catMap[c.category].color + '15', color: catMap[c.category].color }}>{catMap[c.category].name}</span>}
                {c.url && <a href={c.url} target="_blank" rel="noopener" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>🔗</a>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                {c.startDate && `📅 ${c.startDate}${c.endDate ? ` → ${c.endDate}` : ''}`}
                {c.desc && ` · ${c.desc.slice(0, 50)}${c.desc.length > 50 ? '...' : ''}`}
              </div>
            </div>
            {canEdit && <button className="btn btn-icon btn-sm" onClick={() => setEditing(c)} style={{ opacity: 0.4 }}>✎</button>}
            {canEdit && <button className="btn btn-icon btn-sm btn-danger" onClick={() => deleteContest(c.id)} style={{ opacity: 0.4 }}>×</button>}
          </div>
        ))}</div>
      )}

      {editing && <ContestEditModal contest={editing} contestCategories={contestCategories} onSave={handleSave} onClose={() => setEditing(null)} />}
      {showCat && <ContestCategoryModal categories={contestCategories} onAdd={addContestCategory} onUpdate={updateContestCategory} onDelete={deleteContestCategory} onClose={() => setShowCat(false)} />}
      {showExport && <ExportModal type="contest" items={contests} catMap={catMap} priMap={{}} onClose={() => setShowExport(false)} />}
    </div>
  )
}

function ContestEditModal({ contest, contestCategories, onSave, onClose }) {
  const [data, setData] = useState({
    name: contest.name || '',
    category: contest.category || contestCategories[0]?.id || 'algorithm',
    startDate: contest.startDate || '', endDate: contest.endDate || '',
    url: contest.url || '', desc: contest.desc || '',
    showOnCalendar: contest.showOnCalendar ?? true,
  })
  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '460px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{contest.id ? '编辑竞赛' : '添加竞赛'}</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input" placeholder="竞赛名称" value={data.name} onChange={e => set('name', e.target.value)} autoFocus />
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>分类</label>
            <select className="select" value={data.category} onChange={e => set('category', e.target.value)}>{contestCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>开始日期</label>
              <DatePicker value={data.startDate} onChange={v => set("startDate", v)} placeholder="选择开始日期" style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>结束日期</label>
              <DatePicker value={data.endDate} onChange={v => set("endDate", v)} placeholder="选择结束日期" style={{ width: "100%" }} />
            </div>
          </div>
          <input className="input" placeholder="竞赛链接（可选）" value={data.url} onChange={e => set('url', e.target.value)} />
          <textarea className="textarea" placeholder="描述（可选）" value={data.desc} onChange={e => set('desc', e.target.value)} rows={3} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={data.showOnCalendar} onChange={e => set('showOnCalendar', e.target.checked)} />显示在日历
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(data)} disabled={!data.name}>保存</button>
        </div>
      </div>
    </div>
  )
}
