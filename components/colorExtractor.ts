/**
 * 封面全链路真实色彩提取器 (Cover True Color & Adaptive UI Palette Engine)
 * 
 * 核心特性与解决痛点：
 * 1. 12-bit RGB 空间量化聚类算法 (12-bit RGB Color Quantization)：
 *    彻底重构像素聚类模型，在 3D RGB 色彩立方体内进行空间聚类，
 *    杜绝色相环在 0°/360° 红色断裂、以及线性平均除以饱和度导致的恶性偏色 Bug（如红色封面偏为青色绿色的问题）。
 * 2. 真实封面主色高保真提取：
 *    优先提取封面中最具音乐表现力与情感感染力的高饱和鲜活主色，
 *    同时智能规避画面边缘死黑/纯白噪点。
 * 3. 深色背景发光对比度自适应 (Dark UI Luminance Adaptation)：
 *    在极暗黑夜背景 (#030712) 下，极暗封面（深海蓝、酒红、墨绿、黑灰）如果直接取原始暗色，
 *    会导致歌词、频谱和进度条发暗不可辨。本引擎锁定封面原生主色相 (Hue)，
 *    将 UI 元素明度 (Lightness) 自适应提升至人眼发光最佳区间 (71%~74%)，
 *    饱和度饱满充盈，呈现通透发光的同色系霓虹流光，彻底告别暗底暗字。
 * 4. 黑白/极简摄影纯灰封面专属白金流光 (Platinum Silver)：
 *    对于缺乏色相的黑白或灰度封面，自适应转换为 Apple / Devialet 级的高雅白金银辉流光，
 *    高亮白金色 (rgb(248, 250, 252)) + 银辉高光 (rgb(203, 213, 225))。
 * 5. 多阶段高容错图片加载管道：
 *    支持 Data URL、Blob URL、同源相对路径、原生 CORS 直连，
 *    直连时自动追加一次性缓存破坏参数，规避"源站 304 响应不带跨域头"导致的取色失败；
 *    仍失败时依次尝试自建代理 (CUSTOM_IMAGE_PROXY) 与公共 CDN 代理 (wsrv.nl / images.weserv.nl)，
 *    公共代理按域名 TLD 做策略屏蔽时会自动停用，最后具备平滑全色谱数学保底。
 */

export interface ColorPalette {
  primary: string;       // 主色调环境流光 (rgba)
  secondary: string;     // 辅助对比流光 (rgba)
  accent: string;        // 亮色高光流光 (rgba)
  ambientGlow: string;   // 扩散氛围光 (rgba)
  
  // UI 元素自适应高亮色 (保证歌词、频谱、进度条在深色背景下具有极佳通透度与高对比度)
  themeColor: string;    // 高发光通透主色 (例如 'rgb(251, 147, 117)')
  accentColor: string;   // 高光辅助色 (例如 'rgb(254, 198, 178)')
  themeRgb: [number, number, number]; // [r, g, b] 数组，用于 Canvas 频谱与动态着色
  glowColor: string;     // 柔和外发光 (rgba)
  buttonBg: string;      // 按钮半透明背景 (rgba)
  buttonBorder: string;  // 按钮高光边框 (rgba)
}

// 缓存已解析封面的色彩配置
const paletteCache = new Map<string, ColorPalette>();

/**
 * 可选：自建图片代理前缀
 * 当封面源站不返回跨域头、且公共代理不可用（wsrv.nl 等会按域名 TLD 做策略屏蔽，例如拒绝 .xyz）时，
 * 可在自己的服务器上搭一个图片代理（回源图片并附加 Access-Control-Allow-Origin: *），
 * 然后把地址填在下面，形如 'https://your-domain.com/img-proxy/?url=' （必须以参数名结尾）。
 * 留空表示不使用自建代理。
 */
const CUSTOM_IMAGE_PROXY = '';

/**
 * 公共 CORS 代理是否已被封禁
 * wsrv.nl / images.weserv.nl 会按域名 TLD 做策略屏蔽（返回 400 Domain or TLD blocked by policy），
 * 一旦确认不可用，本会话内不再重复请求，避免每首歌都产生无谓的失败请求与控制台报错。
 */
let publicProxyBlocked = false;

/**
 * 公共 CORS 代理列表（按顺序尝试，任一成功即完成取色）
 *
 * 为什么需要代理：封面源站不返回 Access-Control-Allow-Origin 时，浏览器禁止 canvas 读取图片像素，
 * 必须借助一个"会补上跨域头"的中间服务转发图片。
 *
 * 注意事项：
 * 1. 部分图片代理会按域名 TLD 做策略屏蔽（如 wsrv.nl 拒绝 .xyz），因此保留多个候选；
 * 2. 使用第三方代理意味着图片 URL 会暴露给该服务，且可用性与速度不受我们控制；
 * 3. 若对隐私/稳定性有要求，请改用上方 CUSTOM_IMAGE_PROXY 自建代理，或直接关闭取色。
 */
const PUBLIC_IMAGE_PROXIES: Array<(url: string) => string> = [
  // 图片专用代理（会自动缩放为 64x64，速度最快，但会按 TLD 策略屏蔽部分域名）
  (url) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=64&h=64&output=jpg`,
  (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=64&h=64&output=jpg`,
  // 通用 CORS 代理（不做域名策略屏蔽，原样转发，作为兜底尝试）
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * 封面取色总开关
 * 封面源站既不返回跨域头、又没有可用代理时，取色必然失败。
 * 设为 false 可完全关闭取色（不再发起任何额外请求），全部使用按歌名生成的保底配色。
 */
const ENABLE_COVER_COLOR_EXTRACTION = true;

/**
 * 记录"CORS 直连取色已确认失败"的域名
 * 同一站点的封面通常同源，失败一次后不再对同域名重复发起注定失败的请求，
 * 避免每切一首歌都产生一次无效请求与控制台报错。
 */
const corsBlockedHosts = new Set<string>();

function getUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * 为取色请求追加一次性缓存破坏参数
 * 很多源站/Nginx 在返回 304 Not Modified 时不会携带 Access-Control-Allow-Origin 头
 * （Nginx 的 add_header 默认对 304 不生效），导致带 crossOrigin 的取色请求被 CORS 校验拦截。
 * 追加参数可强制源站返回 200（携带跨域头），从而无需任何代理即可完成取色。
 */
function appendCacheBuster(url: string): string {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_rmpCb=${Date.now()}`;
}

/**
 * HSL 转 RGB 算法
 * h: 0..360, s: 0..1, l: 0..1
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * RGB 转 HSL 算法
 * r, g, b: 0..255 -> [h (0..360), s (0..1), l (0..1)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return [h, s, l];
}

/**
 * 根据原生色相与饱和度，生成适配深色模式的高对比度、通透发光全套调色板
 */
export function buildPaletteFromHsl(
  dominantH: number, 
  dominantS: number, 
  dominantL: number,
  isMonochrome: boolean = false
): ColorPalette {
  // 1. 黑白/极简纯灰/黑白摄影封面专属：白金银辉 (Apple / Devialet Platinum)
  if (isMonochrome || dominantS < 0.08) {
    const themeRgb: [number, number, number] = [248, 250, 252]; // slate-50 白金色
    const accentRgb: [number, number, number] = [203, 213, 225]; // slate-300 银辉色
    
    return {
      primary: 'rgba(148, 163, 184, 0.38)',
      secondary: 'rgba(100, 116, 139, 0.30)',
      accent: 'rgba(226, 232, 240, 0.50)',
      ambientGlow: 'rgba(203, 213, 225, 0.22)',
      themeColor: `rgb(${themeRgb.join(', ')})`,
      accentColor: `rgb(${accentRgb.join(', ')})`,
      themeRgb,
      glowColor: 'rgba(255, 255, 255, 0.40)',
      buttonBg: 'rgba(255, 255, 255, 0.14)',
      buttonBorder: 'rgba(255, 255, 255, 0.35)',
    };
  }

  // 2. 彩色封面深色模式发光对比度自适应算法 (Dark Cover Luminance Adaptation)
  // 核心：严格锁定封面真实色相 (dominantH)
  // 在 #030712 极暗背景下，将明度提升至 71%~74% 通透发光区间，杜绝暗底暗字
  let targetL = 0.72;
  if (dominantL < 0.35) {
    targetL = 0.73; // 针对深海蓝、酒红、墨绿等极深封面，强制提升明度至 73%
  } else if (dominantL > 0.75) {
    targetL = 0.69;
  } else {
    targetL = 0.71;
  }

  // 保证饱和度鲜活通透 (0.72 ~ 0.95)，杜绝发灰
  const targetS = Math.min(0.95, Math.max(0.72, dominantS * 1.15));
  const themeRgb = hslToRgb(dominantH, targetS, targetL);

  // 辅助高光色 (更亮更柔和的同色相色调，用于歌词译文与次级信息)
  const accentL = Math.min(0.85, targetL + 0.10);
  const accentS = Math.max(0.55, targetS * 0.78);
  const accentRgb = hslToRgb(dominantH, accentS, accentL);

  // 环境光流光色（保持色相，明度控制在 0.38 ~ 0.48，营造出温和沉浸的呼吸光晕）
  const ambientL = Math.min(0.48, Math.max(0.36, dominantL));
  const primaryRgb = hslToRgb(dominantH, Math.min(0.85, targetS), ambientL);
  // 邻近调和色 (色相旋转 +28°)，营造丰富富有层次的流光
  const secondaryH = (dominantH + 28) % 360;
  const secondaryRgb = hslToRgb(secondaryH, Math.min(0.80, targetS), Math.max(0.32, ambientL * 0.9));
  const accentGlowRgb = hslToRgb((dominantH + 348) % 360, Math.min(0.90, targetS), 0.54);

  const [tr, tg, tb] = themeRgb;

  return {
    primary: `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0.55)`,
    secondary: `rgba(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}, 0.45)`,
    accent: `rgba(${accentGlowRgb[0]}, ${accentGlowRgb[1]}, ${accentGlowRgb[2]}, 0.60)`,
    ambientGlow: `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0.30)`,
    themeColor: `rgb(${tr}, ${tg}, ${tb})`,
    accentColor: `rgb(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]})`,
    themeRgb,
    glowColor: `rgba(${tr}, ${tg}, ${tb}, 0.45)`,
    buttonBg: `rgba(${tr}, ${tg}, ${tb}, 0.18)`,
    buttonBorder: `rgba(${tr}, ${tg}, ${tb}, 0.42)`,
  };
}

/**
 * 基于全色谱 360° 色相环的数学哈希算法 (无网络或解析彻底失败时的平滑保底)
 */
export function getHashPalette(seed: string): ColorPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 0.75 + ((Math.abs(hash >> 3) % 20) / 100); // 0.75 ~ 0.95
  return buildPaletteFromHsl(hue, sat, 0.48, false);
}

/**
 * 12位 RGB 空间聚类量化与主色提取算法 (12-bit RGB Quantization Engine)
 * 在 3D RGB 色彩立方体内进行空间聚类，彻底根除角度环 wrap-around 导致的偏色 bug！
 */
export function analyzeImagePixels(img: HTMLImageElement): ColorPalette | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // 缩放到 64x64，兼顾高执行效率与充分的细节像素 (4,096 像素)
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size).data;
    const clusterMap = new Map<number, { count: number; rSum: number; gSum: number; bSum: number }>();

    let totalValid = 0;
    let chromaticCount = 0;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      if (a < 125) continue; // 忽略完全透明像素
      totalValid++;
      totalR += r;
      totalG += g;
      totalB += b;

      const [h, s, l] = rgbToHsl(r, g, b);
      if (s >= 0.12 && l >= 0.08 && l <= 0.94) {
        chromaticCount++;
      }

      // 12-bit RGB 空间量化 (每个通道 16 级，共 4096 个色彩立方体)
      const qr = r >> 4;
      const qg = g >> 4;
      const qb = b >> 4;
      const key = (qr << 8) | (qg << 4) | qb;

      let c = clusterMap.get(key);
      if (!c) {
        c = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
        clusterMap.set(key, c);
      }
      c.count++;
      c.rSum += r;
      c.gSum += g;
      c.bSum += b;
    }

    if (totalValid === 0) return null;

    const avgR = totalR / totalValid;
    const avgG = totalG / totalValid;
    const avgB = totalB / totalValid;
    const [avgH, avgS, avgL] = rgbToHsl(avgR, avgG, avgB);

    // 黑白/极简纯灰封面判定：彩色像素占比小于 6% 或全图平均饱和度极低
    if (chromaticCount / totalValid < 0.06 || avgS < 0.08) {
      return buildPaletteFromHsl(0, 0, avgL, true);
    }

    // 寻找最佳代表性色彩簇
    let bestCluster: { r: number; g: number; b: number; h: number; s: number; l: number; count: number } | null = null;
    let maxScore = -1;

    for (const c of clusterMap.values()) {
      const cr = c.rSum / c.count;
      const cg = c.gSum / c.count;
      const cb = c.bSum / c.count;
      const [ch, cs, cl] = rgbToHsl(cr, cg, cb);

      // 跳过纯灰无色相噪点
      if (cs < 0.12) continue;

      // 评分权重：
      // 1. 像素数量占比（数量多代表画面面积大）
      // 2. 饱和度饱满度（音乐播放器更需要富有情感的鲜活主色，而不是暗淡灰色）
      // 3. 适宜明度加权（避开极暗/极亮噪点）
      const lightnessScore = 1.0 - Math.abs(cl - 0.52);
      const score = Math.pow(c.count, 0.65) * (cs * 2.2 + Math.max(0, lightnessScore) * 1.2);

      if (score > maxScore) {
        maxScore = score;
        bestCluster = { r: cr, g: cg, b: cb, h: ch, s: cs, l: cl, count: c.count };
      }
    }

    // 如果未找到（例如极暗图全部像素 l < 0.10），降级在所有簇中找最大饱和度与面积的簇
    if (!bestCluster) {
      for (const c of clusterMap.values()) {
        const cr = c.rSum / c.count;
        const cg = c.gSum / c.count;
        const cb = c.bSum / c.count;
        const [ch, cs, cl] = rgbToHsl(cr, cg, cb);
        if (cs < 0.10) continue;
        const score = c.count * (cs + 0.1);
        if (score > maxScore) {
          maxScore = score;
          bestCluster = { r: cr, g: cg, b: cb, h: ch, s: cs, l: cl, count: c.count };
        }
      }
    }

    if (!bestCluster) {
      return buildPaletteFromHsl(avgH, avgS, avgL, false);
    }

    return buildPaletteFromHsl(bestCluster.h, bestCluster.s, bestCluster.l, false);
  } catch (err) {
    console.warn('analyzeImagePixels warning:', err);
    return null;
  }
}

/**
 * 尝试通过 Image 对象异步加载图片
 */
function tryLoadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * 实时从封面图提取真实主色调，全链路自适应 UI 调色板
 */
export async function extractPaletteFromImage(
  imageUrl: string, 
  fallbackSeed: string = ''
): Promise<ColorPalette> {
  if (!imageUrl) {
    return getHashPalette(fallbackSeed || 'Revelation');
  }

  // 取色总开关关闭时，直接使用按歌名生成的保底配色（不发起任何额外请求）
  if (!ENABLE_COVER_COLOR_EXTRACTION) {
    return getHashPalette(fallbackSeed || imageUrl);
  }

  // 命中缓存则毫秒级直出
  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  const isDataOrBlob = imageUrl.startsWith('data:') || imageUrl.startsWith('blob:');
  const isRelative = !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://');

  // 阶段 1：本地图片、Data URL、Blob URL 或同源相对路径优先直接加载
  if (isDataOrBlob || isRelative) {
    try {
      const img = await tryLoadImage(imageUrl, isDataOrBlob ? undefined : 'anonymous');
      const palette = analyzeImagePixels(img);
      if (palette) {
        paletteCache.set(imageUrl, palette);
        return palette;
      }
    } catch {
      // 本地加载失败
    }
  } else {
    // 阶段 2：外链网络图片 (HTTP/HTTPS)
    // 2.1 优先原生 anonymous CORS 直连 (超时设为 3000ms，适配网络波动)
    // 追加缓存破坏参数，避开"源站 304 响应不带跨域头"导致的 CORS 校验失败
    // 同一域名确认失败后不再重试，避免每首歌都产生一次无效请求
    const imageHost = getUrlHost(imageUrl);
    if (!corsBlockedHosts.has(imageHost)) {
      try {
        const img = await Promise.race([
          tryLoadImage(appendCacheBuster(imageUrl), 'anonymous'),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);

        const palette = analyzeImagePixels(img);
        if (palette) {
          paletteCache.set(imageUrl, palette);
          return palette;
        }
      } catch {
        // 原生 CORS 失败或被跨域策略拦截，记录域名后进入阶段 2.2
        corsBlockedHosts.add(imageHost);
      }
    }

    // 2.2 自建图片代理（需先在上方 CUSTOM_IMAGE_PROXY 中配置地址）
    if (CUSTOM_IMAGE_PROXY) {
      try {
        const img = await Promise.race([
          tryLoadImage(`${CUSTOM_IMAGE_PROXY}${encodeURIComponent(imageUrl)}`, 'anonymous'),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('custom proxy timeout')), 4000))
        ]);

        const palette = analyzeImagePixels(img);
        if (palette) {
          paletteCache.set(imageUrl, palette);
          return palette;
        }
      } catch {
        // 自建代理失败，继续尝试公共代理
      }
    }

    // 2.3 公共 CORS 代理（按顺序尝试，任一成功即可完成取色）
    // 注意：部分代理会按域名 TLD 做策略屏蔽（例如 wsrv.nl 拒绝 .xyz），全部失败后本会话内不再重试
    if (!publicProxyBlocked) {
      let proxyFailCount = 0;

      for (const buildProxyUrl of PUBLIC_IMAGE_PROXIES) {
        try {
          const img = await Promise.race([
            tryLoadImage(buildProxyUrl(imageUrl), 'anonymous'),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('proxy timeout')), 4000))
          ]);

          const palette = analyzeImagePixels(img);
          if (palette) {
            paletteCache.set(imageUrl, palette);
            return palette;
          }
          proxyFailCount++;
        } catch {
          proxyFailCount++;
        }
      }

      // 所有公共代理均不可用（多为域名策略屏蔽或服务不可用），标记后不再重复请求
      if (proxyFailCount >= PUBLIC_IMAGE_PROXIES.length) {
        publicProxyBlocked = true;
        console.warn('封面取色：公共图片代理均不可用（可能被域名策略屏蔽），后续将直接使用保底配色');
      }
    }
  }

  // 阶段 3：终极保底，基于歌名/种子在全色相环做平滑连续映射（具有高对比度和高通透度）
  const fallbackPalette = getHashPalette(fallbackSeed || imageUrl);
  paletteCache.set(imageUrl, fallbackPalette);
  return fallbackPalette;
}
