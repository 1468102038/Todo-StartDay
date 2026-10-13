// 数据加密工具 — 使用 Web Crypto API
// PBKDF2 派生密钥 + AES-GCM 加解密
// 密码不持久存储，仅在登录后通过事件传递，存在内存中

import { PBKDF2_ITERATIONS, PBKDF2_SALT } from './security'

let _cryptoKey = null  // CryptoKey，仅存内存

// 监听密码事件（由 PasswordGate 发出）
// 安全说明：XSS 已通过 DOMPurify 消毒防护（见 utils/sanitize.js）
// 此事件仅在登录时触发一次，密码仅存于内存，不持久化
if (typeof window !== 'undefined') {
  let passwordReceived = false  // 防止重放攻击
  window.addEventListener('sd:password', async (e) => {
    if (passwordReceived) return  // 只接受第一次密码事件
    passwordReceived = true
    try {
      _cryptoKey = await deriveKey(e.detail)
      // 通知应用数据已就绪
      window.dispatchEvent(new CustomEvent('sd:crypto-ready'))
    } catch (err) {
      console.error('密钥派生失败:', err.message)
      window.dispatchEvent(new CustomEvent('sd:crypto-error', { detail: err.message }))
    }
  })
}

// 从密码派生 AES-GCM 密钥
async function deriveKey(password) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// 加密字符串 → 返回 base64(iv + ciphertext)
export async function encrypt(plaintext) {
  if (!_cryptoKey) throw new Error('加密密钥未就绪')
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    _cryptoKey,
    data
  )
  // 拼接 iv + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  // 转 base64
  return btoa(String.fromCharCode(...combined))
}

// 解密 base64(iv + ciphertext) → 返回字符串
export async function decrypt(encryptedBase64) {
  if (!_cryptoKey) throw new Error('加密密钥未就绪')
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    _cryptoKey,
    ciphertext
  )
  return new TextDecoder().decode(decrypted)
}

// 加密密钥是否已就绪
export function isCryptoReady() {
  return _cryptoKey !== null
}
