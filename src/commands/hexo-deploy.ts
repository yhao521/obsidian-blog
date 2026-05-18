import { Notice, Plugin, FileSystemAdapter } from "obsidian";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { generateTempDirectory } from "./copy-template";

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

	// 2. 在插件目录下创建隐藏临时目录
	// 获取 Vault 的绝对文件系统路径
	const adapter = plugin.app.vault.adapter;
	const vaultPath =
		adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
	if (!vaultPath) {
		new Notice("无法获取 Vault 路径");
		return;
	}
	// 构建插件目录路径：Vault/.obsidian/plugins/obsidian-blog/
	const pluginDir = path.join(
		vaultPath,
		plugin.app.vault.configDir,
		"plugins",
		"obsidian-blog",
	);
	const tempDirName = settings.tempDirectoryName || "hexo-temp";
	const tempDir = path.join(pluginDir, tempDirName);

	new Notice(`[1/7] 准备临时目录...`);
	try {
		// 确保临时目录存在
		ensureDirectoryExists(tempDir);
		new Notice(`[1/7] 临时目录准备完成`);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`[1/7] 错误: 无法创建临时目录 - ${errorMessage}`);
		return;
	}

	// 3. 如果配置了模板目录,先复制模板
	if (settings.templateDirectory) {
		// 模板目录现在在插件目录下，直接使用绝对路径
		const templateDir = settings.templateDirectory;

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

		// 复用 generateTempDirectory 函数（只执行前两步：复制模板 + 同步文章）
		// 注意：这里不需要构建，因为后面会单独执行 hexo generate 和 deploy
		new Notice(`[2/7] 正在复制模板...`);
		await generateTempDirectory(plugin as any);
		new Notice(`[2/7] 模板复制完成`);
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
		new Notice(`[3/7] 正在复制博客文章...`);
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
		new Notice(`[3/7] 文章复制完成`);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`[3/7] 错误: 文章复制失败 - ${errorMessage}`);
		console.error("Posts copy error:", error);
		return;
	}

	// 8. 执行 Hexo 命令
	try {
		// 8.1 安装 Hexo 依赖（如果 package.json 存在且 node_modules 不存在）
		const packageJsonPath = path.join(tempDir, "package.json");
		const nodeModulesPath = path.join(tempDir, "node_modules");
		if (fs.existsSync(packageJsonPath) && !fs.existsSync(nodeModulesPath)) {
			new Notice(`[4/7] 正在安装 Hexo 依赖...`);
			// 使用国内镜像加速 npm install
			const installCmd = `npm install --registry=https://registry.npmmirror.com`;
			console.log(`Executing: ${installCmd}`);

			// 确保子进程能访问 npm/node：获取当前 PATH，补充常见路径
			const currentPath = process.env.PATH || "";
			const commonPaths = [
				"/usr/local/bin",
				"/opt/homebrew/bin",
				"/usr/bin",
				"/bin",
			];
			const extraPaths = commonPaths.filter(
				(p) => !currentPath.includes(p),
			);
			const installEnv = {
				...process.env,
				PATH: [currentPath, ...extraPaths].filter(Boolean).join(":"),
			};

			try {
				const installResult = await execAsync(installCmd, {
					cwd: tempDir,
					env: installEnv,
				});
				if (installResult.stdout)
					console.log("Install output:", installResult.stdout);
				if (installResult.stderr)
					console.warn("Install warnings:", installResult.stderr);
				new Notice(`[4/7] 依赖安装完成`);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				new Notice(`[4/7] 错误: 依赖安装失败 - ${errorMessage}`);
				console.error("Install error:", error);
			}
		} else {
			new Notice(`[4/7] 跳过依赖安装（node_modules 已存在）`);
		}

		// 8.2 确定要使用的 Hexo 命令（在 npm install 之后检测）
		// 始终检测可用的 hexo，即使设置了 hexoPath 也要验证是否存在
		let finalHexoCommand = "npx hexo"; // 默认 fallback

		// 1. 优先检查临时目录中是否有本地 hexo（npm install 后应该存在）
		const localHexoPath = path.join(
			tempDir,
			"node_modules",
			".bin",
			"hexo",
		);
		if (fs.existsSync(localHexoPath)) {
			finalHexoCommand = localHexoPath;
			console.warn("Using local hexo:", finalHexoCommand);
		} else if (settings.hexoPath) {
			// 2. 使用用户配置的 hexoPath（可能是绝对路径或命令名）
			finalHexoCommand = settings.hexoPath;
			console.warn("Using configured hexo:", finalHexoCommand);
		} else {
			// 3. 尝试全局 hexo
			const commonPaths = [
				"/usr/local/bin/hexo",
				"/opt/homebrew/bin/hexo",
				"/usr/bin/hexo",
			];
			for (const hexoPath of commonPaths) {
				try {
					await execAsync(`"${hexoPath}" --version`, {
						cwd: tempDir,
					});
					finalHexoCommand = hexoPath;
					console.warn("Using global hexo:", finalHexoCommand);
					break;
				} catch (_error) {
					// 继续尝试下一个路径
				}
			}

			// 4. 如果都没找到，使用 npx（已在初始化时设置）
			if (finalHexoCommand === "npx hexo") {
				console.warn("Using npx hexo as fallback");
			}
		}

		// 准备命令：如果是 npx hexo 则不加引号，否则加引号处理路径空格
		const hexoCmd =
			finalHexoCommand === "npx hexo"
				? "npx hexo"
				: `"${finalHexoCommand}"`;

		// 确保子进程能访问 node：获取当前 PATH，如果不存在则尝试添加常见 node 路径
		const currentPath = process.env.PATH || "";
		const commonNodePaths = [
			"/usr/local/bin",
			"/opt/homebrew/bin",
			"/usr/bin",
			"/bin",
		];
		const extraPaths = commonNodePaths.filter(
			(p) => !currentPath.includes(p),
		);
		const env = {
			...process.env,
			PATH: [currentPath, ...extraPaths].filter(Boolean).join(":"),
		};

		// 执行 hexo generate（生成静态文件）
		new Notice(`[5/7] 正在生成静态文件...`);
		const generateCmd = `${hexoCmd} generate`;
		console.log(`Executing: ${generateCmd}`);
		const generateResult = await execAsync(generateCmd, {
			cwd: tempDir,
			env: env,
		});
		if (generateResult.stdout)
			console.log("Generate output:", generateResult.stdout);
		if (generateResult.stderr)
			console.warn("Generate warnings:", generateResult.stderr);

		// 执行 hexo clean
		new Notice(`[6/7] 正在清理 Hexo...`);
		const cleanCmd = `${hexoCmd} clean`;
		console.log(`Executing: ${cleanCmd}`);
		const cleanResult = await execAsync(cleanCmd, {
			cwd: tempDir,
			env: env,
		});
		if (cleanResult.stdout)
			console.log("Clean output:", cleanResult.stdout);
		if (cleanResult.stderr)
			console.warn("Clean warnings:", cleanResult.stderr);

		// 执行 hexo deploy
		new Notice(`[7/7] 正在部署 Hexo...`);
		const deployCmd = `${hexoCmd} deploy`;
		console.log(`Executing: ${deployCmd}`);
		const deployResult = await execAsync(deployCmd, {
			cwd: tempDir,
			env: env,
		});

		new Notice(`[7/7] Hexo 部署成功! ✅`);
		console.log("Deploy output:", deployResult.stdout);
		if (deployResult.stderr)
			console.warn("Deploy warnings:", deployResult.stderr);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`Hexo 部署失败 ❌: ${errorMessage}`);
		console.error("Hexo error:", error);
	}
}
