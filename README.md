# Obsidian Blog Plugin

将 Obsidian 笔记发布为 Hexo 静态博客的插件。

## 功能特性

### Hexo 博客部署

一键将 Obsidian 笔记部署为 Hexo 静态博客：

- **模板管理**：使用 Hexo 模板（支持 Fluid 主题）
- **文章同步**：自动复制 Markdown 文件到 Hexo 的 `_posts` 目录
- **自动构建**：安装依赖、生成静态文件、部署发布
- **国内镜像**：npm install 使用淘宝镜像加速

### 📸 图片资源管理

- **图片目录配置**：支持自定义图片资源目录
- **自动复制**：部署时自动复制图片到 Hexo 的 `source/img` 目录
- **路径处理**：自动转换图片路径为 Hexo 格式

### 🎨 Fluid 主题支持

- **外部配置**：支持从外部加载 Fluid 主题配置文件
- **模板变量替换**：支持 `${bannerImg}`、`${siteAvatar}`、`${siteTitle}` 等占位符
- **网站配置**：支持配置网站标题、副标题、作者、头像等信息

### 📁 目录管理

- **插件目录隔离**：临时目录和模板目录集中在插件目录下
- **非隐藏目录**：使用 `hexo-temp` 和 `template` 目录（不隐藏）
- **智能排除**：复制时自动排除 `.obsidian`、`.git`、`node_modules` 等目录

## 安装

### 手动安装

1. 复制 `main.js`、`manifest.json`、`styles.css` 到插件目录
2. 路径：`Vault/.obsidian/plugins/obsidian-blog/`
3. 在 Obsidian 中启用插件

## 使用指南

### 1. 创建模板

在设置页面点击 **"创建"** 按钮创建模板目录：

- 模板目录位置：`Vault/.obsidian/plugins/obsidian-blog/template`
- 包含 Hexo 项目结构和配置文件
- 支持 Fluid 主题模板

### 2. 配置插件

在设置页面配置以下选项：

| 配置项       | 说明                             |
| ------------ | -------------------------------- |
| 源目录       | 存放 Markdown 文章的目录         |
| 临时目录名称 | 固定为 `hexo-temp`（插件目录下） |
| Hexo 路径    | 自动检测本地 hexo                |
| 模板目录     | 固定为 `template`（插件目录下）  |
| 图片资源目录 | 存放图片资源的目录路径           |
| 网站标题     | 网站标题                         |
| 网站副标题   | 网站副标题                       |
| 网站作者     | 网站作者（GitHub 用户名等）      |
| 网站头像     | 头像图片路径                     |
| 横幅图片     | 首页横幅图片路径                 |
| 网站关键词   | SEO 关键词，英文逗号分隔         |

### 3. 部署博客

点击 **"发布 hexo 博客"** 命令，插件会自动完成：

```
[1/7] 准备临时目录...
[2/7] 正在复制模板...
[3/7] 正在复制博客文章...
[4/7] 正在安装 Hexo 依赖... (使用国内镜像)
[5/7] 正在生成静态文件...
[6/7] 正在清理 Hexo...
[7/7] 正在部署 Hexo... ✅
```

### 4. 清理临时目录

点击 **"清理临时目录"** 命令删除 `hexo-temp` 临时目录。

## 目录结构

```
Vault/
├── .obsidian/
│   └── plugins/
│       ── obsidian-blog/
│           ├── template/           ← Hexo 模板目录
│           │   ├── _config.yml
│           │   ├── _config.fluid.yml
│           │   ── ...
│           ├── hexo-temp/          ← 临时构建目录
│           │   ├── source/
│           │   │   ├── _posts/     ← 复制的文章
│           │   │   └── img/        ← 复制的图片
│           │   ── ...
│           ├── assets/             ← 内置资源
│           │   └── _config.fluid.template.yml
│           ├── main.js
│           └── manifest.json
```

## 命令列表

| 命令           | 说明                            |
| -------------- | ------------------------------- |
| 发布 hexo 博客 | 部署 Hexo 博客（包含 7 个步骤） |
| 清理临时目录   | 删除 hexo-temp 临时目录         |
| 生成临时目录   | 复制模板、同步文章、处理配置    |

## 技术细节

### Hexo 命令检测

插件会按以下优先级检测 hexo：

1. **本地 hexo**：`node_modules/.bin/hexo`（优先使用）
2. **用户配置**：自定义的 hexoPath
3. **全局 hexo**：`/usr/local/bin/hexo`、`/opt/homebrew/bin/hexo`
4. **npx hexo**：最后 fallback

### 环境变量

所有子进程命令都继承完整的环境变量，确保能访问 `node`、`npm` 等可执行文件。

### 路径处理

- 支持包含空格的路径（使用双引号包裹）
- 自动转换图片路径为 Hexo 格式
- 防止路径遍历攻击

## 开发

### 环境要求

- Node.js 18+
- Obsidian 最新版

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint
```

### 项目结构

```
src/
├── main.ts              ← 插件入口
├── settings.ts          ← 设置界面
└── commands/
    ├── hexo-deploy.ts   ← 博客部署
    ├── copy-template.ts ← 模板复制
    ── clean-temp.ts    ← 清理临时目录
└── utils/
    ├── fluid-config-processor.ts  ← Fluid 配置处理
    └── template-creator.ts        ← 模板创建
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
