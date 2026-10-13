import { useState, useRef, useEffect } from 'react'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayWeekday(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }
function pad(n) { return String(n).padStart(2, '0') }
function fmtDate(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}` }
function parseDate(s) { if (!s) return null; const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }

export default function DatePicker({ value, onChange, placeholder = '选择日期', style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const today = new Date()
  const [cal, setCal] = useState(() => {
    const d = value ? parseDate(value) : today
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (value) {
      const d = parseDate(value)
      setCal({ year: d.getFullYear(), month: d.getMonth() })
    }
  }, [value])

  const days = getDaysInMonth(cal.year, cal.month)
  const firstDay = getFirstDayWeekday(cal.year, cal.month)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate())
  const selDate = value || ''

  const pick = (d) => {
    const ds = fmtDate(cal.year, cal.month, d)
    onChange(ds)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div
        className="input"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: value ? 'var(--text)' : 'var(--text-3)', fontSize: '13px' }}>
          {value || placeholder}
        </span>
        <span style={{ fontSize: '14px', opacity: 0.6 }}>📅</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: '240px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button className="btn btn-icon btn-sm" onClick={() => setCal(c => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{cal.year}年 {MONTHS[cal.month]}月</span>
            <button className="btn btn-icon btn-sm" onClick={() => setCal(c => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-3)', padding: '2px' }}>{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const ds = fmtDate(cal.year, cal.month, d)
              const isToday = ds === todayStr
              const isSel = ds === selDate
              return (
                <div key={i}
                  onClick={() => pick(d)}
                  style={{
                    textAlign: 'center', fontSize: '12px', padding: '5px 0', cursor: 'pointer',
                    borderRadius: '4px',
                    background: isSel ? 'var(--accent)' : (isToday ? 'var(--accent-bg)' : 'transparent'),
                    color: isSel ? '#fff' : (isToday ? 'var(--accent)' : 'var(--text-2)'),
                    fontWeight: isSel || isToday ? 600 : 400,
                  }}
                >{d}</div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-sm" onClick={() => { onChange(''); setOpen(false) }}>清除</button>
            <button className="btn btn-sm" onClick={() => { pick(today.getDate()); setCal({ year: today.getFullYear(), month: today.getMonth() }) }}>今天</button>
          </div>
        </div>
      )}
    </div>
  )
}
