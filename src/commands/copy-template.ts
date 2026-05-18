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
 * 镜像同步 Markdown 文件到指定目录
 * 会删除目标目录中存在但源目录中不存在的文件
 */
function mirrorSyncMarkdownFiles(
	srcDir: string,
	destDir: string,
	excludeDirs: string[] = [],
): void {
	if (!fs.existsSync(srcDir)) {
		return;
	}

	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	// 收集目标目录中现有的md文件路径（用于后续清理）
	const existingDestFiles = new Set<string>();
	const collectExistingFiles = (dir: string) => {
		if (!fs.existsSync(dir)) return;
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				collectExistingFiles(fullPath);
			} else if (entry.name.endsWith(".md")) {
				existingDestFiles.add(fullPath);
			}
		}
	};
	collectExistingFiles(destDir);

	// 递归同步源目录到目标目录
	const syncDirectory = (src: string, dest: string) => {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest, { recursive: true });
		}

		const entries = fs.readdirSync(src, { withFileTypes: true });

		for (const entry of entries) {
			const srcPath = path.join(src, entry.name);
			const destPath = path.join(dest, entry.name);

			// 排除指定的目录
			if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
				continue;
			}

			if (entry.isDirectory()) {
				syncDirectory(srcPath, destPath);
			} else if (entry.name.endsWith(".md")) {
				// 复制md文件
				fs.copyFileSync(srcPath, destPath);
				// 从待删除集合中移除（表示该文件应该保留）
				existingDestFiles.delete(destPath);
			}
		}
	};

	syncDirectory(srcDir, destDir);

	// 删除目标目录中存在但源目录中不存在的md文件
	for (const filePath of existingDestFiles) {
		try {
			fs.unlinkSync(filePath);
			console.warn("Deleted orphaned file:", filePath);
		} catch (error) {
			console.error("Failed to delete file:", filePath, error);
		}
	}

	// 清理空目录（可选）
	const cleanEmptyDirectories = (dir: string) => {
		if (!fs.existsSync(dir)) return;
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const subdir = path.join(dir, entry.name);
				cleanEmptyDirectories(subdir);
				// 检查目录是否为空
				const remainingEntries = fs.readdirSync(subdir);
				if (remainingEntries.length === 0) {
					fs.rmdirSync(subdir);
					console.warn("Removed empty directory:", subdir);
				}
			}
		}
	};
	cleanEmptyDirectories(destDir);
}

/**
 * 生成临时目录：复制模板 → 同步文章
 * @param plugin 插件实例
 * @param silent 是否静默模式（不显示详细步骤提示，只在出错时显示）
 */
export async function generateTempDirectory(
	plugin: BlogPlugin,
	silent = false,
): Promise<void> {
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
		// 模板目录现在存储在插件目录下，直接使用绝对路径
		const templateDir = settings.templateDirectory;

		if (!fs.existsSync(templateDir)) {
			new Notice("模板目录不存在,请检查配置");
			return;
		}

		// 构建临时目录路径（在插件目录下）
		const pluginDir = path.join(
			vaultPath,
			app.vault.configDir,
			"plugins",
			"obsidian-blog",
		);
		const tempDirName = settings.tempDirectoryName || "hexo-temp";
		const tempDir = path.join(pluginDir, tempDirName);

		// 确保临时目录存在
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		// 步骤 1: 复制模板目录内容到临时目录
		if (!silent) new Notice("步骤 1/3: 正在复制模板文件...");
		console.warn("Copying template from:", templateDir, "to:", tempDir);

		copyDirectory(templateDir, tempDir, [
			app.vault.configDir,
			".git",
			"node_modules",
			"img",
		]);

		// 如果配置了图片资源目录，复制图片到临时目录的 img 文件夹
		if (settings.imageResourceDir) {
			let imageResourcePath = settings.imageResourceDir;
			if (!path.isAbsolute(imageResourcePath)) {
				imageResourcePath = path.join(vaultPath, imageResourcePath);
			}

			if (fs.existsSync(imageResourcePath)) {
				const targetImageDir = path.join(tempDir, "source", "img");
				if (!fs.existsSync(targetImageDir)) {
					fs.mkdirSync(targetImageDir, { recursive: true });
				}
				copyDirectory(imageResourcePath, targetImageDir, [
					app.vault.configDir,
					".git",
				]);
				console.warn("Images copied from:", imageResourcePath);
			} else {
				console.warn(
					"Image resource directory not found:",
					imageResourcePath,
				);
			}
		}

		// 如果是 Fluid 主题，处理配置文件变量替换
		const fluidTemplatePath = path.join(
			vaultPath,
			app.vault.configDir,
			"plugins",
			"obsidian-blog",
			"assets",
			"_config.fluid.template.yml",
		);

		// 检查是否存在外部 Fluid 模板文件
		if (fs.existsSync(fluidTemplatePath)) {
			const targetConfigPath = path.join(tempDir, "_config.fluid.yml");
			console.warn("Found fluid template:", fluidTemplatePath);
			console.warn("Target config path:", targetConfigPath);

			// 转换图片路径为 Hexo 相对路径
			const convertToHexoPath = (imgPath: string): string => {
				if (!imgPath) return "/img/bg.png";

				// 如果已经是绝对路径（以 / 开头），直接返回
				if (imgPath.startsWith("/")) return imgPath;

				// 处理外部资源目录路径，如 "_resource/avatar.png" -> "/img/avatar.png"
				// 所有外部资源（_img, _resource, _images 等）都会复制到临时目录的 source/img/ 下
				// 所以统一提取文件名部分，添加 /img/ 前缀
				const fileName = imgPath.split("/").pop() || imgPath;

				return `/img/${fileName}`;
			};

			const siteAvatar = convertToHexoPath(
				settings.siteAvatar || "/img/avatar.png",
			);
			const bannerImg = convertToHexoPath(
				settings.bannerImg || "/img/bg.png",
			);

			console.warn("Converted avatar path:", siteAvatar);
			console.warn("Converted banner path:", bannerImg);

			processFluidConfig(fluidTemplatePath, targetConfigPath, {
				siteTitle: settings.siteTitle,
				siteSubtitle: settings.siteSubtitle,
				siteAvatar: siteAvatar,
				bannerImg: bannerImg,
				siteAuthor: settings.siteAuthor,
			});
			// 验证文件是否生成
			if (fs.existsSync(targetConfigPath)) {
				console.warn("Fluid config generated successfully");
			} else {
				console.error("Fluid config NOT generated!");
			}
		} else {
			console.warn("Fluid template file not found:", fluidTemplatePath);
			// 检查临时目录中是否已有 _config.fluid.yml
			const existingConfigPath = path.join(tempDir, "_config.fluid.yml");
			if (!fs.existsSync(existingConfigPath)) {
				console.warn("No Fluid config found in temp directory");
			}
		}

		if (!silent) new Notice("步骤 1/3: 模板复制完成");

		// 步骤 2: 同步文章
		if (!silent) new Notice("步骤 2/3: 正在同步文章...");
		let sourceDir = settings.sourceDirectory || vaultPath;
		if (sourceDir && !path.isAbsolute(sourceDir)) {
			sourceDir = path.join(vaultPath, sourceDir);
		}

		const postsDestDir = path.join(tempDir, "source", "_posts");
		if (!fs.existsSync(postsDestDir)) {
			fs.mkdirSync(postsDestDir, { recursive: true });
		}

		// 构建排除列表：包含临时目录和图片资源目录
		const excludeDirs = [
			app.vault.configDir,
			".git",
			"node_modules",
			tempDirName, // 排除临时目录
		];

		// 如果配置了图片资源目录，也排除它（保持单向同步，不复制图片资源目录中的md文件）
		if (settings.imageResourceDir) {
			let imageResourcePath = settings.imageResourceDir;
			if (!path.isAbsolute(imageResourcePath)) {
				imageResourcePath = path.join(vaultPath, imageResourcePath);
			}
			// 提取目录名用于排除
			const imageResourceDirName = path.basename(imageResourcePath);
			excludeDirs.push(imageResourceDirName);
		}

		mirrorSyncMarkdownFiles(sourceDir, postsDestDir, excludeDirs);

		if (!silent) new Notice("步骤 2/3: 文章同步完成");

		if (!silent) new Notice("临时目录生成成功！");
		console.error("Temp directory generated:", tempDir);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`生成临时目录失败: ${errorMessage}`);
		console.error("Generate temp directory error:", error);
	}
}
