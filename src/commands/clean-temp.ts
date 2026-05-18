import { Notice, FileSystemAdapter, Modal, ButtonComponent } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import BlogPlugin from "../main";

/**
 * 清理临时目录
 */
export async function cleanTempDirectory(plugin: BlogPlugin): Promise<void> {
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

		// 构建临时目录路径（在插件目录下）
		const pluginDir = path.join(
			vaultPath,
			app.vault.configDir,
			"plugins",
			"obsidian-blog",
		);
		const tempDirName = settings.tempDirectoryName || "hexo-temp";
		const tempDir = path.join(pluginDir, tempDirName);

		// 检查临时目录是否存在
		if (!fs.existsSync(tempDir)) {
			new Notice("临时目录不存在");
			return;
		}

		// 确认删除
		const confirmed = await new Promise<boolean>((resolve) => {
			const modal = new Modal(app);
			modal.titleEl.setText("确认清理");
			modal.contentEl.createEl("p", {
				text: `确定要删除临时目录 "${tempDir}" 吗？此操作不可恢复。`,
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
				.setButtonText("删除")
				.setCta()
				.onClick(() => {
					modal.close();
					resolve(true);
				});

			modal.open();
		});

		if (!confirmed) {
			new Notice("清理已取消");
			return;
		}

		// 删除临时目录
		new Notice("正在清理临时目录...");
		fs.rmSync(tempDir, { recursive: true, force: true });
		new Notice("临时目录已清理");
		console.warn("Temp directory cleaned:", tempDir);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`清理失败: ${errorMessage}`);
		console.error("Clean temp directory error:", error);
	}
}
