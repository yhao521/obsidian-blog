import { Notice, Plugin, FileSystemAdapter } from "obsidian";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * 确保目录存在,不存在则递归创建
 */
function ensureDirectoryExists(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * 递归复制目录内容
 * @param src 源目录
 * @param dest 目标目录
 * @param excludeDirs 需要排除的目录列表
 */
function copyDirectory(
	src: string,
	dest: string,
	excludeDirs: string[] = [".obsidian", ".git", "node_modules"],
): void {
	ensureDirectoryExists(dest);

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		// 排除指定的目录
		if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
			continue;
		}

		if (entry.isDirectory()) {
			copyDirectory(srcPath, destPath, excludeDirs);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * 复制 Markdown 文件到指定目录
 * @param srcDir 源目录
 * @param destDir 目标目录
 * @param excludeDirs 需要排除的目录列表
 */
function copyMarkdownFiles(
	srcDir: string,
	destDir: string,
	excludeDirs: string[] = [".obsidian", ".git", "node_modules"],
): void {
	ensureDirectoryExists(destDir);

	const entries = fs.readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name);

		// 排除指定的目录
		if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
			continue;
		}

		if (entry.isDirectory()) {
			// 递归处理子目录
			copyMarkdownFiles(srcPath, destDir, excludeDirs);
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			// 只复制 .md 文件
			const destPath = path.join(destDir, entry.name);
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * 验证路径安全性,防止路径遍历攻击
 */
function validatePath(inputPath: string): boolean {
	// 检查是否包含危险的路径遍历序列
	if (inputPath.includes("..") && !path.isAbsolute(inputPath)) {
		return false;
	}
	return true;
}

/**
 * Hexo 博客部署主函数
 */
export async function deployHexo(plugin: Plugin): Promise<void> {
	const settings = (plugin as any).settings;

	// 1. 验证路径安全性
	if (settings.sourceDirectory && !validatePath(settings.sourceDirectory)) {
		new Notice("源目录路径不安全");
		return;
	}

	if (
		settings.templateDirectory &&
		!validatePath(settings.templateDirectory)
	) {
		new Notice("模板目录路径不安全");
		return;
	}

	// 2. 在 Vault 内创建隐藏临时目录
	// 获取 Vault 的绝对文件系统路径
	const adapter = plugin.app.vault.adapter;
	const vaultPath =
		adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
	if (!vaultPath) {
		new Notice("无法获取 Vault 路径");
		return;
	}
	const tempDirName = settings.tempDirectoryName || ".hexo-temp";
	const tempDir = path.join(vaultPath, tempDirName);

	try {
		// 确保临时目录存在
		ensureDirectoryExists(tempDir);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`无法创建临时目录: ${errorMessage}`);
		return;
	}

	// 3. 如果配置了模板目录,先复制模板
	if (settings.templateDirectory) {
		// 解析模板目录为绝对路径
		let templateDir = settings.templateDirectory;
		if (!path.isAbsolute(templateDir)) {
			templateDir = path.join(vaultPath, templateDir);
		}

		if (!fs.existsSync(templateDir)) {
			new Notice("模板目录不存在,请检查配置");
			return;
		}

		// 检查模板目录是否包含 _config.yml
		const templateConfigPath = path.join(templateDir, "_config.yml");
		if (!fs.existsSync(templateConfigPath)) {
			const proceed = confirm(
				"模板目录中未检测到 _config.yml,这可能不是有效的 Hexo 模板。是否继续?",
			);
			if (!proceed) {
				return;
			}
		}

		try {
			new Notice("正在复制模板文件...");
			console.log("Copying template from:", templateDir);
			copyDirectory(templateDir, tempDir);
			new Notice("模板复制完成");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			new Notice(`模板复制失败: ${errorMessage}`);
			console.error("Template copy error:", error);
			return;
		}
	}

	// 4. 检查临时目录是否包含 Hexo 项目
	const hexoConfigPath = path.join(tempDir, "_config.yml");
	if (!fs.existsSync(hexoConfigPath)) {
		const proceed = confirm(
			"临时目录中未检测到 _config.yml,这可能不是有效的 Hexo 项目。是否继续?",
		);
		if (!proceed) {
			return;
		}
	}

	// 5. 确定源目录
	let sourceDir = settings.sourceDirectory || vaultPath;
	// 如果源目录是相对路径,解析为绝对路径
	if (sourceDir && !path.isAbsolute(sourceDir)) {
		sourceDir = path.join(vaultPath, sourceDir);
	}

	// 6. 检查源目录和临时目录是否相同
	if (path.resolve(sourceDir) === path.resolve(tempDir)) {
		new Notice("源目录和临时目录不能相同");
		return;
	}

	// 7. 复制源文档到临时目录的 source/_posts
	try {
		new Notice("正在复制博客文章...");
		const postsDir = path.join(tempDir, "source", "_posts");
		console.log("Copying posts to:", postsDir);

		// 如果源目录是仓库根目录,排除临时目录和模板目录
		const vaultRootPath =
			adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
		const excludeDirs = [".obsidian", ".git", "node_modules"];
		if (path.resolve(sourceDir) === path.resolve(vaultRootPath)) {
			excludeDirs.push(tempDirName);
			if (settings.templateDirectory) {
				excludeDirs.push(path.basename(settings.templateDirectory));
			}
		}

		copyMarkdownFiles(sourceDir, postsDir, excludeDirs);
		new Notice("文章复制完成");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`文章复制失败: ${errorMessage}`);
		console.error("Posts copy error:", error);
		return;
	}

	// 8. 执行 Hexo 命令
	// 确定要使用的 Hexo 命令
	let finalHexoCommand = settings.hexoPath; // 用户自定义路径优先
	if (!finalHexoCommand) {
		// 自动检测：按优先级尝试
		// 1. 尝试常用全局路径
		const commonPaths = [
			"/usr/local/bin/hexo",
			"/opt/homebrew/bin/hexo",
			"/usr/bin/hexo",
		];
		for (const hexoPath of commonPaths) {
			try {
				await execAsync(`"${hexoPath}" --version`, {
					cwd: tempDir,
					env: { ...process.env },
				});
				finalHexoCommand = hexoPath;
				break;
			} catch (_error) {
				// 继续尝试下一个路径
			}
		}

		// 2. 如果常用路径都没找到，尝试 zsh 环境下的 hexo
		if (!finalHexoCommand) {
			try {
				await execAsync("/bin/zsh -l -c 'hexo --version'", {
					cwd: tempDir,
					env: { ...process.env },
				});
				finalHexoCommand = "hexo";
			} catch (_error) {
				// 3. 最后尝试 npx
				try {
					await execAsync("npx hexo --version", {
						cwd: tempDir,
						env: { ...process.env },
					});
					finalHexoCommand = "npx hexo";
				} catch (_npxError) {
					new Notice(
						"Hexo 未找到。请确认已安装 Hexo（npm install -g hexo-cli），或在设置中配置正确的 Hexo 路径。",
					);
					return;
				}
			}
		}
	}

	try {
		// 使用 zsh 登录 shell 执行，确保加载 .zshrc 中的环境变量
		const execWithZsh = (cmd: string) => `/bin/zsh -l -c '${cmd}'`;

		// 执行 hexo clean
		new Notice("正在清理 Hexo...");
		const cleanCmd = execWithZsh(`${finalHexoCommand} clean`);
		console.log(`Executing: ${cleanCmd}`);
		const cleanResult = await execAsync(cleanCmd, {
			cwd: tempDir,
			env: { ...process.env },
		});
		if (cleanResult.stdout)
			console.log("Clean output:", cleanResult.stdout);
		if (cleanResult.stderr)
			console.warn("Clean warnings:", cleanResult.stderr);

		// 执行 hexo deploy
		new Notice("正在部署 Hexo...");
		const deployCmd = execWithZsh(`${finalHexoCommand} deploy`);
		console.log(`Executing: ${deployCmd}`);
		const deployResult = await execAsync(deployCmd, {
			cwd: tempDir,
			env: { ...process.env },
		});

		new Notice("Hexo 部署成功!");
		console.log("Deploy output:", deployResult.stdout);
		if (deployResult.stderr)
			console.warn("Deploy warnings:", deployResult.stderr);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`Hexo 部署失败: ${errorMessage}`);
		console.error("Hexo error:", error);
	}
}
