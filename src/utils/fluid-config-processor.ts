import * as fs from "fs";
import * as path from "path";

/**
 * 转换图片路径为 Hexo 相对路径
 * @param imgPath 原始图片路径
 * @returns Hexo 相对路径（以 / 开头）
 */
function convertToHexoPath(imgPath: string): string {
	if (!imgPath) return "/img/bg.png";

	// 如果已经是绝对路径（以 / 开头），直接返回
	if (imgPath.startsWith("/")) return imgPath;

	// 移除模板目录前缀，如 "模板/source/img/bg.png" -> "/img/bg.png"
	const normalized = imgPath.replace(/^.*?source\//, "/");

	// 如果只是文件名（如 "avatar.png"），自动添加 /img/ 前缀
	if (!normalized.includes("/") && !normalized.startsWith("/")) {
		return `/img/${normalized}`;
	}

	// 确保以 / 开头
	return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/**
 * 处理 Fluid 主题配置文件，替换变量
 * @param sourceConfigPath 源配置文件路径
 * @param targetConfigPath 目标配置文件路径
 * @param config 配置参数
 */
export function processFluidConfig(
	sourceConfigPath: string,
	targetConfigPath: string,
	config: {
		siteTitle?: string;
		siteSubtitle?: string;
		siteAvatar?: string;
		bannerImg?: string;
		siteAuthor?: string;
	},
): void {
	if (!fs.existsSync(sourceConfigPath)) {
		return;
	}

	let configContent = fs.readFileSync(sourceConfigPath, "utf-8");

	const siteTitle = config.siteTitle || "My Blog";
	const siteSubtitle = config.siteSubtitle || "";
	const siteAuthor = config.siteAuthor || "";
	const siteAvatar = convertToHexoPath(
		config.siteAvatar || "/img/avatar.png",
	);
	const bannerImg = convertToHexoPath(config.bannerImg || "/img/bg.png");

	// 替换关键变量
	configContent = configContent
		// 导航栏标题
		.replace(/blog_title: .*/g, `blog_title: "${siteTitle}"`)
		// 替换 ${bannerImg} 占位符
		.replace(/\$\{bannerImg\}/g, bannerImg)
		// 替换 ${siteAvatar} 占位符
		.replace(/\$\{siteAvatar\}/g, siteAvatar)
		// 替换 ${siteTitle} 占位符
		.replace(/\$\{siteTitle\}/g, siteTitle)
		// 替换 ${siteSubtitle} 占位符
		.replace(/\$\{siteSubtitle\}/g, siteSubtitle)
		// 替换 ${siteAuthor} 占位符
		.replace(/\$\{siteAuthor\}/g, siteAuthor);

	fs.writeFileSync(targetConfigPath, configContent, "utf-8");
}
