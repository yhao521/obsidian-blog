import { Notice, FileSystemAdapter } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import BlogPlugin from "../main";
import { processFluidConfig } from "../utils/fluid-config-processor";

/**
 * 递归复制目录,跳过指定的文件和文件夹
 */
function copyDirectory(
	source: string,
	target: string,
	exclude: string[] = [],
): void {
	if (!fs.existsSync(target)) {
		fs.mkdirSync(target, { recursive: true });
	}

	const items = fs.readdirSync(source);

	for (const item of items) {
		// 跳过排除的项
		if (exclude.includes(item)) {
			continue;
		}

		const sourcePath = path.join(source, item);
		const targetPath = path.join(target, item);

		const stat = fs.statSync(sourcePath);

		if (stat.isDirectory()) {
			copyDirectory(sourcePath, targetPath, exclude);
		} else {
			fs.copyFileSync(sourcePath, targetPath);
		}
	}
}

/**
 * 复制模板目录内容到临时目录
 */
export async function copyTemplateToTemp(plugin: BlogPlugin): Promise<void> {
	const { settings, app } = plugin;

	try {
		// 获取 Vault 路径
		const adapter = app.vault.adapter;
		const vaultPath =
			adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";

		if (!vaultPath) {
			new Notice("Cannot get vault path");
			return;
		}

		// 检查模板目录配置
		if (!settings.templateDirectory) {
			new Notice("请先在设置中配置模板目录");
			return;
		}

		// 解析模板目录绝对路径
		let templateDir = settings.templateDirectory;
		if (!path.isAbsolute(templateDir)) {
			templateDir = path.join(vaultPath, templateDir);
		}

		if (!fs.existsSync(templateDir)) {
			new Notice("模板目录不存在,请检查配置");
			return;
		}

		// 构建临时目录路径
		const tempDirName = settings.tempDirectoryName || ".hexo-temp";
		const tempDir = path.join(vaultPath, tempDirName);

		// 确保临时目录存在
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		// 复制模板目录内容到临时目录
		new Notice("正在复制模板文件到临时目录...");
		console.warn("Copying template from:", templateDir, "to:", tempDir);

		copyDirectory(templateDir, tempDir, [
			app.vault.configDir,
			".git",
			"node_modules",
			"images",
		]);

		// 如果是 Fluid 主题，处理配置文件变量替换
		const fluidTemplatePath = path.join(
			app.vault.configDir,
			"plugins",
			"obsidian-blog",
			"assets",
			"_config.fluid.template.yml",
		);
		if (fs.existsSync(fluidTemplatePath)) {
			const targetConfigPath = path.join(tempDir, "_config.fluid.yml");
			processFluidConfig(fluidTemplatePath, targetConfigPath, {
				siteTitle: settings.siteTitle,
				siteSubtitle: settings.siteSubtitle,
				siteAvatar: settings.siteAvatar,
				bannerImg: settings.bannerImg,
			});
			console.warn("Fluid config processed with variables");
		}

		new Notice("模板已复制到临时目录");
		console.error("Template copied to:", tempDir);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`复制模板失败: ${errorMessage}`);
		console.error("Copy template error:", error);
	}
}
