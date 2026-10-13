import { useState, useEffect } from 'react'
import { SECRET_ROUTE } from '../utils/security'
import NotFoundPage from './NotFoundPage'
import PasswordGate from './PasswordGate'

// 秘密路由守卫
// 默认显示 404 页面，只有 hash 路由匹配 SECRET_ROUTE 时才加载真实应用
// 真实应用外层包裹 PasswordGate，需要密码才能进入

export default function SecretRouter({ children }) {
  const [showApp, setShowApp] = useState(() => {
    const hash = window.location.hash.slice(2) // 去掉 #/
    return hash === SECRET_ROUTE
  })

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(2)
      setShowApp(hash === SECRET_ROUTE)
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (!showApp) return <NotFoundPage />

  return <PasswordGate>{children}</PasswordGate>
}
