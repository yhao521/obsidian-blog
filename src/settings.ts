import {
	App,
	PluginSettingTab,
	Setting,
	TextComponent,
	ButtonComponent,
	FuzzySuggestModal,
	TFolder,
	TFile,
	FileSystemAdapter,
	DropdownComponent,
	Vault,
} from "obsidian";
import * as path from "path";
import MyPlugin from "./main";
import { createHexoTemplate } from "./utils/template-creator";

// 文件夹选择器 - 使用 Obsidian 原生的模糊搜索选择器
class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	plugin: MyPlugin;
	settingKey: "sourceDirectory" | "templateDirectory" | "imageResourceDir";
	onSelect: (path: string) => void;

	constructor(
		plugin: MyPlugin,
		settingKey:
			| "sourceDirectory"
			| "templateDirectory"
			| "imageResourceDir",
		onSelect: (path: string) => void,
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.settingKey = settingKey;
		this.onSelect = onSelect;
	}

	getItems(): TFolder[] {
		// 获取所有文件夹
		const folders: TFolder[] = [];
		const getAllFolders = (folder: TFolder) => {
			folders.push(folder);
			folder.children.forEach((child) => {
				if (child instanceof TFolder) {
					getAllFolders(child);
				}
			});
		};
		getAllFolders(this.plugin.app.vault.getRoot());
		return folders;
	}

	getItemText(folder: TFolder): string {
		return folder.path || "/";
	}

	onChooseItem(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(folder.path);
	}
}

// 图片选择器 - 使用 Obsidian 原生的模糊搜索选择器
class ImageSuggestModal extends FuzzySuggestModal<TFile> {
	plugin: MyPlugin;
	onSelect: (path: string) => void;

	constructor(plugin: MyPlugin, onSelect: (path: string) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.onSelect = onSelect;
	}

	getItems(): TFile[] {
		return this.plugin.app.vault
			.getFiles()
			.filter((file) =>
				file.extension
					.toLowerCase()
					.match(/^(png|jpg|jpeg|gif|webp|svg)$/),
			);
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(file.path);
	}
}

export interface BlogPluginSettings {
	sourceDirectory: string;
	tempDirectoryName: string; // 临时目录名称(默认为 hexo-temp)
	hexoPath: string;
	templateDirectory: string;
	imageResourceDir: string; // 图片资源目录路径
	// Hexo 配置
	hexoTheme: string; // Hexo 主题名称
	deployType: string; // 部署类型（git 等）
	deployRepo: string; // Git 仓库地址
	deployBranch: string; // Git 分支
	// 网站基本信息
	siteTitle: string; // 网站标题
	siteSubtitle: string; // 网站副标题
	siteDescription: string; // 网站描述
	siteKeywords: string; // 网站关键词
	siteAuthor: string; // 作者名称
	siteAvatar: string; // 作者头像路径
	siteLanguage: string; // 网站语言
	siteTimezone: string; // 时区
	siteUrl: string; // 网站 URL
	// 图片配置
	bannerImg: string; // 首屏背景图片
}

export const DEFAULT_SETTINGS: BlogPluginSettings = {
	sourceDirectory: "",
	tempDirectoryName: "hexo-temp",
	hexoPath: "hexo",
	templateDirectory: "template", // 不隐藏目录
	imageResourceDir: "",
	// Hexo 配置默认值
	hexoTheme: "fluid",
	deployType: "git",
	deployRepo: "",
	deployBranch: "gh-pages",
	// 网站基本信息默认值
	siteTitle: "匆匆过客的博客",
	siteSubtitle: "不积跬步无以至千里，仰望星空还需脚踏实地",
	siteDescription:
		"包含:Java、vue、element、Java 部分源码，JVM，Spring，Spring Boot，Spring Cloud，数据库原理，MySQL，Redis，Docker，CI&CD，Linux，DevOps，分布式，中间件，开发工具，Git，IDE，源码阅读，读书笔记，开源项目",
	siteKeywords: "java，博客，vue，spring，mysql，docker，linux",
	siteAuthor: "yhao521",
	siteAvatar: "/img/avatar2.png",
	siteLanguage: "zh-CN",
	siteTimezone: "Asia/Shanghai",
	siteUrl: "https://yhao521.github.io",
	// 图片配置默认值
	bannerImg: "/img/bg.png",
};

export class BlogSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// 在指定路径创建模板
	async createTemplateInDirectory(
		path: string,
		vaultPath: string,
	): Promise<void> {
		try {
			await createHexoTemplate(this.app, path, vaultPath, {
				theme: this.plugin.settings.hexoTheme,
				deployType: this.plugin.settings.deployType,
				deployRepo: this.plugin.settings.deployRepo,
				deployBranch: this.plugin.settings.deployBranch,
				siteTitle: this.plugin.settings.siteTitle,
				siteSubtitle: this.plugin.settings.siteSubtitle,
				siteDescription: this.plugin.settings.siteDescription,
				siteKeywords: this.plugin.settings.siteKeywords,
				siteAuthor: this.plugin.settings.siteAuthor,
				siteAvatar: this.plugin.settings.siteAvatar,
				siteLanguage: this.plugin.settings.siteLanguage,
				siteTimezone: this.plugin.settings.siteTimezone,
				siteUrl: this.plugin.settings.siteUrl,
				bannerImg: this.plugin.settings.bannerImg,
			});
			this.plugin.settings.templateDirectory = path;
			await this.plugin.saveSettings();
			this.display();
		} catch (_error) {
			// 错误已在 createHexoTemplate 中处理
		}
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("源文档目录")
			.setDesc("包含博客文章的目录。留空则使用整个仓库。")
			.addButton((button: ButtonComponent) => {
				button.setButtonText("选择").onClick(async () => {
					new FolderSuggestModal(
						this.plugin,
						"sourceDirectory",
						(path: string) => {
							this.plugin.settings.sourceDirectory = path;
							void this.plugin.saveSettings();
							this.display(); // 刷新设置界面
						},
					).open();
				});
			})
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("/path/to/source 或从仓库中选择")
					.setValue(this.plugin.settings.sourceDirectory)
					.onChange(async (value: string) => {
						this.plugin.settings.sourceDirectory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("临时目录名称")
			.setDesc(
				"在插件目录中创建的临时目录名称（固定为 hexo-temp，不可修改）。",
			)
			.addText((text: TextComponent) =>
				text
					.setDisabled(true)
					.setValue("hexo-temp")
					.setPlaceholder("hexo-temp"),
			);

		new Setting(containerEl)
			.setName("Hexo 可执行文件路径")
			.setDesc("Hexo 可执行文件路径。留空则使用系统默认值。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("hexo")
					.setValue(this.plugin.settings.hexoPath)
					.onChange(async (value: string) => {
						this.plugin.settings.hexoPath = value || "hexo";
						await this.plugin.saveSettings();
					}),
			);

		// 添加分隔线
		containerEl.createEl("hr", { attr: { style: "margin: 20px 0;" } });

		// 模板目录配置（固定使用隐藏目录，不允许选择）
		new Setting(containerEl)
			.setName("模板目录")
			.setDesc(
				"包含 hexo 模板的目录（主题、_config.yml 等）。默认使用目录 template，不可修改。",
			)
			.addButton((button: ButtonComponent) => {
				button.setButtonText("创建").onClick(async () => {
					// 获取插件目录的绝对路径
					const adapter = this.plugin.app.vault.adapter;
					const vaultPath =
						adapter instanceof FileSystemAdapter
							? adapter.getBasePath()
							: "";

					// 获取插件目录路径（在 Vault/.obsidian/plugins/obsidian-blog/ 下）
					const pluginDir = path.join(
						vaultPath,
						this.plugin.app.vault.configDir,
						"plugins",
						"obsidian-blog",
					);

					// 固定使用 template 目录（不隐藏）
					const targetPath = path.join(pluginDir, "template");
					await this.createTemplateInDirectory(targetPath, vaultPath);
				});
			})
			.addText((text: TextComponent) => {
				// const configDir = this.plugin.app.vault.configDir;
				const displayPath = `template`;
				text.setDisabled(true)
					.setValue(displayPath)
					.setPlaceholder(displayPath);
			});

		// 图片资源目录配置
		new Setting(containerEl)
			.setName("图片资源目录")
			.setDesc(
				"包含博客图片资源的目录（头像、背景图等）。部署时将复制到 source/img。",
			)
			.addButton((button: ButtonComponent) => {
				button.setButtonText("选择").onClick(async () => {
					new FolderSuggestModal(
						this.plugin,
						"imageResourceDir",
						(path: string) => {
							this.plugin.settings.imageResourceDir = path;
							void this.plugin.saveSettings();
							this.display(); // 刷新设置界面
						},
					).open();
				});
			})
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("/path/to/images 或从仓库中选择")
					.setValue(this.plugin.settings.imageResourceDir)
					.onChange(async (value: string) => {
						this.plugin.settings.imageResourceDir = value;
						await this.plugin.saveSettings();
					}),
			);

		// 添加分隔线
		containerEl.createEl("hr", { attr: { style: "margin: 20px 0;" } });

		// 网站基本信息配置
		const titleSetting = new Setting(containerEl)
			.setName("网站标题")
			.setDesc("Hexo 博客的网站标题。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("匆匆过客的博客")
					.setValue(this.plugin.settings.siteTitle)
					.onChange(async (value: string) => {
						this.plugin.settings.siteTitle = value;
						await this.plugin.saveSettings();
					}),
			);
		const titleInput = titleSetting.controlEl.querySelector("input");
		if (titleInput) {
			(titleInput as HTMLElement).className +=
				" blog-plugin-input-medium";
		}

		const subtitleSetting = new Setting(containerEl)
			.setName("网站副标题")
			.setDesc("Hexo 博客的网站副标题。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("不积跬步无以至千里，仰望星空还需脚踏实地")
					.setValue(this.plugin.settings.siteSubtitle)
					.onChange(async (value: string) => {
						this.plugin.settings.siteSubtitle = value;
						await this.plugin.saveSettings();
					}),
			);
		const subtitleInput = subtitleSetting.controlEl.querySelector("input");
		if (subtitleInput) {
			(subtitleInput as HTMLElement).className +=
				" blog-plugin-input-large";
		}

		// 网站描述 - 使用多行文本域
		const descSetting = new Setting(containerEl)
			.setName("网站描述")
			.setDesc("Hexo 博客的网站描述。");

		// 设置容器样式
		descSetting.settingEl.className += " blog-plugin-textarea-setting";

		// 创建多行文本域
		const textarea = document.createElement("textarea");
		textarea.className = "blog-plugin-textarea";
		textarea.placeholder = "网站描述";
		textarea.value = this.plugin.settings.siteDescription;
		textarea.rows = 4;
		textarea.addEventListener("input", () => {
			this.plugin.settings.siteDescription = textarea.value;
			void this.plugin.saveSettings();
		});
		descSetting.controlEl.appendChild(textarea);

		const keywordsSetting = new Setting(containerEl)
			.setName("网站关键词")
			.setDesc("Hexo 博客的网站关键词，使用英文逗号分隔。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("java")
					.setValue(this.plugin.settings.siteKeywords)
					.onChange((value: string) => {
						// 自动将中文逗号替换为英文逗号
						const normalizedValue = value.replace(/，/g, ",");
						this.plugin.settings.siteKeywords = normalizedValue;
						// 更新输入框显示
						const keywordsInput =
							keywordsSetting.controlEl.querySelector("input");
						if (keywordsInput) {
							keywordsInput.value = normalizedValue;
						}
						void this.plugin.saveSettings();
					}),
			);
		const keywordsInput = keywordsSetting.controlEl.querySelector("input");
		if (keywordsInput) {
			(keywordsInput as HTMLElement).className +=
				" blog-plugin-input-large";
		}

		const authorSetting = new Setting(containerEl)
			.setName("作者名称")
			.setDesc("Hexo 博客的作者名称。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("yhao521")
					.setValue(this.plugin.settings.siteAuthor)
					.onChange((value: string) => {
						this.plugin.settings.siteAuthor = value;
						// 实时更新网站 URL
						if (value) {
							this.plugin.settings.siteUrl = `https://${value}.github.io`;
							const urlInput =
								urlSetting.controlEl.querySelector("input");
							if (urlInput) {
								urlInput.value = this.plugin.settings.siteUrl;
							}
						}
						// 实时更新 Git 仓库地址
						if (value) {
							this.plugin.settings.deployRepo = `https://github.com/${value}/${value}.github.io.git`;
							const repoInput =
								deployRepoSetting.controlEl.querySelector(
									"input",
								);
							if (repoInput) {
								repoInput.value =
									this.plugin.settings.deployRepo;
							}
						}
						void this.plugin.saveSettings();
					}),
			);
		const authorInput = authorSetting.controlEl.querySelector("input");
		if (authorInput) {
			(authorInput as HTMLElement).className +=
				" blog-plugin-input-small";
		}

		const avatarSetting = new Setting(containerEl)
			.setName("作者头像")
			.setDesc(
				"Hexo 博客的作者头像图片路径。可直接输入文件名（如 avatar.png），将自动使用 /images/ 目录。",
			)
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("/img/avatar.png")
					.setValue(this.plugin.settings.siteAvatar)
					.onChange((value: string) => {
						this.plugin.settings.siteAvatar = value;
						void this.plugin.saveSettings();
					}),
			)
			.addButton((button: ButtonComponent) =>
				button.setButtonText("选择").onClick(() => {
					new ImageSuggestModal(this.plugin, (path: string) => {
						this.plugin.settings.siteAvatar = path;
						const avatarInput =
							avatarSetting.controlEl.querySelector("input");
						if (avatarInput) {
							avatarInput.value = path;
						}
						void this.plugin.saveSettings();
					}).open();
				}),
			);
		const avatarInput = avatarSetting.controlEl.querySelector("input");
		if (avatarInput) {
			(avatarInput as HTMLElement).className +=
				" blog-plugin-input-medium";
		}

		const bannerSetting = new Setting(containerEl)
			.setName("首屏背景图片")
			.setDesc(
				"Hexo 博客首页首屏背景图片路径。可直接输入文件名（如 bg.png），将自动使用 /images/ 目录。",
			)
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("/img/bg.png")
					.setValue(this.plugin.settings.bannerImg)
					.onChange((value: string) => {
						this.plugin.settings.bannerImg = value;
						void this.plugin.saveSettings();
					}),
			)
			.addButton((button: ButtonComponent) =>
				button.setButtonText("选择").onClick(() => {
					new ImageSuggestModal(this.plugin, (path: string) => {
						this.plugin.settings.bannerImg = path;
						const bannerInput =
							bannerSetting.controlEl.querySelector("input");
						if (bannerInput) {
							bannerInput.value = path;
						}
						void this.plugin.saveSettings();
					}).open();
				}),
			);
		const bannerInput = bannerSetting.controlEl.querySelector("input");
		if (bannerInput) {
			(bannerInput as HTMLElement).className +=
				" blog-plugin-input-medium";
		}

		const langSetting = new Setting(containerEl)
			.setName("网站语言")
			.setDesc("Hexo 博客的网站语言。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("zh-CN")
					.setValue(this.plugin.settings.siteLanguage)
					.onChange(async (value: string) => {
						this.plugin.settings.siteLanguage = value || "zh-CN";
						await this.plugin.saveSettings();
					}),
			);
		const langInput = langSetting.controlEl.querySelector("input");
		if (langInput) {
			(langInput as HTMLElement).className += " blog-plugin-input-tiny";
		}

		const tzSetting = new Setting(containerEl)
			.setName("时区")
			.setDesc("Hexo 博客的时区。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("Asia/Shanghai")
					.setValue(this.plugin.settings.siteTimezone)
					.onChange(async (value: string) => {
						this.plugin.settings.siteTimezone =
							value || "Asia/Shanghai";
						await this.plugin.saveSettings();
					}),
			);
		const tzInput = tzSetting.controlEl.querySelector("input");
		if (tzInput) {
			(tzInput as HTMLElement).className += " blog-plugin-input-small";
		}

		const urlSetting = new Setting(containerEl)
			.setName("网站 URL")
			.setDesc("Hexo 博客的网站 URL。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("https://yhao521.github.io")
					.setValue(this.plugin.settings.siteUrl)
					.onChange(async (value: string) => {
						this.plugin.settings.siteUrl = value;
						await this.plugin.saveSettings();
					}),
			);
		const urlInput = urlSetting.controlEl.querySelector("input");
		if (urlInput) {
			(urlInput as HTMLElement).className += " blog-plugin-input-xwide";
		}

		// Hexo 主题配置
		const themeSetting = new Setting(containerEl)
			.setName("Hexo 主题")
			.setDesc("设置 hexo 博客使用的主题名称。")
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown
					.addOption("fluid", "Fluid")
					.addOption("landscape", "Landscape")
					.addOption("next", "Next")
					.addOption("matery", "Matery")
					.addOption("butterfly", "Butterfly")
					.setValue(this.plugin.settings.hexoTheme || "fluid")
					.onChange(async (value: string) => {
						this.plugin.settings.hexoTheme = value;
						await this.plugin.saveSettings();
					});
			});
		// 设置下拉框宽度
		const themeDropdown = themeSetting.controlEl.querySelector("select");
		if (themeDropdown) {
			(themeDropdown as HTMLElement).className +=
				" blog-plugin-dropdown-wide";
		}

		// 部署配置
		const deployTypeSetting = new Setting(containerEl)
			.setName("部署类型")
			.setDesc("Hexo 部署方式（如 git）。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("git")
					.setValue(this.plugin.settings.deployType)
					.onChange(async (value: string) => {
						this.plugin.settings.deployType = value || "git";
						await this.plugin.saveSettings();
					}),
			);
		// 设置输入框宽度
		const deployTypeInput =
			deployTypeSetting.controlEl.querySelector("input");
		if (deployTypeInput) {
			(deployTypeInput as HTMLElement).className +=
				" blog-plugin-input-wide";
		}

		const deployRepoSetting = new Setting(containerEl)
			.setName("Git 仓库地址")
			.setDesc("用于部署的 Git 仓库 URL。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder(
						"https://github.com/username/username.github.io.git",
					)
					.setValue(this.plugin.settings.deployRepo)
					.onChange(async (value: string) => {
						this.plugin.settings.deployRepo = value;
						await this.plugin.saveSettings();
					}),
			);
		// 设置输入框宽度
		const deployRepoInput =
			deployRepoSetting.controlEl.querySelector("input");
		if (deployRepoInput) {
			(deployRepoInput as HTMLElement).className +=
				" blog-plugin-input-xwide";
		}

		const deployBranchSetting = new Setting(containerEl)
			.setName("Git 分支")
			.setDesc("部署时推送的 Git 分支名称。")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("gh-pages")
					.setValue(this.plugin.settings.deployBranch)
					.onChange(async (value: string) => {
						this.plugin.settings.deployBranch = value || "gh-pages";
						await this.plugin.saveSettings();
					}),
			);
		// 设置输入框宽度
		const deployBranchInput =
			deployBranchSetting.controlEl.querySelector("input");
		if (deployBranchInput) {
			(deployBranchInput as HTMLElement).className +=
				" blog-plugin-input-wide";
		}
	}
}
