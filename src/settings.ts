import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	sourceDirectory: string;
	tempDirectory: string;
	hexoPath: string;
	templateDirectory: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
	sourceDirectory: "",
	tempDirectory: "",
	hexoPath: "hexo",
	templateDirectory: "",
};

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Settings #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Source directory")
			.setDesc(
				"Directory containing blog posts. Leave empty to use entire vault.",
			)
			.addText((text) =>
				text
					.setPlaceholder("/path/to/source")
					.setValue(this.plugin.settings.sourceDirectory)
					.onChange(async (value) => {
						this.plugin.settings.sourceDirectory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Temp directory")
			.setDesc(
				"Fixed temporary directory for Hexo operations (required).",
			)
			.addText((text) =>
				text
					.setPlaceholder("/path/to/hexo-temp")
					.setValue(this.plugin.settings.tempDirectory)
					.onChange(async (value) => {
						this.plugin.settings.tempDirectory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Hexo path")
			.setDesc(
				"Path to hexo executable. Leave empty to use system default.",
			)
			.addText((text) =>
				text
					.setPlaceholder("hexo")
					.setValue(this.plugin.settings.hexoPath)
					.onChange(async (value) => {
						this.plugin.settings.hexoPath = value || "hexo";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Template directory")
			.setDesc(
				"Directory containing Hexo template (themes, _config.yml, etc). Will be copied to temp directory before deployment.",
			)
			.addText((text) =>
				text
					.setPlaceholder("/path/to/hexo-template")
					.setValue(this.plugin.settings.templateDirectory)
					.onChange(async (value) => {
						this.plugin.settings.templateDirectory = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
