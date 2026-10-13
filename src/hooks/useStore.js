import { useState, useEffect, useCallback, useRef } from 'react'
import { genId } from '../utils/storage'
import { fetchData, saveData, hasToken } from '../utils/githubApi'

// 合并本地和远程数据（按 ID 去重，本地优先），防止多用户互相覆盖
// deletedIds: 当前用户刚删除的 ID 集合，这些 ID 不应从远程拉回来
const DEFAULT_DATA = {
  todos: [],
  contests: [],
  categories: [
    { id: 'study', name: '学习', color: '#2d7d6e' },
    { id: 'work', name: '工作', color: '#3b5998' },
    { id: 'contest', name: '竞赛', color: '#b04050' },
    { id: 'life', name: '生活', color: '#b07000' },
  ],
  priorities: [
    { id: 'urgent', name: '紧急', color: '#c5453d', level: 4 },
    { id: 'high', name: '高', color: '#e67e22', level: 3 },
    { id: 'medium', name: '中', color: '#f1c40f', level: 2 },
    { id: 'low', name: '低', color: '#27ae60', level: 1 },
  ],
  contestCategories: [
    { id: 'algorithm', name: '算法', color: '#2d7d6e' },
    { id: 'math', name: '数学', color: '#3b5998' },
    { id: 'programming', name: '编程', color: '#b04050' },
    { id: 'other', name: '其他', color: '#b07000' },
  ],
  announcements: [],
  resources: [],
  resourceCategories: [
    { id: 'algo', name: '算法', color: '#2d7d6e' },
    { id: 'math', name: '数学', color: '#3b5998' },
    { id: 'prog', name: '编程', color: '#b04050' },
    { id: 'ebook', name: '电子书', color: '#b07000' },
    { id: 'video', name: '视频教程', color: '#7c5cbf' },
    { id: 'other', name: '其他', color: '#6e7681' },
  ],
  suggestions: [],
}

const ARRAY_FIELDS = ['todos', 'contests', 'announcements', 'resources', 'suggestions']
// 分类/优先级也按 ID 合并，防止多用户修改互相覆盖
const CATEGORY_FIELDS = ['categories', 'priorities', 'contestCategories', 'resourceCategories']
function mergeForSave(localData, remoteData, deletedIds) {
  if (!remoteData) return localData
  const merged = { ...localData }
  for (const field of ARRAY_FIELDS) {
    const localArr = localData[field] || []
    const remoteArr = remoteData[field] || []
    const localIds = new Set(localArr.map(item => item.id))
    // 保留远程有但本地没有的（其他用户新增的），但要排除当前用户刚删除的
    const remoteOnly = remoteArr.filter(item => !localIds.has(item.id) && !deletedIds.has(item.id))
    merged[field] = [...localArr, ...remoteOnly]
  }
  // 合并分类/优先级字段（按 ID 去重，本地优先但保留远程新增的）
  for (const field of CATEGORY_FIELDS) {
    const localArr = localData[field] || []
    const remoteArr = remoteData[field] || []
    const localIds = new Set(localArr.map(item => item.id))
    const remoteOnly = remoteArr.filter(item => !localIds.has(item.id))
    merged[field] = [...localArr, ...remoteOnly]
  }
  return merged
}
// 轮询合并：以远程为基准，保留本地独有的（未保存的新增）
// deletedIds: 当前用户刚删除的 ID，不应从远程拉回来
function mergeForPoll(localData, remoteData, deletedIds) {
  if (!remoteData) return localData
  const merged = { ...DEFAULT_DATA, ...remoteData }
  for (const field of ARRAY_FIELDS) {
    const localArr = localData[field] || []
    const remoteArr = remoteData[field] || []
    // 远程数据中排除当前用户刚删除的
    const remoteFiltered = remoteArr.filter(item => !deletedIds.has(item.id))
    const remoteIds = new Set(remoteFiltered.map(item => item.id))
    const localOnly = localArr.filter(item => !remoteIds.has(item.id))
    merged[field] = [...remoteFiltered, ...localOnly]
  }
  // 合并分类/优先级字段（以远程为基准，保留本地独有的新增）
  for (const field of CATEGORY_FIELDS) {
    const localArr = localData[field] || []
    const remoteArr = remoteData[field] || []
    const remoteIds = new Set(remoteArr.map(item => item.id))
    const localOnly = localArr.filter(item => !remoteIds.has(item.id))
    merged[field] = [...remoteArr, ...localOnly]
  }
  return merged
}


export function useStore() {
  const [data, setData] = useState(DEFAULT_DATA)
  const [dataReady, setDataReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const saveTimer = useRef(null)
  const savingRef = useRef(false)  // 防止并发保存
  const latestData = useRef(DEFAULT_DATA)
  // 跟踪当前用户删除的 ID，防止合并时从远程拉回来
  // 保存成功后清空（远程已反映删除）
  const deletedIds = useRef(new Set())

  // 加载数据 from GitHub
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const remote = await fetchData()
        if (!cancelled && remote) {
          const merged = { ...DEFAULT_DATA, ...remote }
          setData(merged)
          latestData.current = merged
        }
      } catch (e) {
        console.error('加载数据失败, 使用默认数据:', e.message)
      }
      if (!cancelled) setDataReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // 自动轮询：每 30 秒拉取最新数据并合并（不覆盖本地未保存的新增，不拉回已删除的）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const remote = await fetchData()
        if (!remote) return
        setData(prev => {
          const merged = mergeForPoll(prev, remote, deletedIds.current)
          latestData.current = merged
          return merged
        })
      } catch {}
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // 防抖保存到 GitHub（保存前先合并远程数据，防止覆盖其他用户的改动）
  const scheduleSave = useCallback((newData) => {
    latestData.current = newData
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!hasToken()) return
      if (savingRef.current) return  // 已有保存进行中，跳过（下次轮询会合并）
      savingRef.current = true
      setSaving(true)
      setSaveError(null)
      try {
        // 先拉取远程最新数据，合并后再保存
        let remote = null
        try { remote = await fetchData() } catch {}
        const merged = mergeForSave(latestData.current, remote, deletedIds.current)
        latestData.current = merged
        await saveData(merged)
        // 保存成功，清空已删除 ID 集合（远程已反映删除）
        deletedIds.current = new Set()
      } catch (e) {
        setSaveError(e.message)
        console.error('保存失败:', e.message)
      }
      savingRef.current = false
      setSaving(false)
    }, 800)
  }, [])

  // 更新数据并触发保存
  const update = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  // 标记删除：记录 ID 并更新数据（限制集合大小防止内存泄漏）
  const markDeleted = useCallback((id) => {
    deletedIds.current.add(id)
    // 超过 500 条时清理最早的（FIFO），防止无限增长
    if (deletedIds.current.size > 500) {
      const arr = Array.from(deletedIds.current)
      deletedIds.current = new Set(arr.slice(-500))
    }
  }, [])

  // 手动刷新（使用 mergeForPoll 过滤已删除的 ID，防止复活）
  const refresh = useCallback(async () => {
    try {
      const remote = await fetchData()
      if (!remote) return false
      setData(prev => {
        const merged = mergeForPoll(prev, remote, deletedIds.current)
        latestData.current = merged
        return merged
      })
      return true
    } catch (e) {
      console.error('刷新失败:', e.message)
      return false
    }
  }, [])

  // === Todo ===
  const addTodo = useCallback((todo) => {
    const newTodo = {
      id: genId(), title: todo.title || '新任务', category: todo.category || 'study',
      priority: todo.priority || 'medium', completed: false, date: todo.date || null,
      endDate: todo.endDate || null, showOnCalendar: todo.showOnCalendar ?? false,
      desc: todo.desc || '', createdAt: new Date().toISOString(),
    }
    update(prev => ({ ...prev, todos: [newTodo, ...prev.todos] }))
    return newTodo
  }, [update])
  const updateTodo = useCallback((id, updates) => { update(prev => ({ ...prev, todos: prev.todos.map(t => t.id === id ? { ...t, ...updates } : t) })) }, [update])
  const deleteTodo = useCallback((id) => { markDeleted(id); update(prev => ({ ...prev, todos: prev.todos.filter(t => t.id !== id) })) }, [update, markDeleted])
  const toggleTodo = useCallback((id) => { update(prev => ({ ...prev, todos: prev.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })) }, [update])
  const importTodos = useCallback((newTodos, mode = 'append') => {
    update(prev => {
      if (mode === 'replace') return { ...prev, todos: newTodos.map(t => ({ ...t, id: t.id || genId() })) }
      const ex = new Set(prev.todos.map(t => t.id)); const add = []; const upd = new Map()
      newTodos.forEach(t => { if (ex.has(t.id)) upd.set(t.id, t); else add.push({ ...t, id: t.id || genId() }) })
      return { ...prev, todos: [...add, ...prev.todos.map(t => upd.has(t.id) ? upd.get(t.id) : t)] }
    })
  }, [update])

  // === Contest ===
  const addContest = useCallback((contest) => {
    const newContest = {
      id: genId(), name: contest.name || '未命名竞赛', category: contest.category || 'algorithm',
      startDate: contest.startDate || '', endDate: contest.endDate || '', url: contest.url || '',
      desc: contest.desc || '', showOnCalendar: contest.showOnCalendar ?? true, createdAt: new Date().toISOString(),
    }
    update(prev => ({ ...prev, contests: [...prev.contests, newContest] }))
    return newContest
  }, [update])
  const updateContest = useCallback((id, updates) => { update(prev => ({ ...prev, contests: prev.contests.map(c => c.id === id ? { ...c, ...updates } : c) })) }, [update])
  const deleteContest = useCallback((id) => { markDeleted(id); update(prev => ({ ...prev, contests: prev.contests.filter(c => c.id !== id) })) }, [update, markDeleted])
  const importContests = useCallback((newContests, mode = 'append') => {
    update(prev => {
      if (mode === 'replace') return { ...prev, contests: newContests.map(c => ({ ...c, id: c.id || genId() })) }
      const ex = new Set(prev.contests.map(c => c.id)); const add = []; const upd = new Map()
      newContests.forEach(c => { if (ex.has(c.id)) upd.set(c.id, c); else add.push({ ...c, id: c.id || genId() }) })
      return { ...prev, contests: [...add, ...prev.contests.map(c => upd.has(c.id) ? upd.get(c.id) : c)] }
    })
  }, [update])

  // === Categories ===
  const addCategory = useCallback((cat) => { update(prev => ({ ...prev, categories: [...prev.categories, { id: genId(), ...cat }] })) }, [update])
  const updateCategory = useCallback((id, updates) => { update(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c) })) }, [update])
  const deleteCategory = useCallback((id) => { update(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) })) }, [update])
  const addContestCategory = useCallback((cat) => { update(prev => ({ ...prev, contestCategories: [...prev.contestCategories, { id: genId(), ...cat }] })) }, [update])
  const updateContestCategory = useCallback((id, updates) => { update(prev => ({ ...prev, contestCategories: prev.contestCategories.map(c => c.id === id ? { ...c, ...updates } : c) })) }, [update])
  const deleteContestCategory = useCallback((id) => { update(prev => ({ ...prev, contestCategories: prev.contestCategories.filter(c => c.id !== id) })) }, [update])

  // === Priorities ===
  const addPriority = useCallback((pri) => { update(prev => ({ ...prev, priorities: [...prev.priorities, { id: genId(), ...pri }] })) }, [update])
  const updatePriority = useCallback((id, updates) => { update(prev => ({ ...prev, priorities: prev.priorities.map(p => p.id === id ? { ...p, ...updates } : p) })) }, [update])
  const deletePriority = useCallback((id) => { update(prev => ({ ...prev, priorities: prev.priorities.filter(p => p.id !== id) })) }, [update])

  // === Announcements ===
  const addAnnouncement = useCallback((ann) => {
    const newAnn = {
      id: genId(), title: ann.title || '无标题', content: ann.content || '',
      author: ann.author || '管理员', pinned: ann.pinned ?? false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    update(prev => ({ ...prev, announcements: [newAnn, ...prev.announcements] }))
    return newAnn
  }, [update])
  const updateAnnouncement = useCallback((id, updates) => {
    update(prev => ({ ...prev, announcements: prev.announcements.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a) }))
  }, [update])
  const deleteAnnouncement = useCallback((id) => { markDeleted(id); update(prev => ({ ...prev, announcements: prev.announcements.filter(a => a.id !== id) })) }, [update, markDeleted])

  // === Resources ===
  const addResource = useCallback((res) => {
    const newRes = {
      id: genId(), category: res.category || 'other', drive: res.drive || '',
      url: res.url || '', sharePassword: res.sharePassword || '',
      note: res.note || '', sharer: res.sharer || '',
      createdAt: new Date().toISOString(),
    }
    update(prev => ({ ...prev, resources: [newRes, ...prev.resources] }))
    return newRes
  }, [update])
  const updateResource = useCallback((id, updates) => { update(prev => ({ ...prev, resources: prev.resources.map(r => r.id === id ? { ...r, ...updates } : r) })) }, [update])
  const deleteResource = useCallback((id) => { markDeleted(id); update(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== id) })) }, [update, markDeleted])
  const importResources = useCallback((newResources, mode = 'append') => {
    update(prev => {
      if (mode === 'replace') return { ...prev, resources: newResources.map(r => ({ ...r, id: r.id || genId() })) }
      const ex = new Set(prev.resources.map(r => r.id)); const add = []; const upd = new Map()
      newResources.forEach(r => { if (ex.has(r.id)) upd.set(r.id, r); else add.push({ ...r, id: r.id || genId() }) })
      return { ...prev, resources: [...add, ...prev.resources.map(r => upd.has(r.id) ? upd.get(r.id) : r)] }
    })
  }, [update])
  const addResourceCategory = useCallback((cat) => { update(prev => ({ ...prev, resourceCategories: [...prev.resourceCategories, { id: genId(), ...cat }] })) }, [update])
  const updateResourceCategory = useCallback((id, updates) => { update(prev => ({ ...prev, resourceCategories: prev.resourceCategories.map(c => c.id === id ? { ...c, ...updates } : c) })) }, [update])
  const deleteResourceCategory = useCallback((id) => { update(prev => ({ ...prev, resourceCategories: prev.resourceCategories.filter(c => c.id !== id) })) }, [update])

  // === Suggestions ===
  const addSuggestion = useCallback((sugg) => {
    const newSugg = {
      id: genId(), title: sugg.title || "", content: sugg.content || "",
      author: sugg.author || "匿名用户", createdAt: new Date().toISOString(),
      comments: [],
    }
    update(prev => ({ ...prev, suggestions: [newSugg, ...prev.suggestions] }))
    return newSugg
  }, [update])
  const deleteSuggestion = useCallback((id) => { markDeleted(id); update(prev => ({ ...prev, suggestions: prev.suggestions.filter(s => s.id !== id) })) }, [update, markDeleted])
  const addComment = useCallback((suggId, comment) => {
    const newComment = { id: genId(), content: comment.content || "", author: comment.author || "匿名用户", createdAt: new Date().toISOString() }
    update(prev => ({ ...prev, suggestions: prev.suggestions.map(s => s.id === suggId ? { ...s, comments: [...(s.comments || []), newComment] } : s) }))
  }, [update])
  const deleteComment = useCallback((suggId, commentId) => {
    update(prev => ({ ...prev, suggestions: prev.suggestions.map(s => s.id === suggId ? { ...s, comments: (s.comments || []).filter(c => c.id !== commentId) } : s) }))
  }, [update])

  return {
    ...data,
    dataReady, saving, saveError, refresh,
    addTodo, updateTodo, deleteTodo, toggleTodo, importTodos,
    addContest, updateContest, deleteContest, importContests,
    addCategory, updateCategory, deleteCategory,
    addContestCategory, updateContestCategory, deleteContestCategory,
    addPriority, updatePriority, deletePriority,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addResource, updateResource, deleteResource, importResources,
    addResourceCategory, updateResourceCategory, deleteResourceCategory,
    addSuggestion, deleteSuggestion, addComment, deleteComment,
  }
}
