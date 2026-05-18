import { Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	BlogPluginSettings,
	BlogSettingTab,
} from "./settings";
import { deployHexo } from "./commands/hexo-deploy";
import { copyTemplateToTemp } from "./commands/copy-template";

export default class BlogPlugin extends Plugin {
	settings: BlogPluginSettings;

	async onload() {
		await this.loadSettings();

		// 创建左侧栏图标用于 Hexo 部署
		this.addRibbonIcon("upload", "发布 hexo 博客", (evt: MouseEvent) => {
			void deployHexo(this);
		});

		// 注册部署命令
		this.addCommand({
			id: "deploy-hexo-blog",
			name: "发布 hexo 博客",
			callback: () => deployHexo(this),
		});

		// 注册复制模板命令
		this.addCommand({
			id: "copy-template-to-temp",
			name: "复制模板到临时目录",
			callback: () => copyTemplateToTemp(this),
		});

		// 添加设置面板
		this.addSettingTab(new BlogSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<BlogPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
