import DatePicker from "../components/DatePicker.jsx"
import { useState, useMemo, useRef } from 'react'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayWeekday(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }
function fmtDate(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` }
function parseDate(s) { return new Date(s + 'T00:00:00') }

export default function CalendarPage({ store, canEdit = true }) {
  const { todos, contests, categories, addTodo, updateTodo, deleteTodo } = store
  const [view, setView] = useState('month')
  const [current, setCurrent] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth(), day: n.getDate() } })
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showAddEvent, setShowAddEvent] = useState(null)
  const [msg, setMsg] = useState(null)
  const calRef = useRef(null)
  const [calFilter, setCalFilter] = useState('all')
  const [showExport, setShowExport] = useState(null)

  const todayStr = fmtDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const allEvents = useMemo(() => {
    const list = []
    todos.filter(t => t.showOnCalendar && t.date).forEach(t => {
      list.push({ id: t.id, type: 'todo', title: t.title, date: t.date, endDate: t.endDate || t.date, color: catMap[t.category]?.color || '#2d7d6e', completed: t.completed, category: catMap[t.category]?.name || '', desc: t.desc })
    })
    contests.filter(c => c.showOnCalendar && c.startDate).forEach(c => {
      list.push({ id: c.id, type: 'contest', title: c.name, date: c.startDate, endDate: c.endDate || c.startDate, color: '#b04050', completed: false, category: '竞赛', desc: c.desc })
    })
    return list
  }, [todos, contests, catMap])

  const events = useMemo(() => {
    if (calFilter === 'contest') return allEvents.filter(e => e.type === 'contest')
    if (calFilter === 'todo') return allEvents.filter(e => e.type === 'todo')
    return allEvents
  }, [allEvents, calFilter])

  // 使用 Date 对象比较，避免字符串格式不一致导致错误
  const getEvents = (ds) => events.filter(e => {
    if (!e.date || !ds) return false
    const eventStart = new Date(e.date)
    const eventEnd = new Date(e.endDate || e.date)
    const target = new Date(ds)
    return target >= eventStart && target <= eventEnd
  })
  const showMsg = (t) => { setMsg(t); setTimeout(() => setMsg(null), 2000) }

  const handleSavePhoto = async (exportScope) => {
    setShowExport(null)
    if (!calRef.current) return
    const origFilter = calFilter
    setCalFilter(exportScope)
    await new Promise(r => setTimeout(r, 100))
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(calRef.current, { backgroundColor: '#ffffff', scale: 2 })
      const link = document.createElement('a')
      const sl = exportScope === 'contest' ? '竞赛' : exportScope === 'todo' ? '任务' : '全部'
      link.download = `calendar-${sl}-${current.year}-${String(current.month+1).padStart(2,'0')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showMsg(`已保存 ${sl} 日历照片`)
    } catch(e) { showMsg('保存失败: ' + e.message) }
    finally { setCalFilter(origFilter) }
  }

  const handleExportExcel = async (exportScope) => {
    setShowExport(null)
    const tgt = exportScope === 'contest' ? allEvents.filter(e => e.type === 'contest')
      : exportScope === 'todo' ? allEvents.filter(e => e.type === 'todo') : allEvents
    const XLSX = await import('xlsx')
    const data = tgt.map(e => ({ '标题': e.title, '类型': e.type === 'contest' ? '竞赛' : '任务', '分类': e.category, '开始': e.date, '结束': e.endDate !== e.date ? e.endDate : '', '状态': e.completed ? '已完成' : '未完成' }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    const sl = exportScope === 'contest' ? '竞赛' : exportScope === 'todo' ? '任务' : '全部'
    XLSX.utils.book_append_sheet(wb, ws, sl)
    XLSX.writeFile(wb, `calendar-${sl}-${current.year}-${String(current.month+1).padStart(2,'0')}.xlsx`)
    showMsg(`已导出 ${sl} Excel`)
  }

  const handleAddEvent = (d) => { addTodo({ title: d.title, date: d.date, endDate: d.endDate || null, showOnCalendar: true, category: d.category || 'study', priority: 'medium', desc: d.desc || '' }); setShowAddEvent(null); showMsg('事件已添加') }
  const handleEditEvent = (ev) => { if (ev.type === 'todo') { const t = todos.find(t => t.id === ev.id); if (t) setEditingEvent({ ...t, _type: 'todo' }) } }
  const handleSaveEdit = (d) => { if (editingEvent?._type === 'todo') { updateTodo(editingEvent.id, { title: d.title, date: d.date, endDate: d.endDate || null, desc: d.desc || '' }); showMsg('已更新') } setEditingEvent(null) }
  const handleDeleteEvent = (ev) => { if (ev.type === 'todo') { deleteTodo(ev.id); showMsg('已删除') } }

  const calcBars = (evts, firstDay, days, numWeeks) => {
    const bars = []
    const mStart = parseDate(fmtDate(current.year, current.month, 1))
    const mEnd = parseDate(fmtDate(current.year, current.month, days))
    evts.forEach(e => {
      const eS = parseDate(e.date), eE = parseDate(e.endDate || e.date)
      const vS = eS < mStart ? mStart : eS, vE = eE > mEnd ? mEnd : eE
      if (vS > vE) return
      for (let w = 0; w < numWeeks; w++) {
        const wFirst = w * 7 - firstDay + 1
        const wS = new Date(current.year, current.month, Math.max(wFirst, 1))
        const wE = new Date(current.year, current.month, Math.min(wFirst + 6, days))
        if (vS > wE || vE < wS) continue
        const bS = vS > wS ? vS : wS, bE = vE < wE ? vE : wE
        bars.push({ ...e, key: `${e.id}-w${w}`, weekRow: w, startCol: (bS.getDate() - wFirst) + 1, endCol: (bE.getDate() - wFirst) + 1, isStart: bS.getTime() === eS.getTime(), isEnd: bE.getTime() === eE.getTime(), isMultiDay: eE.getTime() !== eS.getTime() })
      }
    })
    const lanes = []
    bars.forEach(bar => {
      let placed = false
      for (let l = 0; l < lanes.length; l++) {
        const conflict = lanes[l].some(b => !(bar.endCol < b.startCol || bar.startCol > b.endCol) && bar.weekRow === b.weekRow)
        if (!conflict) { lanes[l].push(bar); bar.lane = l; placed = true; break }
      }
      if (!placed) { bar.lane = lanes.length; lanes.push([bar]) }
    })
    return bars
  }

  const FilterTabs = () => (
    <div style={{ display: 'inline-flex', gap: '2px', background: 'var(--surface-2)', borderRadius: '6px', padding: '2px' }}>
      {[{id:'all',label:'全部'},{id:'contest',label:'🏆 竞赛'},{id:'todo',label:'✓ 任务'}].map(f => (
        <button key={f.id} onClick={() => setCalFilter(f.id)}
          style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
            background: calFilter === f.id ? 'var(--surface)' : 'transparent',
            color: calFilter === f.id ? 'var(--accent)' : 'var(--text-3)', transition: 'all 0.15s' }}>
          {f.label}
        </button>
      ))}
    </div>
  )

  const renderMonth = () => {
    const days = getDaysInMonth(current.year, current.month)
    const firstDay = getFirstDayWeekday(current.year, current.month)
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    const totalCells = Math.ceil(cells.length / 7) * 7
    while (cells.length < totalCells) cells.push(null)
    const numWeeks = totalCells / 7
    const bars = calcBars(events, firstDay, days, numWeeks)
    const maxLane = Math.max(0, ...bars.map(b => b.lane || 0))
    const dayHeight = 72 + maxLane * 24

    return (
      <div ref={calRef}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-icon btn-sm" onClick={() => setCurrent({ ...current, month: current.month - 1 < 0 ? 11 : current.month - 1, year: current.month - 1 < 0 ? current.year - 1 : current.year })}>‹</button>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>{current.year}年 {MONTHS[current.month]}</span>
            <button className="btn btn-icon btn-sm" onClick={() => setCurrent({ ...current, month: current.month + 1 > 11 ? 0 : current.month + 1, year: current.month + 1 > 11 ? current.year + 1 : current.year })}>›</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FilterTabs />
            <button className="btn btn-sm" onClick={() => { const n = new Date(); setCurrent({ year: n.getFullYear(), month: n.getMonth(), day: n.getDate() }) }}>今天</button>
            <button className="btn btn-sm" onClick={() => setView('year')}>年视图</button>
            {canEdit && <button className="btn btn-sm btn-primary" onClick={() => setShowAddEvent({ date: selectedDate || todayStr })}>+ 事件</button>}
            <button className="btn btn-sm" onClick={() => setShowExport('photo')}>📷 照片</button>
            <button className="btn btn-sm" onClick={() => setShowExport('excel')}>📊 Excel</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ gridColumn: i + 1, gridRow: 1, textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', padding: '4px' }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            const col = (i % 7) + 1, row = Math.floor(i / 7) + 2
            if (!d) return <div key={`c-${i}`} style={{ gridColumn: col, gridRow: row, minHeight: dayHeight + 'px', border: '1px solid var(--border)', borderRadius: '6px', opacity: 0.3 }} />
            const ds = fmtDate(current.year, current.month, d)
            const singleEvs = getEvents(ds).filter(e => !e.endDate || e.endDate === e.date)
            return (
              <div key={`c-${i}`} className={`cal-day ${ds === todayStr ? 'today' : ''} ${ds === selectedDate ? 'selected' : ''}`}
                style={{ gridColumn: col, gridRow: row, minHeight: dayHeight + 'px' }}
                onClick={() => setSelectedDate(ds)}>
                <span style={{ fontSize: '12px', color: ds === todayStr ? 'var(--accent)' : 'var(--text-2)', fontWeight: ds === todayStr ? 600 : 400 }}>{d}</span>
                {singleEvs.slice(0, 2).map(e => (
                  <div key={e.id} className="cal-event" style={{ background: e.completed ? 'var(--surface-2)' : e.color + '20', color: e.completed ? 'var(--text-3)' : e.color, borderLeft: `2px solid ${e.color}`, cursor: 'pointer', marginTop: '2px' }} onClick={(ev) => { ev.stopPropagation(); handleEditEvent(e) }}>{e.type === 'contest' ? '🏆 ' : ''}{e.title}</div>
                ))}
                {singleEvs.length > 2 && <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>+{singleEvs.length - 2}</span>}
              </div>
            )
          })}
          {bars.filter(b => b.isMultiDay).map(bar => (
            <div key={bar.key}
              style={{ gridColumn: `${bar.startCol} / ${bar.endCol + 1}`, gridRow: bar.weekRow + 2, marginTop: `${22 + (bar.lane || 0) * 24}px`, marginLeft: '3px', marginRight: '3px', padding: '3px 8px',
                background: bar.completed ? 'var(--surface-2)' : bar.color + '25', color: bar.completed ? 'var(--text-3)' : bar.color,
                border: `2px solid ${bar.color}`, borderLeftWidth: bar.isStart ? '3px' : '0', borderRightWidth: bar.isEnd ? '3px' : '0',
                borderRadius: bar.isStart && bar.isEnd ? '5px' : (bar.isStart ? '5px 0 0 5px' : (bar.isEnd ? '0 5px 5px 0' : '0')),
                fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer', alignSelf: 'start', opacity: bar.completed ? 0.5 : 1, zIndex: 10 }}
              onClick={(e) => { e.stopPropagation(); handleEditEvent(bar) }}
              title={`${bar.title} (${bar.date} → ${bar.endDate})`}>
              {bar.isStart ? `${bar.type === 'contest' ? '🏆 ' : ''}${bar.title}` : ''}
            </div>
          ))}
        </div>

        {selectedDate && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 500 }}>{selectedDate} 的事件</h3>
              {canEdit && <button className="btn btn-sm btn-primary" onClick={() => setShowAddEvent({ date: selectedDate })}>+ 添加</button>}
            </div>
            {getEvents(selectedDate).length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>当天无事件</p> : getEvents(selectedDate).map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px' }}>
                <span style={{ color: e.color }}>●</span>
                <span style={{ flex: 1, textDecoration: e.completed ? 'line-through' : 'none', color: e.completed ? 'var(--text-3)' : 'var(--text)' }}>{e.type === 'contest' ? '🏆 ' : ''}{e.title}</span>
                <span className="tag" style={{ background: e.color + '15', color: e.color }}>{e.category}</span>
                {e.endDate !== e.date && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{e.date} → {e.endDate}</span>}
                {canEdit && <button className="btn btn-icon btn-sm" onClick={() => handleEditEvent(e)} style={{ opacity: 0.4 }}>✎</button>}
                {canEdit && e.type === "todo" && <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDeleteEvent(e)} style={{ opacity: 0.4 }}>×</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderYear = () => (
    <div ref={calRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-icon btn-sm" onClick={() => setCurrent({ ...current, year: current.year - 1 })}>‹</button>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>{current.year}年</span>
          <button className="btn btn-icon btn-sm" onClick={() => setCurrent({ ...current, year: current.year + 1 })}>›</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FilterTabs />
          <button className="btn btn-sm" onClick={() => setView('month')}>月视图</button>
          <button className="btn btn-sm" onClick={() => setShowExport('photo')}>📷 照片</button>
          <button className="btn btn-sm" onClick={() => setShowExport('excel')}>📊 Excel</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {MONTHS.map((mName, m) => {
          const days = getDaysInMonth(current.year, m)
          const firstDay = getFirstDayWeekday(current.year, m)
          const cells = []
          for (let i = 0; i < firstDay; i++) cells.push(null)
          for (let d = 1; d <= days; d++) cells.push(d)
          return (
            <div key={m} className="card" style={{ padding: '12px', cursor: 'pointer' }} onClick={() => { setCurrent({ ...current, month: m }); setView('month') }}>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-2)' }}>{mName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {cells.map((d, i) => { const ds = d ? fmtDate(current.year, m, d) : ''; const has = d && getEvents(ds).length > 0; return <div key={i} style={{ textAlign: 'center', fontSize: '9px', padding: '1px', color: has ? 'var(--accent)' : 'var(--text-3)', fontWeight: ds === todayStr ? 700 : 400 }}>{d || ''}</div> })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {msg && <div style={{ padding: '8px 14px', borderRadius: '6px', marginBottom: '16px', background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: '13px' }}>{msg}</div>}
      {view === 'month' ? renderMonth() : renderYear()}
      {showAddEvent && <EventModal title="添加事件" data={showAddEvent} categories={categories} onSave={handleAddEvent} onClose={() => setShowAddEvent(null)} />}
      {editingEvent && <EventModal title="编辑事件" data={editingEvent} categories={categories} onSave={handleSaveEdit} onClose={() => setEditingEvent(null)} />}
      {showExport && <ExportModal type={showExport} onClose={() => setShowExport(null)} onConfirm={(scope) => showExport === 'photo' ? handleSavePhoto(scope) : handleExportExcel(scope)} />}
    </div>
  )
}

function ExportModal({ type, onClose, onConfirm }) {
  const [scope, setScope] = useState('all')
  const label = type === 'photo' ? '导出图片' : '导出 Excel'
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '360px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{label}</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>选择导出内容</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{id:'all',label:'📅 全部'},{id:'contest',label:'🏆 竞赛'},{id:'todo',label:'✓ 任务'}].map(f => (
              <button key={f.id} onClick={() => setScope(f.id)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: scope === f.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: scope === f.id ? 'var(--accent-bg)' : 'var(--surface-2)', color: scope === f.id ? 'var(--accent)' : 'var(--text-2)', transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
          </div>
          {type === 'photo' && <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>导出为白色背景 PNG 图片</p>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onConfirm(scope)}>导出</button>
        </div>
      </div>
    </div>
  )
}

function EventModal({ title, data, categories, onSave, onClose }) {
  const [form, setForm] = useState({ title: data.title || '', date: data.date || '', endDate: data.endDate || '', category: data.category || 'study', desc: data.desc || '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{title}</h3><button className="btn btn-icon" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input className="input" placeholder="事件标题" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>📅 开始日期</label>
              <DatePicker value={form.date} onChange={v => set('date', v)} placeholder="选择开始日期" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>📅 结束日期（可选）</label>
              <DatePicker value={form.endDate} onChange={v => set('endDate', v)} placeholder="选择结束日期" style={{ width: '100%' }} />
            </div>
          </div>
          {form.date && form.endDate && form.endDate < form.date && (
            <div style={{ fontSize: '11px', color: '#e55', padding: '4px 8px', background: '#e552', borderRadius: '4px' }}>⚠️ 结束日期不能早于开始日期</div>
          )}
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea className="textarea" placeholder="描述（可选）" value={form.desc} onChange={e => set('desc', e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.title || !form.date || (form.endDate && form.endDate < form.date)}>保存</button>
        </div>
      </div>
    </div>
  )
}
