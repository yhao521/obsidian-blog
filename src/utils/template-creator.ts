import { App, Notice, Modal, ButtonComponent } from "obsidian";
import * as fs from "fs";
import * as path from "path";

/**
 * 确保目录存在,不存在则递归创建
 */
function ensureDirectoryExists(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * 创建 Hexo 模板文件结构
 * @param app Obsidian App 实例
 * @param targetDir 目标目录（绝对路径）
 * @param vaultPath Vault 根目录路径（用于验证）
 * @param hexoConfig Hexo 配置（主题、部署等）
 */
export async function createHexoTemplate(
	app: App,
	targetDir: string,
	vaultPath?: string,
	hexoConfig?: {
		theme?: string;
		deployType?: string;
		deployRepo?: string;
		deployBranch?: string;
		siteTitle?: string;
		siteSubtitle?: string;
		siteDescription?: string;
		siteKeywords?: string;
		siteAuthor?: string;
		siteAvatar?: string;
		siteLanguage?: string;
		siteTimezone?: string;
		siteUrl?: string;
		bannerImg?: string;
	},
): Promise<void> {
	try {
		// 转换为绝对路径
		const absolutePath = path.isAbsolute(targetDir)
			? targetDir
			: vaultPath
				? path.join(vaultPath, targetDir)
				: targetDir;

		// 检查目录是否已存在
		if (fs.existsSync(absolutePath)) {
			// 显示确认对话框
			const confirmed = await new Promise<boolean>((resolve) => {
				const modal = new Modal(app);
				modal.titleEl.setText("目录已存在");
				modal.contentEl.createEl("p", {
					text: `目录 "${absolutePath}" 已存在，是否覆盖现有内容？`,
				});

				const buttonContainer = modal.contentEl.createDiv({
					cls: "modal-button-container",
				});

				new ButtonComponent(buttonContainer)
					.setButtonText("取消")
					.onClick(() => {
						modal.close();
						resolve(false);
					});

				new ButtonComponent(buttonContainer)
					.setButtonText("覆盖")
					.setCta()
					.onClick(() => {
						modal.close();
						resolve(true);
					});

				modal.open();
			});

			if (!confirmed) {
				new Notice("模板创建已取消");
				return;
			}

			// 清空目录
			fs.rmSync(absolutePath, { recursive: true, force: true });
		}

		// 创建目录结构
		ensureDirectoryExists(absolutePath);
		ensureDirectoryExists(path.join(absolutePath, "source", "_posts"));
		ensureDirectoryExists(path.join(absolutePath, "source", "images"));
		ensureDirectoryExists(path.join(absolutePath, "source", "css"));
		ensureDirectoryExists(path.join(absolutePath, "themes"));
		ensureDirectoryExists(path.join(absolutePath, "scaffolds"));

		// 获取配置默认值
		const theme = hexoConfig?.theme || "fluid";
		const deployType = hexoConfig?.deployType || "git";
		const deployRepo = hexoConfig?.deployRepo || "";
		const deployBranch = hexoConfig?.deployBranch || "gh-pages";
		const siteTitle = hexoConfig?.siteTitle || "My Blog";
		const siteSubtitle = hexoConfig?.siteSubtitle || "";
		const siteDescription = hexoConfig?.siteDescription || "";
		const siteKeywords = hexoConfig?.siteKeywords || "";
		const siteAuthor = hexoConfig?.siteAuthor || "Your Name";
		const siteAvatar = hexoConfig?.siteAvatar || "/img/avatar.png";
		const siteLanguage = hexoConfig?.siteLanguage || "zh-CN";
		const siteTimezone = hexoConfig?.siteTimezone || "";
		const siteUrl = hexoConfig?.siteUrl || "https://your-domain.com";
		const bannerImg = hexoConfig?.bannerImg || "/img/bg.png";

		// 创建 _config.yml 配置文件
		const configContent = `# Hexo Configuration
## Docs: https://hexo.io/docs/configuration.html
## Source: https://github.com/hexojs/hexo/

# Site
title: ${siteTitle}
subtitle: '${siteSubtitle}'
description: '${siteDescription}'
keywords: ${siteKeywords}
author: ${siteAuthor}
language: ${siteLanguage}
timezone: '${siteTimezone}'

# URL
## Set your site url here. For example, if you use GitHub Page, set url as 'https://username.github.io/project'
url: ${siteUrl}
permalink: :year/:month/:day/:title/
permalink_defaults:
pretty_urls:
  trailing_index: true # Set to false to remove trailing 'index.html' from permalinks
  trailing_html: true # Set to false to remove trailing '.html' from permalinks

# Directory
source_dir: source
public_dir: public
tag_dir: tags
archive_dir: archives
category_dir: categories
code_dir: downloads/code
i18n_dir: :lang
skip_render:

# Writing
new_post_name: :title.md # File name of new posts
default_layout: post
titlecase: false # Transform title into titlecase
external_link:
  enable: true # Open external links in new tab
  field: site # Apply to the whole site
  exclude: ''
filename_case: 0
render_drafts: false
post_asset_folder: false
relative_link: false
future: true
syntax_highlighter: highlight.js
highlight:
  line_number: true
  auto_detect: false
  tab_replace: ''
  wrap: true
  hljs: false
prismjs:
  preprocess: true
  line_number: true
  tab_replace: ''

# Home page setting
# path: Root path for your blogs index page. (default = '')
# per_page: Posts displayed per page. (0 = disable pagination)
# order_by: Posts order. (Order by date descending by default)
index_generator:
  path: ''
  per_page: 10
  order_by: -date

# Category & Tag
default_category: uncategorized
category_map:
tag_map:

# Metadata elements
## https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
meta_generator: true

# Date / Time format
## Hexo uses Moment.js to parse and display date
## You can customize the date format as defined in
## http://momentjs.com/docs/#/displaying/format/
date_format: YYYY-MM-DD
time_format: HH:mm:ss
## updated_option supports 'mtime', 'date', 'empty'
updated_option: 'mtime'

# Pagination
## Set per_page to 0 to disable pagination
per_page: 10
pagination_dir: page

# Include / Exclude file(s)
## include:/exclude: options only apply to the 'source/' folder
include:
exclude:
ignore:

# Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: ${theme}

# Deployment
## Docs: https://hexo.io/docs/one-command-deployment
${
	deployRepo
		? `deploy:
  type: ${deployType}
  repo: ${deployRepo}
  branch: ${deployBranch}`
		: `# deploy:
#   type: '${deployType}'
#   repo: ''
#   branch: ${deployBranch}`
}
`;

		fs.writeFileSync(
			path.join(absolutePath, "_config.yml"),
			configContent,
			"utf-8",
		);

		// 创建 package.json
		const packageContent = `{
  "name": "hexo-site",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "hexo generate",
    "clean": "hexo clean",
    "deploy": "hexo deploy",
    "server": "hexo server"
  },
  "hexo": {
    "version": "8.1.1"
  },
  "dependencies": {
    "hexo": "^8.0.0",
    "hexo-asset-image": "github:CodeFalling/hexo-asset-image",
    "hexo-deployer-git": "^4.0.0",
    "hexo-generator-archive": "^2.0.0",
    "hexo-generator-category": "^2.0.0",
    "hexo-generator-index": "^4.0.0",
    "hexo-generator-tag": "^2.0.0",
    "hexo-renderer-ejs": "^2.0.0",
    "hexo-renderer-marked": "^7.0.0",
    "hexo-renderer-stylus": "^3.0.1",
    "hexo-server": "^3.0.0",
    "hexo-theme-landscape": "^1.0.0"
  },
  "devDependencies": {
    "hexo-theme-fluid": "^1.9.7"
  }
}
`;
		fs.writeFileSync(
			path.join(absolutePath, "package.json"),
			packageContent,
			"utf-8",
		);

		// 创建主题配置文件
		const themeConfigContent = generateThemeConfig(theme, {
			siteTitle,
			siteAuthor,
			siteAvatar,
			siteUrl,
			bannerImg,
		});
		if (themeConfigContent) {
			const themeConfigPath = getThemeConfigPath(theme);
			if (themeConfigPath) {
				fs.writeFileSync(
					path.join(absolutePath, themeConfigPath),
					themeConfigContent,
					"utf-8",
				);
			}
		}

		// 创建示例文章
		const samplePostContent = `---
title: Welcome to My Blog
date: ${new Date().toISOString().split("T")[0]}
tags:
  - welcome
categories:
  - Blog
---

This is your first blog post! 🎉

## Getting Started

Welcome to your new Hexo blog. This post was automatically created by the Obsidian Blog Plugin.

### What's Next?

1. Customize your blog in \`_config.yml\`
2. Choose a theme you like
3. Start writing your own posts
4. Deploy with \`hexo deploy\`

Happy blogging! ✨
`;
		fs.writeFileSync(
			path.join(absolutePath, "source", "_posts", "welcome.md"),
			samplePostContent,
			"utf-8",
		);

		// 创建自定义 CSS 示例
		const customCssContent = `/* Custom styles for your blog */

/* Add your custom CSS here */

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`;
		fs.writeFileSync(
			path.join(absolutePath, "source", "css", "custom.css"),
			customCssContent,
			"utf-8",
		);

		// 创建 README.md
		const readmeContent = `# Hexo Blog Template

This is a Hexo blog template created by Obsidian Blog Plugin.

## Directory Structure

\`\`\`
.
├── _config.yml        # Hexo configuration file
├── package.json       # Node.js package file
── source/            # Source files
│   ├── _posts/        # Blog posts
│   ├── images/        # Images
│   └── css/           # Custom CSS
├── themes/            # Themes directory
└── scaffolds/         # Scaffold templates
\`\`\`

## Usage

1. Edit \`_config.yml\` to customize your blog
2. Add your posts to \`source/_posts/\`
3. Install a theme in \`themes/\` directory
4. Deploy with \`hexo deploy\`

## Notes

- This template was created automatically by Obsidian Blog Plugin
- Modify configuration files as needed
- Add your own themes and customizations
`;
		fs.writeFileSync(
			path.join(absolutePath, "README.md"),
			readmeContent,
			"utf-8",
		);

		new Notice("Hexo 模板创建成功!");
		console.error("Template created at:", absolutePath);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`模板创建失败: ${errorMessage}`);
		console.error("Template creation error:", error);
		throw error;
	}
}

/**
 * 获取主题配置文件路径
 */
function getThemeConfigPath(theme: string): string | null {
	switch (theme.toLowerCase()) {
		case "fluid":
			return "_config.fluid.yml";
		case "next":
			return "_config.next.yml";
		case "butterfly":
			return "_config.butterfly.yml";
		case "matery":
			return "_config.matery.yml";
		case "landscape":
			return null; // Landscape 不需要独立配置文件
		default:
			return `_config.${theme}.yml`;
	}
}

/**
 * 生成主题配置文件内容
 */
function generateThemeConfig(
	theme: string,
	options: {
		siteTitle?: string;
		siteAuthor?: string;
		siteAvatar?: string;
		siteUrl?: string;
		bannerImg?: string;
	},
): string | null {
	switch (theme.toLowerCase()) {
		case "fluid":
			return generateFluidConfig(options);
		case "next":
			return generateNextConfig(options);
		case "butterfly":
			return generateButterflyConfig(options);
		default:
			return null;
	}
}

/**
 * 生成 Fluid 主题配置
 */
function generateFluidConfig(options: {
	siteTitle?: string;
	siteAuthor?: string;
	siteAvatar?: string;
	siteUrl?: string;
	bannerImg?: string;
}): string {
	const {
		siteTitle = "My Blog",
		siteAuthor = "Author",
		siteAvatar = "/img/avatar.png",
		siteUrl = "https://example.com",
		bannerImg = "/img/bg.png",
	} = options;
	return `#---------------------------
# Hexo Theme Fluid
# Author: Fluid-dev
# Github: https://github.com/fluid-dev/hexo-theme-fluid
#
# 配置指南: https://hexo.fluid-dev.com/docs/guide/
# 你可以从指南中获得更详细的说明
#
# Guide: https://hexo.fluid-dev.com/docs/en/guide/
# You can get more detailed help from the guide
#---------------------------

#---------------------------
# 全局
# Global
#---------------------------

# 用于浏览器标签的图标
# Icon for browser tab
favicon: /img/fluid.png

# 用于苹果设备的图标
# Icon for Apple touch
apple_touch_icon: /img/fluid.png

# 浏览器标签页中的标题分隔符，效果： 文章名 - 站点名
# Title separator in browser tab, eg: article - site
tab_title_separator: " - "

# 强制所有链接升级为 HTTPS（适用于图片等资源出现 HTTP 混入报错）
# Force all links to be HTTPS (applicable to HTTP mixed error)
force_https: false

# 代码块的增强配置
# Enhancements to code blocks
code:
  # 是否开启复制代码的按钮
  # Enable copy code button
  copy_btn: true

  # 代码语言
  # Code language
  language:
    enable: true
    default: "TEXT"

  # 代码高亮
  # Code highlight
  highlight:
    enable: true

    # 代码块是否显示行号
    # If true, the code block display line numbers
    line_number: true

    # 实现高亮的库，对应下面的设置
    # Highlight library
    # Options: highlightjs | prismjs
    lib: "highlightjs"

    highlightjs:
      # 在链接中挑选 style 填入
      # Select a style in the link
      # See: https://highlightjs.org/static/demo/
      style: "github gist"
      style_dark: "dark"

    prismjs:
      # 在下方链接页面右侧的圆形按钮挑选 style 填入，也可以直接填入 css 链接
      # Select the style button on the right side of the link page, you can also set the CSS link
      # See: https://prismjs.com/
      style: "default"
      style_dark: "tomorrow night"

      # 设为 true 高亮将本地静态生成（但只支持部分 prismjs 插件），设为 false 高亮将在浏览器通过 js 生成
      # If true, it will be generated locally (but some prismjs plugins are not supported). If false, it will be generated via JS in the browser
      preprocess: true

# 一些好玩的功能
# Some fun features
fun_features:
  # 为 subtitle 添加打字机效果
  # Typing animation for subtitle
  typing:
    enable: true

    # 打印速度，数字越大越慢
    # Typing speed, the larger the number, the slower
    typeSpeed: 70

    # 游标字符
    # Cursor character
    cursorChar: "_"

    # 是否循环播放效果
    # If true, loop animation
    loop: false

    # 在指定页面开启，不填则在所有页面开启
    # Enable in specified page, all pages by default
    # Options: home | post | tag | category | about | links | page | 404
    scope: []

  # 为文章内容中的标题添加锚图标
  # Add an anchor icon to the title on the post page
  anchorjs:
    enable: true
    element: h1,h2,h3,h4,h5,h6
    # Options: left | right
    placement: left
    # Options: hover | always | touch
    visible: hover
    # Options: § | # | ❡
    icon: ""

  # 加载进度条
  # Progress bar when loading
  progressbar:
    enable: true
    height_px: 3
    color: "#29d"
    # See: https://github.com/rstacruz/nprogress
    options: { showSpinner: false, trickleSpeed: 100 }

# 主题暗色模式，开启后菜单中会出现切换按钮，用户浏览器会存储切换选项，并且会遵循 prefers-color-scheme 自动切换
# Theme dark mode. If enable, a switch button will appear on the menu, each of the visitor's browser will store his switch option
dark_mode:
  enable: true
  # 默认的选项（当用户手动切换后则不再按照默认模式），选择 \`auto\` 会优先遵循 prefers-color-scheme，其次按用户本地时间 18 点到次日 6 点之间进入暗色模式
  # Default option (when the visitor switches manually, the default mode is no longer followed), choosing \`auto\` will give priority to prefers-color-scheme, and then enter the dark mode from 18:00 to 6:00 in the visitor's local time
  # Options: auto | light | dark
  default: auto

# 主题颜色配置，其他不生效的地方请使用自定义 css 解决，配色可以在下方链接中获得启发
# Theme color, please use custom CSS to solve other colors, color schema can be inspired by the links below
# See: https://www.webdesignrankings.com/resources/lolcolors/
color:
  # body 背景色
  # Color of body background
  body_bg_color: "#eee"
  # 暗色模式下的 body 背景色，下同
  # Color in dark mode, the same below
  body_bg_color_dark: "#181c27"

  # 顶部菜单背景色
  # Color of navigation bar background
  navbar_bg_color: "#2f4154"
  navbar_bg_color_dark: "#1f3144"

  # 顶部菜单字体色
  # Color of navigation bar text
  navbar_text_color: "#fff"
  navbar_text_color_dark: "#d0d0d0"

  # 副标题字体色
  # Color of navigation bar text
  subtitle_color: "#fff"
  subtitle_color_dark: "#d0d0d0"

  # 全局字体色
  # Color of global text
  text_color: "#3c4858"
  text_color_dark: "#c4c6c9"

  # 全局次级字体色（摘要、简介等位置）
  # Color of global secondary text (excerpt, introduction, etc.)
  sec_text_color: "#718096"
  sec_text_color_dark: "#a7a9ad"

  # 主面板背景色
  # Color of main board
  board_color: "#fff"
  board_color_dark: "#252d38"

  # 文章正文字体色
  # Color of post text
  post_text_color: "#2c3e50"
  post_text_color_dark: "#c4c6c9"

  # 文章正文字体色（h1 h2 h3...）
  # Color of Article heading (h1 h2 h3...)
  post_heading_color: "#1a202c"
  post_heading_color_dark: "#c4c6c9"

  # 文章超链接字体色
  # Color of post link
  post_link_color: "#0366d6"
  post_link_color_dark: "#1589e9"

  # 超链接悬浮时字体色
  # Color of link when hovering
  link_hover_color: "#30a9de"
  link_hover_color_dark: "#30a9de"

  # 超链接悬浮背景色
  # Color of link background when hovering
  link_hover_bg_color: "#f8f9fa"
  link_hover_bg_color_dark: "#364151"

  # 分隔线和表格边线的颜色
  # Color of horizontal rule and table border
  line_color: "#eaecef"
  line_color_dark: "#435266"

  # 滚动条颜色
  # Color of scrollbar
  scrollbar_color: "#c4c6c9"
  scrollbar_color_dark: "#687582"
  # 滚动条悬浮颜色
  # Color of scrollbar when hovering
  scrollbar_hover_color: "#a6a6a6"
  scrollbar_hover_color_dark: "#9da8b3"

  # 按钮背景色
  # Color of button
  button_bg_color: "transparent"
  button_bg_color_dark: "transparent"
  # 按钮悬浮背景色
  # Color of button when hovering
  button_hover_bg_color: "#f2f3f5"
  button_hover_bg_color_dark: "#46647e"

# 主题字体配置
# Font
font:
  font_size: 16px
  font_family:
  letter_spacing: 0.02em
  code_font_size: 85%

# 指定自定义 .js 文件路径，支持列表；路径是相对 source 目录，如 /js/custom.js 对应存放目录 source/js/custom.js
# Specify the path of your custom js file, support list. The path is relative to the source directory, such as \`/js/custom.js\` corresponding to the directory \`source/js/custom.js\`
custom_js:

# 指定自定义 .css 文件路径，用法和 custom_js 相同
# The usage is the same as custom_js
custom_css:

# 网页访问统计
# Analysis of website visitors
web_analytics: # 网页访问统计
  enable: false

  # 遵循访客浏览器"请勿追踪"的设置，如果开启则不统计其访问
  # Follow the "Do Not Track" setting of the visitor's browser
  # See: https://www.w3.org/TR/tracking-dnt/
  follow_dnt: true

  # 百度统计的 Key，值需要获取下方链接中 \`hm.js?\` 后边的字符串
  # Baidu analytics, get the string behind \`hm.js?\`
  # See: https://tongji.baidu.com/sc-web/10000033910/home/site/getjs?siteId=13751376
  baidu:

  # Google Analytics 4 的媒体资源 ID
  # Google Analytics 4 MEASUREMENT_ID
  # See: https://support.google.com/analytics/answer/9744165#zippy=%2Cin-this-article
  google:
    measurement_id:

  # 腾讯统计的 H5 App ID，开启高级功能才有cid
  # Tencent analytics, set APP ID
  # See: https://mta.qq.com/h5/manage/ctr_app_manage
  tencent:
    sid:
    cid:

  # 51.la 站点统计 ID
  # 51.la analytics
  # See: https://www.51.la/user/site/index
  woyaola: # 51.la 站点统计 ID，参见

  # 友盟/cnzz 站点统计 web_id
  # cnzz analytics
  # See: https://web.umeng.com/main.php?c=site&a=show
  cnzz:

  # LeanCloud 计数统计，可用于 PV UV 展示，如果 \`web_analytics: enable\` 没有开启，PV UV 展示只会查询不会增加
  # LeanCloud count statistics, which can be used for PV UV display. If \`web_analytics: enable\` is false, PV UV display will only query and not increase
  leancloud:
    app_id:
    app_key:
    # REST API 服务器地址，国际版不填
    # Only the Chinese mainland users need to set
    server_url:
    # 统计页面时获取路径的属性
    # Get the attribute of the page path during statistics
    path: window.location.pathname
    # 开启后不统计本地路径( localhost 与 127.0.0.1 )
    # If true, ignore localhost & 127.0.0.1
    ignore_local: false

# 对页面中的图片和评论插件进行懒加载处理，可见范围外的元素不会提前加载
# Lazy loading of images and comment plugin on the page
lazyload:
  enable: true

  # 加载时的占位图片
  # The placeholder image when loading
  loading_img: /img/loading.gif

  # 开启后懒加载仅在文章页生效，如果自定义页面需要使用，可以在 Front-matter 里指定 \`lazyload: true\`
  # If true, only enable lazyload on the post page. For custom pages, you can set 'lazyload: true' in front-matter
  onlypost: false

  # 触发加载的偏移倍数，基数是视窗高度，可根据部署环境的请求速度调节
  # The factor of viewport height that triggers loading
  offset_factor: 2

# 图标库，包含了大量社交类图标，主题依赖的不包含在内，因此可自行修改，详见 https://hexo.fluid-dev.com/docs/icon/
# Icon library, which includes many social icons, does not include those theme dependent, so your can modify link by yourself. See: https://hexo.fluid-dev.com/docs/en/icon/
iconfont: //at.alicdn.com/t/font_1736178_lbnruvf0jn.css

# 作者头像
# Author avatar
avatar: "${siteAvatar}"

# 首屏背景图片
# Banner background image
banner_img: "${bannerImg}"

#---------------------------
# 页头
# Header
#---------------------------

# 导航栏的相关配置
# Navigation bar
navbar:
  # 导航栏左侧的标题，为空则按 hexo config 中 \`title\` 显示
  # The title on the left side of the navigation bar. If empty, it is based on \`title\` in hexo config
  blog_title: "${siteTitle}"

  # 导航栏毛玻璃特效，实验性功能，可能会造成页面滚动掉帧和抖动，部分浏览器不支持会自动不生效
  # Navigation bar frosted glass special animation. It is an experimental feature
  ground_glass:
    enable: false

    # 模糊像素，只能为数字，数字越大模糊度越高
    # Number of blurred pixel. the larger the number, the higher the blur
    px: 3

    # 不透明度，数字越大透明度越低，注意透明过度可能看不清菜单字体
    # Ratio of opacity, 1.0 is completely opaque
    # available: 0 - 1.0
    alpha: 0.7

  # 导航栏菜单，可自行增减，key 用来关联 languages/*.yml，如不存在关联则显示 key 本身的值；icon 是 css class，可以省略；增加 name 可以强制显示指定名称
  # Navigation bar menu. \`key\` is used to associate languages/*.yml. If there is no association, the value of \`key\` itself will be displayed; if \`icon\` is a css class, it can be omitted; adding \`name\` can force the display of the specified name
  menu:
    - { key: "home", link: "/", icon: "iconfont icon-home-fill" }
    - { key: "archive", link: "/archives/", icon: "iconfont icon-archive-fill" }
    - {
        key: "category",
        link: "/categories/",
        icon: "iconfont icon-category-fill",
      }
    - { key: "tag", link: "/tags/", icon: "iconfont icon-tags-fill" }
    - { key: "about", link: "/about/", icon: "iconfont icon-user-fill" }
    #- { key: "links", link: "/links/", icon: "iconfont icon-link-fill" }

# 搜索功能，基于 hexo-generator-search 插件，若已安装其他搜索插件请关闭此功能，以避免生成多余的索引文件
# Search feature, based on hexo-generator-search. If you have installed other search plugins, please disable this feature to avoid generating redundant index files
search:
  enable: true

  # 搜索索引文件的路径，可以是相对路径或外站的绝对路径
  # Path for search index file, it can be a relative path or an absolute path
  path: /local-search.xml

  # 文件生成在本地的位置，必须是相对路径
  # The location where the index file is generated locally, it must be a relative location
  generate_path: /local-search.xml

  # 搜索的范围
  # Search field
  # Options: post | page | all
  field: post

  # 搜索是否扫描正文
  # If true, search will scan the post content
  content: true

# 首屏图片的相关配置
# Config of the big image on the first screen
banner:
  # 视差滚动，图片与板块会随着屏幕滚动产生视差效果
  # Scrolling parallax
  parallax: true

  # 图片最小的宽高比，以免图片两边被过度裁剪，适用于移动端竖屏时，如需关闭设为 0
  # Minimum ratio of width to height, applicable to the vertical screen of mobile device, if you need to close it, set it to 0
  width_height_ratio: 1.0

# 向下滚动的箭头
# Scroll down arrow
scroll_down_arrow:
  enable: true

  # 头图高度不小于指定比例，才显示箭头
  # Only the height of the banner image is greater than the ratio, the arrow is displayed
  # Available: 0 - 100
  banner_height_limit: 80

  # 翻页后自动滚动
  # Auto scroll after page turning
  scroll_after_turning_page: true

# 向顶部滚动的箭头
# Scroll top arrow
scroll_top_arrow:
  enable: true

# Open Graph metadata
# See: https://hexo.io/docs/helpers.html#open-graph
open_graph:
  enable: true
  twitter_card: summary_large_image
  twitter_id:
  twitter_site:
  google_plus:
  fb_admins:
  fb_app_id:

#---------------------------
# 页脚
# Footer
#---------------------------
footer:
  # 页脚第一行文字的 HTML，建议保留 Fluid 的链接，用于向更多人推广本主题
  # HTML of the first line of the footer, it is recommended to keep the Fluid link to promote this theme to more people
  content: '
    <a href="https://hexo.io" target="_blank" rel="nofollow noopener"><span>Hexo</span></a>
    <i class="iconfont icon-love-fill"></i>
    <a href="${siteUrl}" target="_blank" rel="nofollow noopener"><span>${siteAuthor}</span></a>
  '

  # 页脚第二行文字，显示版权和备案号
  # The second line of the footer, display copyright and ICP license
  statistics:
    enable: false
    source: "https://busuanzi.ibruce.info/busuanzi?site=true"
    pv: "总访问量 {pv} 次"
    uv: "总访客数 {uv} 人"

  # 页脚第三行文字
  # The third line of the footer
  beian:
    enable: false
    # 显示在页脚的备案号，如 \`京 ICP 备 12345678 号 -1\`
    # ICP license number displayed in the footer
    icp_text:
    # 显示在页脚的公安备案号，如 \`京公网安备 12345678 号\`
    # Public security license number displayed in the footer
    gongan_text:
`;
}

/**
 * 生成 Next 主题配置
 */
function generateNextConfig(options: {
	siteTitle?: string;
	siteAuthor?: string;
	siteUrl?: string;
}): string {
	const {
		siteTitle = "My Blog",
		siteAuthor = "Author",
		siteUrl = "https://example.com",
	} = options;
	return `# Hexo NexT 主题配置
## Docs: https://theme-next.js.org/docs/

# Schemes
scheme: Muse

# 菜单
menu:
  home: / || fa fa-home
  archives: /archives/ || fa fa-archive
  categories: /categories/ || fa fa-th
  tags: /tags/ || fa fa-tags
  about: /about/ || fa fa-user

# 社交链接
social:
  GitHub: https://github.com/${siteAuthor} || fab fa-github
  Email: mailto:${siteAuthor}@example.com || fa fa-envelope

# 文章设置
post_meta:
  item_text: true
  created_at: true
  updated_at:
    another_day: true
  categories: true

# 页脚
footer:
  since: 2024
  icon:
    name: fa fa-heart
  copyright: ${siteAuthor}
`;
}

/**
 * 生成 Butterfly 主题配置
 */
function generateButterflyConfig(options: {
	siteTitle?: string;
	siteAuthor?: string;
	siteUrl?: string;
}): string {
	const {
		siteTitle = "My Blog",
		siteAuthor = "Author",
		siteUrl = "https://example.com",
	} = options;
	return `# Hexo Butterfly 主题配置
## Docs: https://butterfly.js.org/

# 导航
nav:
  logo:
  display_title: true
  fixed: false

# 菜单
menu:
  首页: / || fas fa-home
  时间轴: /archives/ || fas fa-archive
  标签: /tags/ || fas fa-tags
  分类: /categories/ || fas fa-folder-open
  关于: /about/ || fas fa-heart

# 社交链接
social:
  fab fa-github: https://github.com/${siteAuthor} || GitHub
  fas fa-envelope: mailto:${siteAuthor}@example.com || Email

# 首页
index_img:
  default_top_img:
  index_img:
  archive_img:

# 作者信息
author:
  name: ${siteAuthor}
  url: ${siteUrl}
`;
}
