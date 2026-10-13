# StartDay Git 推送手册

> 版本：1.0 | 更新日期：2026-10-12

---

## 目录

1. [环境准备](#1-环境准备)
2. [本地开发](#2-本地开发)
3. [构建项目](#3-构建项目)
4. [提交代码到 Git](#4-提交代码到-git)
5. [推送到 GitHub](#5-推送到-github)
6. [GitHub Pages 部署](#6-github-pages-部署)
7. [完整工作流](#7-完整工作流)
8. [故障排查](#8-故障排查)

---

## 1. 环境准备

### 1.1 需要安装的软件

| 软件 | 用途 | 安装方式 |
|------|------|---------|
| Node.js 18+ | JavaScript 运行时 | https://nodejs.org/ |
| npm | 包管理器（随 Node.js 安装） | 随 Node.js |
| Git | 版本控制 | https://git-scm.com/ |

### 1.2 验证安装

```bash
node --version    # 应显示 v18.x.x 或更高
npm --version     # 应显示 9.x.x 或更高
git --version     # 应显示 git version 2.x.x
```

### 1.3 配置 Git 身份

首次使用需要配置：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

### 1.4 克隆项目

```bash
git clone https://github.com/你的用户名/Todo-StartDay.git
cd Todo-StartDay
```

### 1.5 安装项目依赖

```bash
npm install
```

> 首次安装可能需要几分钟。

---

## 2. 本地开发

### 2.1 启动开发服务器

```bash
npm run dev
```

启动后终端会显示：

```
  ➜  Local:   http://localhost:5173/Todo-StartDay/
  ➜  Network: http://192.168.x.x:5173/Todo-StartDay/
```

### 2.2 访问开发预览

浏览器打开：

```
http://localhost:5173/Todo-StartDay/#/s7x9k2m4
```

> ⚠️ 必须加 `#/s7x9k2m4`，否则显示 404 页面。

### 2.3 开发特性

- **热更新**：修改代码后浏览器自动刷新
- **错误提示**：代码错误会在终端和浏览器显示
- **端口冲突**：如果 5173 被占用，Vite 会自动切换到 5174 等下一个可用端口

---

## 3. 构建项目

### 3.1 执行构建

```bash
npm run build
```

构建成功后显示：

```
dist/assets/index-xxxxx.css    8.46 kB
dist/assets/index-xxxxx.js   279.01 kB
✓ built in 2.42s
```

### 3.2 构建产物

构建输出在 `dist/` 目录：

```
dist/
├── index.html
└── assets/
    ├── index-xxxxx.css    # 样式
    ├── index-xxxxx.js     # 主逻辑
    ├── xlsx-xxxxx.js      # Excel 库
    └── html2canvas-xxxxx.js  # 截图库
```

### 3.3 本地预览构建结果

```bash
npm run preview
```

然后打开 `http://localhost:4173/Todo-StartDay/#/s7x9k2m4` 预览。

### 3.4 构建注意事项

- `dist/` 目录在 `.gitignore` 中被忽略，不会被提交到 Git
- GitHub Pages 部署使用 GitHub Actions 自动构建，不需要手动提交 dist
- 如果构建报错，检查代码语法错误

---

## 4. 提交代码到 Git

### 4.1 查看修改状态

```bash
git status
```

### 4.2 暂存修改

```bash
# 暂存所有修改
git add -A

# 或只暂存特定文件
git add src/pages/CalendarPage.jsx
```

### 4.3 提交修改

```bash
git commit -m "描述这次修改做了什么"
```

**提交信息规范：**
- 用中文简明描述改动内容
- 例：`"修改日历跨天事件显示为连续横条"`
- 例：`"修改密码：普通用户 Convey-Start2026，管理员 xzl-041211"`

### 4.4 查看提交历史

```bash
git log --oneline -10
```

---

## 5. 推送到 GitHub

### 5.1 标准推送

```bash
git push origin main
```

### 5.2 首次推送（新仓库）

```bash
git remote add origin https://github.com/你的用户名/Todo-StartDay.git
git push -u origin main
```

### 5.3 推送认证

**方式一：Personal Access Token（推荐）**
1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. 勾选 `repo` 权限
3. 推送时用户名填 GitHub 用户名，密码填 token

**方式二：SSH 密钥**
1. 生成密钥：`ssh-keygen -t ed25519 -C "你的邮箱"`
2. 将公钥添加到 GitHub → Settings → SSH and GPG keys
3. 远程地址改为 SSH：`git remote set-url origin git@github.com:用户名/Todo-StartDay.git`

### 5.4 推送后验证

推送成功后显示：

```
To https://github.com/用户名/Todo-StartDay.git
   旧commit哈希..新commit哈希  main -> main
```

---

## 6. GitHub Pages 部署

### 6.1 自动部署（已配置）

本项目使用 GitHub Actions 自动部署。推送代码到 `main` 分支后：

```
git push → GitHub Actions 自动触发 → npm install → npm run build → 部署 dist 到 Pages
```

### 6.2 查看部署状态

1. 打开 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 查看最新的 workflow 运行状态
   - 🟡 黄色圆圈：正在构建
   - 🟢 绿色勾：构建成功
   - 🔴 红色叉：构建失败

### 6.3 访问部署的网站

```
https://你的用户名.github.io/Todo-StartDay/#/s7x9k2m4
```

### 6.4 GitHub Pages 设置

1. GitHub 仓库 → Settings → Pages
2. Source 应设为 **GitHub Actions**
3. 如果显示部署失败，检查 Actions 日志

### 6.5 部署时间

- 推送后 GitHub Actions 通常需要 1-3 分钟完成构建
- 构建完成后页面立即更新
- 如果页面没更新，等待1分钟后刷新

---

## 7. 完整工作流

### 7.1 日常修改流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 启动开发服务器
npm run dev

# 3. 修改代码，在浏览器中验证效果
#    （修改 src/ 下的文件，保存后自动刷新）

# 4. 确认无误后，构建验证
npm run build

# 5. 提交修改
git add -A
git commit -m "描述修改内容"

# 6. 推送到 GitHub
git push origin main

# 7. 等待 GitHub Actions 自动部署（1-3分钟）

# 8. 访问 https://用户名.github.io/Todo-StartDay/#/s7x9k2m4 验证
```

### 7.2 修改密码的完整流程

```bash
# 1. 计算新密码的 SHA-256 哈希
echo -n "新密码" | sha256sum | awk '{print $1}'
# 输出类似：04ad8114015a1b70e69f18fb592217fd...

# 2. 编辑 src/utils/security.js，替换对应哈希值
#    更新注释中的密码明文

# 3. 构建验证
npm run build

# 4. 提交推送
git add -A
git commit -m "修改用户密码"
git push origin main

# 5. 等待部署完成后，用新密码登录
```

### 7.3 添加新功能的流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支（可选但推荐）
git checkout -b feature/新功能名

# 3. 开发并测试
npm run dev
# （修改代码，验证效果）

# 4. 构建验证
npm run build

# 5. 提交
git add -A
git commit -m "添加新功能：功能描述"

# 6. 合并到 main（如果在分支上）
git checkout main
git merge feature/新功能名

# 7. 推送
git push origin main

# 8. 删除功能分支（可选）
git branch -d feature/新功能名
```

---

## 8. 故障排查

### 8.1 npm install 失败

```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**xlsx 安装失败：** xlsx 使用 CDN 地址安装，需要网络可访问 `cdn.sheetjs.com`。

### 8.2 npm run dev 端口被占用

```bash
# 方式一：换端口
npm run dev -- --port 5174

# 方式二：杀掉占用端口的进程
lsof -i :5173
kill -9 <PID>
```

### 8.3 npm run build 失败

- `Unexpected token` — JSX 语法错误，检查标签闭合
- `Module not found` — import 路径错误或依赖未安装
- `Cannot resolve` — 文件路径错误

### 8.4 git push 失败

**`fatal: unable to access`：**
```bash
git remote -v
git remote set-url origin https://github.com/用户名/Todo-StartDay.git
```

**`! [rejected] main -> main (fetch first)`：**
```bash
git pull origin main
git push origin main
```

### 8.5 GitHub Pages 显示 404

1. 确认加了 `#/s7x9k2m4` — 不加会显示404是正常的
2. 检查 GitHub Actions 是否构建成功
3. 检查 Settings → Pages → Source 是否为 GitHub Actions
4. 等待1-3分钟让部署完成

### 8.6 GitHub Actions 构建失败

1. 打开仓库 → Actions 标签
2. 点击失败的 workflow run
3. 查看错误日志
4. 常见原因：npm install 失败、代码语法错误、Node 版本不兼容

### 8.7 推送后网页没更新

1. 确认推送成功（终端显示 `main -> main`）
2. 检查 Actions 是否还在构建中（黄色圆圈）
3. 构建成功后，强制刷新浏览器：`Ctrl+Shift+R`（Mac: `Cmd+Shift+R`）
4. 检查是否推送到了 `main` 分支

### 8.8 修改密码后数据丢失

**原因：** 密码用于派生加密密钥，换密码后旧密钥失效。

**预防：** 修改密码前先导出重要数据（Excel 导出）。

**恢复：** 换密码后数据重置为空，需要重新添加或从 Excel 导入。

### 8.9 DevBridge 隧道断开

1. 检查本地 dev server 是否在运行
2. 重启 dev server：`npm run dev`
3. 重建隧道（停止旧隧道 host，创建新的）
4. 验证新链接返回 HTTP 200

---

> 📖 使用操作请参考 [使用手册](./使用手册.md)
> 📖 技术细节请参考 [项目文件解析](./项目文件解析.md)
