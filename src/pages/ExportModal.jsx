import DatePicker from "../components/DatePicker.jsx"
import { useState, useMemo } from 'react'

/**
 * 通用导出弹窗 — 任务和竞赛共用
 * props:
 *   type: 'todo' | 'contest'
 *   items: 要导出的全部项目数组
 *   catMap: { id -> {name,color} } 分类映射
 *   priMap: { id -> {name,color} } 优先级映射（仅任务）
 *   onClose: 关闭回调
 */
export default function ExportModal({ type, items, catMap, priMap, onClose }) {
  const [mode, setMode] = useState('all')        // all | range | select
  const [format, setFormat] = useState('xlsx')    // xlsx | md
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState(new Set())

  const isTodo = type === 'todo'
  const dateField = isTodo ? 'date' : 'startDate'

  const exportItems = useMemo(() => {
    if (mode === 'all') return items
    if (mode === 'range') {
      return items.filter(it => {
        const d = it[dateField]
        if (!d) return false
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
    }
    if (mode === 'select') return items.filter(it => selected.has(it.id))
    return items
  }, [mode, items, dateFrom, dateTo, selected, dateField])

  const toggleSelect = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const selectAll = () => { setSelected(new Set(items.map(i => i.id))) }
  const selectNone = () => { setSelected(new Set()) }

  const doExport = async () => {
    if (exportItems.length === 0) return
    const ts = new Date().toISOString().slice(0, 10)
    if (format === 'xlsx') {
      await exportExcel(exportItems, ts)
    } else {
      download(buildMarkdown(exportItems), 'text/markdown', `${isTodo ? 'todos' : 'contests'}-${ts}.md`)
    }
    onClose()
  }

  const download = (content, mime, filename) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }

  const exportExcel = async (list, ts) => {
    const XLSX = await import('xlsx')
    let rows
    if (isTodo) {
      rows = list.map(t => ({
        '标题': t.title || '',
        '分类': catMap[t.category]?.name || '',
        '优先级': priMap[t.priority]?.name || '',
        '开始日期': t.date || '',
        '结束日期': t.endDate || '',
        '详情': t.desc || '',
        '已完成': t.completed ? '是' : '否',
        '显示在日历': t.showOnCalendar ? '是' : '否',
      }))
    } else {
      rows = list.map(c => ({
        '名称': c.name || '',
        '分类': catMap[c.category]?.name || '',
        '开始日期': c.startDate || '',
        '结束日期': c.endDate || '',
        '链接': c.url || '',
        '描述': c.desc || '',
        '显示在日历': c.showOnCalendar ? '是' : '否',
      }))
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, isTodo ? '任务' : '竞赛')
    XLSX.writeFile(wb, `${isTodo ? 'todos' : 'contests'}-${ts}.xlsx`)
  }

  const buildMarkdown = (list) => {
    if (isTodo) {
      let md = '# 任务列表\n\n'
      md += `> 导出时间：${new Date().toLocaleString('zh-CN')}\n> 共 ${list.length} 条\n\n`
      const active = list.filter(t => !t.completed)
      const done = list.filter(t => t.completed)
      md += `## 待办（${active.length}）\n\n`
      active.forEach(t => {
        md += `### ${t.title}\n\n`
        md += `- **分类**: ${catMap[t.category]?.name || ''} | **优先级**: ${priMap[t.priority]?.name || ''}\n`
        if (t.date) md += `- **日期**: ${t.date}${t.endDate ? ` → ${t.endDate}` : ''}\n`
        if (t.desc) md += `\n${t.desc}\n`
        md += '\n---\n\n'
      })
      md += `## 已完成（${done.length}）\n\n`
      done.forEach(t => { md += `- ~~${t.title}~~ (${catMap[t.category]?.name || ''})\n` })
      return md
    } else {
      let md = '# 竞赛列表\n\n'
      md += `> 导出时间：${new Date().toLocaleString('zh-CN')}\n> 共 ${list.length} 条\n\n`
      list.forEach(c => {
        md += `### ${c.name}\n\n`
        md += `- **分类**: ${catMap[c.category]?.name || ''}\n`
        if (c.startDate) md += `- **日期**: ${c.startDate}${c.endDate ? ` → ${c.endDate}` : ''}\n`
        if (c.url) md += `- **链接**: ${c.url}\n`
        if (c.desc) md += `\n${c.desc}\n`
        md += '\n---\n\n'
      })
      return md
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导出{isTodo ? '任务' : '竞赛'}</h3>
          <button className="btn btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 格式选择 */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>导出格式</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn btn-sm ${format === 'xlsx' ? 'btn-primary' : ''}`} onClick={() => setFormat('xlsx')}>Excel</button>
              {isTodo && <button className={`btn btn-sm ${format === 'md' ? 'btn-primary' : ''}`} onClick={() => setFormat('md')}>Markdown</button>}
            </div>
          </div>

          {/* 模式选择 */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>导出范围</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${mode === 'all' ? 'btn-primary' : ''}`} onClick={() => setMode('all')}>全部（{items.length}）</button>
              <button className={`btn btn-sm ${mode === 'range' ? 'btn-primary' : ''}`} onClick={() => setMode('range')}>按日期范围</button>
              <button className={`btn btn-sm ${mode === 'select' ? 'btn-primary' : ''}`} onClick={() => setMode('select')}>手动勾选</button>
            </div>
          </div>

          {/* 日期范围 */}
          {mode === 'range' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>从</label>
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="开始日期" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>到</label>
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="结束日期" />
              </div>
            </div>
          )}

          {/* 勾选列表 */}
          {mode === 'select' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button className="btn btn-sm" onClick={selectAll}>全选</button>
                <button className="btn btn-sm" onClick={selectNone}>取消全选</button>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', alignSelf: 'center' }}>已选 {selected.size} 项</span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px' }}>
                {items.map(it => (
                  <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isTodo ? it.title : it.name}
                    </span>
                    {it[dateField] && <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>{it[dateField]}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 预览数量 */}
          <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center' }}>
            将导出 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{exportItems.length}</span> 条{isTodo ? '任务' : '竞赛'}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={doExport} disabled={exportItems.length === 0}>
            导出（{exportItems.length}）
          </button>
        </div>
      </div>
    </div>
  )
}
