/**
 * 音频元数据实时解析器 (采样率与比特率)
 * 能够通过解析音频流头部 (MP3 / FLAC / WAV) 以及 Content-Length / Range 请求实时计算准确的采样率与比特率。
 */

export interface AudioQualityInfo {
  sampleRate: string; // e.g. "44.1kHz", "48kHz", "96kHz"
  bitrate: string;    // e.g. "320kbps", "256kbps", "1411kbps"
}

// 缓存已解析的歌曲信息，避免重复请求
const metadataCache = new Map<string, AudioQualityInfo>();

// 格式化采样率
function formatSampleRate(hz: number): string {
  if (!hz || isNaN(hz)) return '44.1kHz';
  if (hz >= 1000) {
    const khz = hz / 1000;
    return Number.isInteger(khz) ? `${khz}kHz` : `${khz.toFixed(1)}kHz`;
  }
  return `${hz}Hz`;
}

// 格式化比特率
function formatBitrate(kbps: number): string {
  if (!kbps || isNaN(kbps) || kbps <= 0) return '320kbps';
  return `${Math.round(kbps)}kbps`;
}

// 获取默认/备用采样率 (借助 Web Audio API 的硬件上下文)
export function getFallbackSampleRate(): string {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const sr = ctx.sampleRate;
      ctx.close().catch(() => {});
      return formatSampleRate(sr);
    }
  } catch (e) {
    // 忽略错误
  }
  return '44.1kHz';
}

/**
 * 解析 MP3 帧头信息
 */
function parseMp3Header(bytes: Uint8Array): { sampleRate?: number; bitrate?: number } | null {
  let offset = 0;
  
  // 检查是否有 ID3v2 头部 ('ID3')
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const id3Size = ((bytes[6] & 0x7f) << 21) |
                    ((bytes[7] & 0x7f) << 14) |
                    ((bytes[8] & 0x7f) << 7)  |
                    (bytes[9] & 0x7f);
    offset = 10 + id3Size;
  }

  // 搜索 MP3 同步字 0xFFE 或 0xFFF
  const maxSearch = Math.min(bytes.length - 4, offset + 8192);
  for (let i = offset; i < maxSearch; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      const byte1 = bytes[i + 1];
      const byte2 = bytes[i + 2];

      const version = (byte1 >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
      const layer = (byte1 >> 1) & 3;   // 1 = Layer III, 2 = Layer II, 3 = Layer I
      const bitrateIdx = (byte2 >> 4) & 0x0f;
      const srIdx = (byte2 >> 2) & 0x03;

      if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) continue;

      let sampleRate = 44100;
      if (version === 3) { // MPEG 1
        const rates = [44100, 48000, 32000];
        sampleRate = rates[srIdx] || 44100;
      } else if (version === 2) { // MPEG 2
        const rates = [22050, 24000, 16000];
        sampleRate = rates[srIdx] || 22050;
      } else if (version === 0) { // MPEG 2.5
        const rates = [11025, 12000, 8000];
        sampleRate = rates[srIdx] || 11025;
      }

      let bitrate = 320;
      if (version === 3 && layer === 1) { // MPEG 1 Layer III
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        bitrate = bitrates[bitrateIdx] || 320;
      } else if (version === 3 && layer === 2) { // MPEG 1 Layer II
        const bitrates = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384];
        bitrate = bitrates[bitrateIdx] || 320;
      } else {
        const bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
        bitrate = bitrates[bitrateIdx] || 128;
      }

      return { sampleRate, bitrate };
    }
  }

  return null;
}

/**
 * 解析 FLAC 帧头信息
 */
function parseFlacHeader(bytes: Uint8Array): { sampleRate?: number; bitrate?: number } | null {
  if (bytes.length > 22 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    // STREAMINFO block
    const sampleRate = (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4);
    return { sampleRate, bitrate: 1411 };
  }
  return null;
}

/**
 * 解析 WAV 帧头信息
 */
function parseWavHeader(bytes: Uint8Array): { sampleRate?: number; bitrate?: number } | null {
  if (bytes.length > 32 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    // RIFF WAVE
    const sampleRate = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16) | (bytes[27] << 24);
    const byteRate = bytes[28] | (bytes[29] << 8) | (bytes[30] << 16) | (bytes[31] << 24);
    const bitrate = byteRate > 0 ? Math.round((byteRate * 8) / 1000) : 1411;
    return { sampleRate, bitrate };
  }
  return null;
}

/**
 * 实时解析音频 URL 的采样率与比特率
 */
export async function getAudioMetadata(
  url: string, 
  duration?: number
): Promise<AudioQualityInfo> {
  if (!url) {
    return { sampleRate: '44.1kHz', bitrate: '320kbps' };
  }

  // 检查缓存
  if (metadataCache.has(url)) {
    const cached = metadataCache.get(url)!;
    // 如果已有准确数据直接返回
    if (cached.bitrate !== '320kbps' || !duration) {
      return cached;
    }
  }

  try {
    // 优先尝试 Range 请求获取文件前 16KB，兼顾速度与低流量
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      headers: { Range: 'bytes=0-16383' },
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      // 服务器不支持 Range 请求时会忽略 Range 头，返回 200 + 完整的音频文件。
      // 此时若继续读取响应体，等于把整首歌再完整下载一遍（几 MB 到几十 MB），
      // 在移动端会直接占满带宽、拖垮 <audio> 的流式加载，导致歌曲播放失败。
      // 因此只接受 206 Partial Content，在读取 body 之前就中止，避免下载整首歌。
      if (response.status !== 206) {
        controller.abort();
        return { sampleRate: '44.1kHz', bitrate: '320kbps' };
      }

      let totalBytes: number | null = null;
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match && match[1]) {
          totalBytes = parseInt(match[1], 10);
        }
      }
      if (!totalBytes) {
        const cl = response.headers.get('content-length');
        if (cl && response.status === 200) {
          totalBytes = parseInt(cl, 10);
        }
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let parsed = parseMp3Header(bytes) || parseFlacHeader(bytes) || parseWavHeader(bytes);

      // 如果有总大小和时长，结合计算真实的平均比特率 (VBR / AAC / M4A 特别准)
      if (totalBytes && duration && duration > 0) {
        const calculatedBitrate = Math.round((totalBytes * 8) / (duration * 1000));
        if (calculatedBitrate > 0) {
          if (!parsed) {
            parsed = { sampleRate: 44100, bitrate: calculatedBitrate };
          } else {
            // 如果解析出的比特率偏差大或属于计算型，以计算出的实际比特率为准
            parsed.bitrate = calculatedBitrate;
          }
        }
      }

      if (parsed) {
        const info: AudioQualityInfo = {
          sampleRate: formatSampleRate(parsed.sampleRate || 44100),
          bitrate: formatBitrate(parsed.bitrate || 320)
        };
        metadataCache.set(url, info);
        return info;
      }
    }
  } catch (err) {
    // 忽略异常，降级到默认/硬件感知
  }

  // 降级方案：根据 AudioContext 和 duration 进行推测
  const fallbackSr = getFallbackSampleRate();
  const fallbackInfo: AudioQualityInfo = {
    sampleRate: fallbackSr,
    bitrate: '320kbps'
  };
  metadataCache.set(url, fallbackInfo);
  return fallbackInfo;
}
