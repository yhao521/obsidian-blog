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
	},
): void {
	if (!fs.existsSync(sourceConfigPath)) {
		return;
	}

	let configContent = fs.readFileSync(sourceConfigPath, "utf-8");

	const siteTitle = config.siteTitle || "My Blog";
	const siteSubtitle = config.siteSubtitle || "";
	const siteAvatar = convertToHexoPath(
		config.siteAvatar || "/img/avatar.png",
	);
	const bannerImg = convertToHexoPath(config.bannerImg || "/img/bg.png");

	// 替换关键变量
	configContent = configContent
		// 导航栏标题
		.replace(/blog_title: .*/g, `blog_title: "${siteTitle}"`)
		// 首页背景图
		.replace(
			/^index:\s*[\s\S]*?banner_img:.*$/m,
			`index:\n  banner_img: ${bannerImg}`,
		)
		// 文章页背景图
		.replace(
			/^post:\s*[\s\S]*?banner_img:.*$/m,
			`post:\n  banner_img: ${bannerImg}`,
		)
		// 关于页配置（包括背景图、头像、名称、简介）
		.replace(
			/^about:[\s\S]*?(?=\n#|$)/m,
			`about:\n  banner_img: ${bannerImg}\n  banner_img_height: 60\n  banner_mask_alpha: 0.3\n  avatar: ${siteAvatar}\n  name: "${siteTitle}"\n  intro: "${siteSubtitle}"`,
		)
		// 归档页背景图
		.replace(
			/^archive:[\s\S]*?banner_img:.*$/m,
			`archive:\n  banner_img: ${bannerImg}`,
		)
		// 分类页背景图
		.replace(
			/^category:[\s\S]*?banner_img:.*$/m,
			`category:\n  banner_img: ${bannerImg}`,
		)
		// 标签页背景图
		.replace(
			/^tag:[\s\S]*?banner_img:.*$/m,
			`tag:\n  banner_img: ${bannerImg}`,
		)
		// 自定义页背景图
		.replace(
			/^page:[\s\S]*?banner_img:.*$/m,
			`page:\n  banner_img: ${bannerImg}`,
		)
		// 404页背景图
		.replace(
			/^page404:[\s\S]*?banner_img:.*$/m,
			`page404:\n  banner_img: ${bannerImg}`,
		)
		// 友链页背景图
		.replace(
			/^links:[\s\S]*?banner_img:.*$/m,
			`links:\n  banner_img: ${bannerImg}`,
		);

	fs.writeFileSync(targetConfigPath, configContent, "utf-8");
}
