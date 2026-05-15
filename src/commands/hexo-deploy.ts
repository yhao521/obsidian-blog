import { Notice, Plugin } from "obsidian";
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

	// 1. 验证配置
	if (!settings.tempDirectory) {
		new Notice("请先在设置中配置临时目录");
		return;
	}

	// 2. 验证路径安全性
	if (!validatePath(settings.tempDirectory)) {
		new Notice("临时目录路径不安全");
		return;
	}

	if (settings.sourceDirectory && !validatePath(settings.sourceDirectory)) {
		new Notice("源目录路径不安全");
		return;
	}

	// 3. 准备临时目录
	const tempDir = settings.tempDirectory;
	try {
		ensureDirectoryExists(tempDir);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		new Notice(`无法创建临时目录: ${errorMessage}`);
		return;
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
	const sourceDir =
		settings.sourceDirectory || plugin.app.vault.getRoot().path;

	// 6. 检查源目录和临时目录是否相同
	if (path.resolve(sourceDir) === path.resolve(tempDir)) {
		new Notice("源目录和临时目录不能相同");
		return;
	}

	// 7. 复制文件
	try {
		new Notice('正在复制文件到临时目录...');
		copyDirectory(sourceDir, tempDir);
		new Notice('文件复制完成');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		new Notice(`文件复制失败: ${errorMessage}`);
		console.error('Copy error:', error);
		return;
	}

	// 8. 执行 Hexo 命令
	const hexoPath = settings.hexoPath || "hexo";

	try {
		// 执行 hexo clean
		new Notice("正在清理 Hexo...");
		console.log("Executing: hexo clean");
		const cleanResult = await execAsync(`${hexoPath} clean`, {
			cwd: tempDir,
		});
		if (cleanResult.stdout)
			console.log("Clean output:", cleanResult.stdout);
		if (cleanResult.stderr)
			console.warn("Clean warnings:", cleanResult.stderr);

		// 执行 hexo deploy
		new Notice("正在部署 Hexo...");
		console.log("Executing: hexo deploy");
		const deployResult = await execAsync(`${hexoPath} deploy`, {
			cwd: tempDir,
		});

		new Notice("Hexo 部署成功!");
		console.log("Deploy output:", deployResult.stdout);
		if (deployResult.stderr)
			console.warn("Deploy warnings:", deployResult.stderr);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		new Notice(`Hexo 部署失败: ${errorMessage}`);
		console.error("Hexo error:", error);
	}
}
