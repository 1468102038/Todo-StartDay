// 安全配置 — 秘密路由路径和密码哈希
// ⚠️ 生产构建会被 minify，但这些值仍存在于 JS 中
// 真正的安全靠第4层 AES 数据加密，即使破解了密码，数据也加密在 localStorage 中

// 秘密入口路径（hash 路由）
// 访问方式：https://<username>.github.io/Todo-StartDay/#/s7x9k2m4
export const SECRET_ROUTE = 's7x9k2m4'

// 密码的 SHA-256 哈希值（不是明文密码，不存储明文）
// 默认哈希 — 超级管理员可在管理页面中修改，修改后存储到 localStorage
export const DEFAULT_PASSWORD_HASH = '04ad8114015a1b70e69f18fb592217fd97d5f23231d566cae6362fb4b2bac525'
export const DEFAULT_SUPERADMIN_HASH = '6fe0d9cc54962e66553aef01f2966c1cddb86909227d423c4180c6839aa455de'
export const DEFAULT_ADMIN_HASH = 'a3993fbb72f74fd127a0121343f4b280f372cd9bbf31357697d3dd53a7a599f2'

// PBKDF2 参数（用于数据加密的密钥派生）
export const PBKDF2_ITERATIONS = 100000
// PBKDF2 Salt — 结合静态盐和应用标识，增加预计算难度
// 纯前端无法实现每用户随机盐（无安全存储位置），此处用长盐值提高彩虹表成本
export const PBKDF2_SALT = 'StartDay-SecureVault-2026-v1.2-TodoStartDay-1468102038'

// localStorage key for admin-managed password hashes
const ADMIN_HASH_STORE_KEY = 'sd_admin_hashes'
const ADMIN_HASH_SIGN_KEY = 'sd_admin_hashes_sign'
// 签名盐值 — 防止直接篡改 localStorage 中的哈希值
const HASH_SIGN_SALT = 'StartDay-Hash-Integrity-v1'

/**
 * 计算哈希数据的签名（同步简单校验，非密码学安全）
 */
function computeHashSign(hashes) {
  // 简单的异或校验 + 盐值，不是密码学安全，但能防止随意篡改
  const str = JSON.stringify(hashes) + HASH_SIGN_SALT
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

/**
 * 获取当前生效的密码哈希列表。
 * 优先从 localStorage 读取（超级管理员可能修改过），否则用默认值。
 * 包含签名校验：如果签名不匹配（被篡改），回退到默认值。
 * 返回: { userHash, superadminHash, adminHashes: [{hash, label}] }
 */
export function getActiveHashes() {
  try {
    const stored = localStorage.getItem(ADMIN_HASH_STORE_KEY)
    const sign = localStorage.getItem(ADMIN_HASH_SIGN_KEY)
    if (stored && sign) {
      const parsed = JSON.parse(stored)
      // 校验签名，不匹配则回退到默认值
      if (computeHashSign(parsed) !== sign) {
        console.warn('密码哈希签名校验失败，回退到默认值')
        return {
          userHash: DEFAULT_PASSWORD_HASH,
          superadminHash: DEFAULT_SUPERADMIN_HASH,
          adminHashes: [{ hash: DEFAULT_ADMIN_HASH, label: 'admin-1' }],
        }
      }
      return {
        userHash: parsed.userHash || DEFAULT_PASSWORD_HASH,
        superadminHash: parsed.superadminHash || DEFAULT_SUPERADMIN_HASH,
        adminHashes: parsed.adminHashes || [{ hash: DEFAULT_ADMIN_HASH, label: 'admin-1' }],
      }
    }
  } catch (e) {
    // fall through to defaults
  }
  return {
    userHash: DEFAULT_PASSWORD_HASH,
    superadminHash: DEFAULT_SUPERADMIN_HASH,
    adminHashes: [{ hash: DEFAULT_ADMIN_HASH, label: 'admin-1' }],
  }
}

/**
 * 保存密码哈希到 localStorage（仅超级管理员调用）
 * 同时保存签名，防止篡改
 */
export function saveActiveHashes(hashes) {
  const sign = computeHashSign(hashes)
  localStorage.setItem(ADMIN_HASH_STORE_KEY, JSON.stringify(hashes))
  localStorage.setItem(ADMIN_HASH_SIGN_KEY, sign)
}

// 计算字符串的 SHA-256 哈希（返回 hex 字符串）
export async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 使用 PBKDF2 迭代哈希密码（慢速哈希，抵抗暴力破解）
// 返回 hex 字符串，与 sha256 格式一致，可直接替换
export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(PBKDF2_SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 验证密码是否正确（普通用户）
export async function verifyPassword(password) {
  const pbkdf2Hash = await hashPassword(password)
  const { userHash } = getActiveHashes()
  if (pbkdf2Hash === userHash) return true
  // 兼容旧版 SHA-256
  const sha256Hash = await sha256(password)
  return sha256Hash === userHash
}

/**
 * 验证密码并返回角色：'superadmin' | 'admin' | 'user' | null
 * 登录只需输入密码，系统根据哈希匹配自动判定角色。
 */
export async function verifyPasswordWithRole(password) {
  // 先用 PBKDF2 慢速哈希（抵抗暴力破解），再与存储的哈希比较
  const pbkdf2Hash = await hashPassword(password)
  const { userHash, superadminHash, adminHashes } = getActiveHashes()
  // 同时支持 PBKDF2 哈希和旧版 SHA-256 哈希（向后兼容）
  if (pbkdf2Hash === superadminHash) return 'superadmin'
  if (adminHashes.some(a => a.hash === pbkdf2Hash)) return 'admin'
  if (pbkdf2Hash === userHash) return 'user'
  // 回退到旧版 SHA-256（兼容已存储的旧哈希）
  const sha256Hash = await sha256(password)
  if (sha256Hash === superadminHash) return 'superadmin'
  if (adminHashes.some(a => a.hash === sha256Hash)) return 'admin'
  if (sha256Hash === userHash) return 'user'
  return null
}
