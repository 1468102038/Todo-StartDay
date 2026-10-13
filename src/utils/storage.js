// 存储工具 — 基于 localStorage + AES-GCM 加密
// 所有数据加密后存储，没有密码无法读取
// 加密层异步初始化，未就绪时返回默认值

import { encrypt, decrypt, isCryptoReady } from './crypto'

const STORAGE_PREFIX = 'sd:'

// 加密存储（异步）
export async function saveDataSecure(key, value) {
  try {
    const json = JSON.stringify(value)
    const encrypted = await encrypt(json)
    localStorage.setItem(STORAGE_PREFIX + key, encrypted)
  } catch (e) {
    console.error('加密存储失败:', e)
  }
}

// 加密读取（异步）
export async function loadDataSecure(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return defaultValue
    if (!isCryptoReady()) return defaultValue
    const json = await decrypt(raw)
    return JSON.parse(json)
  } catch {
    // 解密失败（密码错误或数据损坏）
    return defaultValue
  }
}

// 同步保存（用于不需要加密的元数据）
export function saveMeta(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'meta:' + key, JSON.stringify(value))
  } catch (e) {
    console.error('保存失败:', e)
  }
}

export function loadMeta(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'meta:' + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export function removeData(key) {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

// 生成唯一ID（优先使用 crypto.randomUUID，回退到时间戳+随机数）
export function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// 格式化日期
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 解析日期
export function parseDate(str) {
  if (!str) return null
  return new Date(str)
}

// 检查日期是否在范围内
export function isDateInRange(date, start, end) {
  const d = new Date(date)
  const s = new Date(start)
  const e = end ? new Date(end) : new Date(start)
  d.setHours(0, 0, 0, 0)
  s.setHours(0, 0, 0, 0)
  e.setHours(23, 59, 59, 999)
  return d >= s && d <= e
}
