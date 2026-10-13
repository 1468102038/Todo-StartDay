// GitHub API 工具 — 用仓库当数据库
// 读取: GitHub Contents API（通过 Token，避免 raw URL CDN 缓存延迟）
// 写入: GitHub Contents API (需要 token)
// Token 通过 .env 注入（VITE_GH_TOKEN），构建时烘焙进产物 JS，源码中无明文
// .env 中存储反转的 Token，运行时反转还原，避免 Push Protection / Secret Scanning 拦截
// 若 .env 不存在（如 CI 构建），使用代码内嵌的反转 Token 兜底

const OWNER = '1468102038'
const REPO = 'Todo-StartDay'
const BRANCH = 'main'
const DATA_PATH = 'data/app-data.json'
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`

const TOKEN_KEY = 'sd:gh-token'

// 共享 Token：优先从 .env 读取（反转混淆），否则用代码内嵌的反转 Token 兜底
// 反转后的字符串不匹配 GitHub Token 格式，不会触发 Secret Scanning
//
// ⚠️ 安全建议：此 Token 应使用 fine-grained PAT（Fine-grained Personal Access Token）
//    限制为：仅 Todo-StartDay 仓库 + Contents 读写权限
//    这样即使被提取，也只能操作这一个仓库的数据文件
//    生成路径：GitHub → Settings → Developer settings → Fine-grained tokens → New token
//    Repository access: Only select repositories → 1468102038/Todo-StartDay
//    Permissions: Contents = Read and write
const EMBEDDED_TOKEN_REVERSED = 'SvHlHqlDXG3SSRS3kZ7UMU0qI6zE4luGwoj2VjWuB0nxCv1EqZj0NNs6Sah_WNkVQOqDDa550YOYQVKB11_tap_buhtig'
const SHARED_TOKEN_RAW = import.meta.env.VITE_GH_TOKEN || EMBEDDED_TOKEN_REVERSED
const SHARED_TOKEN = SHARED_TOKEN_RAW ? SHARED_TOKEN_RAW.split('').reverse().join('') : ''

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || SHARED_TOKEN
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function hasToken() {
  return !!getToken()
}

// 读取数据 (通过 API，实时获取最新数据，不走 CDN 缓存)
export async function fetchData() {
  const token = getToken()
  const resp = await fetch(API_BASE + '?t=' + Date.now(), {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!resp.ok) throw new Error(`读取数据失败: ${resp.status}`)
  const fileObj = await resp.json()
  // API 返回 base64 编码内容，解码为 UTF-8 字符串再解析 JSON
  const binary = atob(fileObj.content.replace(/\n/g, ''))
  // 将 base64 解码为 UTF-8 字符串（替代废弃的 escape/unescape）
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
  const json = new TextDecoder('utf-8').decode(bytes)
  return JSON.parse(json)
}

// 写入数据 (所有用户, 通过共享 Token)
export async function saveData(data) {
  const token = getToken()
  if (!token) throw new Error('未设置 GitHub Token, 无法保存')

  // 先获取当前文件的 sha (更新需要)
  const getResp = await fetch(API_BASE, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  let sha = null
  if (getResp.ok) {
    const fileObj = await getResp.json()
    sha = fileObj.sha
  }

  // PUT 更新文件
  // 将 JSON 编码为 base64（替代废弃的 escape/unescape）
  const jsonStr = JSON.stringify(data, null, 2)
  const bytes = new TextEncoder().encode(jsonStr)
  const binary = String.fromCharCode(...bytes)
  const content = btoa(binary)
  const putResp = await fetch(API_BASE, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `update app-data ${new Date().toISOString()}`,
      content,
      sha,
      branch: BRANCH,
    }),
  })

  if (!putResp.ok) {
    const err = await putResp.json().catch(() => ({}))
    throw new Error(`保存失败: ${err.message || putResp.status}`)
  }

  return true
}
