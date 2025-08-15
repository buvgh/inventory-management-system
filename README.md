# 库存管理系统

一个功能完整的库存管理系统，支持商品管理、库存跟踪、数据统计等功能。提供 Web 版本和桌面应用版本。

## 🌟 功能特性

- 📦 **商品管理**: 添加、编辑、删除商品信息
- 📊 **库存跟踪**: 实时监控库存数量和状态
- 📈 **数据统计**: 可视化图表展示库存数据
- 🔍 **搜索过滤**: 快速查找和筛选商品
- 💾 **本地存储**: 使用 IndexedDB 本地数据存储
- 🖥️ **跨平台**: 支持 Web 和桌面应用

## 🚀 在线演示

访问 GitHub Pages 部署的在线版本：
[https://yourusername.github.io/inventory-management-system/](https://yourusername.github.io/inventory-management-system/)

## 📦 安装和运行

### 开发环境

```bash
# 克隆项目
git clone https://github.com/yourusername/inventory-management-system.git
cd inventory-management-system

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 桌面应用

```bash
# 运行桌面应用
npx electron .

# 开发模式（同时启动 Web 和桌面应用）
npm run electron:dev

# 打包桌面应用
npm run electron:pack
```

## 🌐 GitHub Pages 部署

### 自动部署

项目已配置 GitHub Actions 自动部署：

1. 推送代码到 `main` 分支
2. GitHub Actions 自动构建和部署
3. 访问 `https://yourusername.github.io/inventory-management-system/`

### 手动部署

```bash
# 安装 gh-pages
npm install --save-dev gh-pages

# 部署到 GitHub Pages
npm run deploy
```

### 部署配置

1. **仓库设置**:
   - 在 GitHub 仓库设置中启用 Pages
   - 选择 "GitHub Actions" 作为部署源

2. **更新配置**:
   - 修改 `package.json` 中的 `homepage` 字段
   - 更新 `vite.config.js` 中的 `base` 路径
   - 替换 README 中的用户名和仓库名

## 🛠️ 技术栈

- **前端框架**: Vanilla JavaScript + HTML5 + CSS3
- **构建工具**: Vite
- **桌面应用**: Electron
- **数据存储**: IndexedDB
- **图表库**: Chart.js
- **部署**: GitHub Pages + GitHub Actions

## 📁 项目结构

```
inventory-management-system/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署配置
├── dist/                       # 构建输出目录
├── src/
│   ├── index.html             # 主页面
│   ├── main.js                # 主要逻辑
│   ├── style.css              # 样式文件
│   └── db.js                  # 数据库操作
├── electron.js                # Electron 主进程
├── vite.config.js             # Vite 配置
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

## 🔧 配置说明

### Vite 配置 (vite.config.js)

```javascript
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/inventory-management-system/' : '/'
})
```

### GitHub Actions 配置 (.github/workflows/deploy.yml)

- 自动检测 `main` 分支推送
- 构建项目并部署到 GitHub Pages
- 支持 Node.js 18+ 环境

## 📝 使用说明

1. **添加商品**: 点击"添加商品"按钮，填写商品信息
2. **编辑商品**: 点击商品列表中的"编辑"按钮
3. **删除商品**: 点击商品列表中的"删除"按钮
4. **搜索商品**: 使用搜索框快速查找商品
5. **查看统计**: 切换到"数据统计"标签查看图表

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License