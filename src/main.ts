import { Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	BlogPluginSettings,
	BlogSettingTab,
} from "./settings";
import { deployHexo } from "./commands/hexo-deploy";
import { generateTempDirectory } from "./commands/copy-template";
import { cleanTempDirectory } from "./commands/clean-temp";

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

		// 注册生成临时目录命令
		this.addCommand({
			id: "generate-temp-directory",
			name: "生成临时目录",
			callback: () => generateTempDirectory(this),
		});

		// 注册清理临时目录命令
		this.addCommand({
			id: "clean-temp-directory",
			name: "清理临时目录",
			callback: () => cleanTempDirectory(this),
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
