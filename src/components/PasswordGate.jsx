import { useState, useEffect } from 'react'
import { verifyPasswordWithRole, sha256 } from '../utils/security'

// 密码门控组件 — 登录前不渲染任何业务组件
// 登录只需输入密码，系统自动判定角色（superadmin / admin / user）
// 不显示登录的是谁的账号
// 登录状态保存在 sessionStorage（关闭标签页即退出）
// 防篡改：存储角色+签名，签名由角色和固定盐值计算，直接改 sessionStorage 无法通过校验

const SESSION_KEY = 'sd_auth'
const ROLE_KEY = 'sd_role'
const SIGN_KEY = 'sd_sign'
// 签名盐值 — 不是安全密钥，只是防止随意篡改 sessionStorage 的简单校验
const SIGN_SALT = 'StartDay-Auth-Integrity-v1'

// 计算角色签名
async function computeSign(role) {
  return sha256(role + SIGN_SALT)
}

export function isAuthenticated() {
  // 同步检查：必须有 auth 标记且签名存在（异步校验在 PasswordGate 中完成）
  return sessionStorage.getItem(SESSION_KEY) === '1' && !!sessionStorage.getItem(SIGN_KEY)
}

export function getRole() {
  return sessionStorage.getItem(ROLE_KEY) || 'user'
}

// 异步校验签名是否匹配（防止 sessionStorage 被直接篡改）
export async function verifyAuthIntegrity() {
  const authed = sessionStorage.getItem(SESSION_KEY) === '1'
  if (!authed) return false
  const role = sessionStorage.getItem(ROLE_KEY) || 'user'
  const storedSign = sessionStorage.getItem(SIGN_KEY)
  if (!storedSign) return false
  const expectedSign = await computeSign(role)
  return storedSign === expectedSign
}

export function clearAuth() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(SIGN_KEY)
}

export default function PasswordGate({ children, onAuthenticated }) {
  const [authed, setAuthed] = useState(() => isAuthenticated())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 异步校验签名，防止 sessionStorage 被篡改
    if (authed) {
      verifyAuthIntegrity().then(ok => {
        if (!ok) { clearAuth(); setAuthed(false) }
        else if (onAuthenticated) onAuthenticated()
      })
    }
  }, [authed, onAuthenticated])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const role = await verifyPasswordWithRole(password)
      if (role) {
        const sign = await computeSign(role)
        sessionStorage.setItem(SESSION_KEY, '1')
        sessionStorage.setItem(ROLE_KEY, role)
        sessionStorage.setItem(SIGN_KEY, sign)
        setAuthed(true)
        // 把密码传给加密层（通过自定义事件，不存入任何持久存储）
        window.dispatchEvent(new CustomEvent('sd:password', { detail: password }))
        // 把角色也传出去
        window.dispatchEvent(new CustomEvent('sd:role', { detail: role }))
      } else {
        setError('密码错误')
      }
    } catch {
      setError('验证失败，请重试')
    }
    setLoading(false)
  }

  if (authed) return children

  return (
    <div className="password-gate-outer">
      <div className="password-gate-card">
        <div className="password-gate-header">
          <div className="password-gate-icon">🔒</div>
          <h2>访问验证</h2>
          <p>请输入访问密码</p>
        </div>

        {error && (
          <div className="password-gate-error">{error}</div>
        )}

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
          placeholder="密码"
          autoFocus
          className="password-gate-input"
        />

        <button
          onClick={handleLogin}
          disabled={loading || !password}
          className="password-gate-btn"
        >
          {loading ? '验证中...' : '进入'}
        </button>
      </div>
    </div>
  )
}
