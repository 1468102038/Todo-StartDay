// 404 伪装页面 — 仿 GitHub 404 风格
// 目的：让外人访问时以为这是一个不存在的页面

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
      color: '#c9d1d9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      margin: 0,
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{
          fontSize: '120px',
          fontWeight: 700,
          color: '#f85149',
          margin: '0 0 16px 0',
          lineHeight: 1,
          letterSpacing: '-4px',
        }}>404</h1>
        <p style={{
          fontSize: '20px',
          color: '#8b949e',
          margin: '0 0 32px 0',
          fontWeight: 400,
        }}>This page doesn't exist.</p>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto',
          padding: '16px',
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '14px', color: '#8b949e', margin: '0 0 8px 0' }}>
            If you believe this is a mistake, please contact the site owner.
          </p>
          <p style={{ fontSize: '13px', color: '#484f58', margin: 0 }}>
            Error ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}
          </p>
        </div>
        <p style={{
          fontSize: '12px',
          color: '#484f58',
          marginTop: '40px',
        }}>GitHub Pages · Site not found</p>
      </div>
    </div>
  )
}
