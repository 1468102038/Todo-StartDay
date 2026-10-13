import { useState, useEffect } from 'react'
import { useStore } from './hooks/useStore'
import TodoPage from './pages/TodoPage'
import CalendarPage from './pages/CalendarPage'
import ContestPage from './pages/ContestPage'
import AnnouncementPage from './pages/AnnouncementPage'
import ResourcePage from './pages/ResourcePage'
import SuggestionPage from './pages/SuggestionPage'
import { clearAuth, getRole } from './components/PasswordGate'
import { hasToken, setToken } from './utils/githubApi'

const THEME_KEY = 'sd:theme'
const THEMES = [
  { id: 'white', name: '白', icon: '☀' },
  { id: 'gray', name: '灰', icon: '◐' },
  { id: 'dark', name: '暗', icon: '☾' },
]

const PAGES = [
  { id: 'calendar', name: '日历', icon: '◇' },
  { id: 'todo', name: '任务', icon: '✓' },
  { id: 'contest', name: '竞赛', icon: '🏆' },
  { id: 'announcement', name: '公告', icon: '📢' },
  { id: 'resource', name: '资料', icon: '📁' },
  { id: 'suggestion', name: '建议', icon: '💡' },
]

export default function App() {
  const store = useStore()
  const [role, setRole] = useState(() => getRole())
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('sd:currentPage') || 'calendar'
  })
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'white')
  const [showTokenModal, setShowTokenModal] = useState(false)

  useEffect(() => {
    localStorage.setItem('sd:currentPage', currentPage)
  }, [currentPage])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.className = `theme-${theme}`
  }, [theme])

  useEffect(() => {
    const handler = (e) => { if (e.detail) setRole(e.detail) }
    window.addEventListener('sd:role', handler)
    return () => window.removeEventListener('sd:role', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      // 忽略带修饰键的按键（Ctrl/Cmd/Alt/Meta）
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'n') { e.preventDefault(); setCurrentPage('todo') }
      if (e.key === '/') { e.preventDefault(); setCurrentPage('todo') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => { clearAuth(); window.location.reload() }
  const isAdmin = role === 'admin' || role === 'superadmin'
  const canEdit = true                    // 所有登录用户可编辑（任务/日历/竞赛/建议）
  const canAdmin = isAdmin              // 仅管理员可编辑（公告/资料）

  const pageTitles = {
    todo: '任务', calendar: '日历', contest: '竞赛',
    announcement: '公告', resource: '资料', suggestion: '建议',
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'todo': return <TodoPage store={store} canEdit={canEdit} />
      case 'calendar': return <CalendarPage store={store} canEdit={canEdit} />
      case 'contest': return <ContestPage store={store} canEdit={canEdit} />
      case 'announcement': return <AnnouncementPage store={store} isAdmin={canAdmin} />
      case 'resource': return <ResourcePage store={store} isAdmin={canAdmin} />
      case 'suggestion': return <SuggestionPage store={store} isAdmin={canEdit} />
      default: return <CalendarPage store={store} canEdit={canEdit} />
    }
  }

  if (!store.dataReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)', fontSize: '14px' }}>
        加载中...
      </div>
    )
  }

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <span>✦</span>
          <span>StartDay</span>
        </div>
        <div className="sidebar-nav">
          {PAGES.map(page => (
            <div key={page.id}
              className={`sidebar-item ${currentPage === page.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(page.id)}>
              <span className="sidebar-item-icon">{page.icon}</span>
              <span>{page.name}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          {/* 保存状态 */}
          {store.saving && <div style={{ fontSize: '11px', color: 'var(--text-3)', padding: '2px 12px' }}>⏳ 同步中...</div>}
          {store.saveError && <div style={{ fontSize: '11px', color: 'var(--danger)', padding: '2px 12px' }}>⚠ {store.saveError}</div>}
          {/* 管理员 Token 设置 */}
          {isAdmin && (
            <div className="sidebar-item" onClick={() => setShowTokenModal(true)} style={{ fontSize: '12px', color: hasToken() ? 'var(--accent)' : 'var(--text-3)' }}>
              <span className="sidebar-item-icon">⚙</span>
              <span>{hasToken() ? '已连接' : '设置 Token'}</span>
            </div>
          )}
          {/* 主题切换 */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', marginBottom: '4px' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  padding: '4px',
                  justifyContent: 'center',
                  background: theme === t.id ? 'var(--accent-bg)' : 'var(--surface-2)',
                  color: theme === t.id ? 'var(--accent)' : 'var(--text-3)',
                  fontSize: '11px',
                }}
                title={`切换到${t.name}色主题`}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <div className="sidebar-item" onClick={handleLogout} style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            <span className="sidebar-item-icon">←</span>
            <span>退出</span>
          </div>
        </div>
      </div>
      <div className="main-content">
        <div className="main-header">
          <h1>{pageTitles[currentPage]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentPage === 'todo' && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{store.todos.filter(t => !t.completed).length} 项待办</span>}
            {currentPage === 'announcement' && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{store.announcements.length} 篇公告</span>}
            {currentPage === 'resource' && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{store.resources.length} 条资料</span>}
            {currentPage === 'suggestion' && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{store.suggestions.length} 条建议</span>}
            {canEdit && <button className="btn btn-sm" onClick={() => store.refresh().then(ok => ok && window.location.reload())} title="从仓库拉取最新数据">🔄 刷新</button>}
          </div>
        </div>
        <div className="main-body">{renderPage()}</div>
      </div>
      {showTokenModal && <TokenModal onClose={() => setShowTokenModal(false)} />}
    </div>
  )
}

function TokenModal({ onClose }) {
  const [tokenInput, setTokenInput] = useState('')
  const [saved, setSaved] = useState(false)
  const existing = hasToken()

  const handleSave = () => {
    setToken(tokenInput)   // 调用 githubApi 的 setToken，写入 localStorage
    setSaved(true)
    setTimeout(() => { onClose(); window.location.reload() }, 1000)
  }

  const handleClear = () => {
    setToken('')            // 清除 localStorage 中的 Token
    setTokenInput('')
    onClose()
    window.location.reload()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>GitHub Token 设置</h3>
          <button className="btn btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            管理员编辑数据后，需要通过 GitHub Token 把改动写回仓库，其他用户才能看到。
            <br />生成方法：GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → 勾选 <code style={{ background: 'var(--surface-2)', padding: '2px 4px', borderRadius: '3px' }}>repo</code> 权限
          </p>
          <input
            className="input" type="password" placeholder="粘贴你的 GitHub Token"
            value={tokenInput} onChange={e => setTokenInput(e.target.value)} autoFocus
          />
          {existing && <p style={{ fontSize: '11px', color: 'var(--accent)' }}>✓ 当前已设置 Token</p>}
          {saved && <p style={{ fontSize: '12px', color: 'var(--accent)' }}>✓ 已保存，正在刷新...</p>}
        </div>
        <div className="modal-footer">
          {existing && <button className="btn btn-danger" onClick={handleClear}>清除</button>}
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!tokenInput}>保存</button>
        </div>
      </div>
    </div>
  )
}
