<div align="right">
  <a title="English" href="README_EN.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English"></a>
  <a title="简体中文" href="README.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔ [Revelation Music Player](https://github.com/zyk121381/Revelation-Music-Player)
一个使用 React 和 Tailwind CSS 构建的现代响应式音乐播放器，具有播放列表管理、歌词支持和沉浸式 UI 设计。

## ⭐功能
- **歌词支持：** 自动同步歌词显示，提供沉浸式的听歌体验。
- **响应式设计：** 跨平台适配，无论设备大小都能提供流畅的使用体验。
- **沉浸式 UI：** 现代简约的设计，专注于音乐播放体验。
- **音乐频谱：** 桌面端实时显示音频频谱，增强视觉效果。
- **播放列表管理：** 支持歌曲的添加、删除和排序。
- **播放控制：** 包括播放、暂停、上一曲、下一曲、播放速度和进度条控制。
- **音量控制：** 支持音量调整（默认初始音量为70%）。
- ~**JSON API：** 用于获取实时音乐数据的API接口。~（已于1.0.3版本移除）
## ⚡快速入门 / 📄文档
### 部署
**环境：** Node.js
1. 安装依赖项：`npm install`
2. 在 `vite.config.ts` 文件中 `allowedHosts` 的中配置部署网站的域名，并按需修改端口（注意：服务器部署网站时开放的端口必须与 `vite.config.ts` 中配置的端口一致）
3. 运行应用程序：`npm run dev`

### 歌曲操作
1. 直接在 `constants.ts` 中配置歌曲信息，按标准JSON格式添加歌曲对象。
   - `"name"`：歌曲名称（字符串）
   - `"artist"`：歌手（字符串）
   - `"url"`：音频文件的 URL（字符串）
   - `"cover"`：封面图片的 URL（字符串）
   - `"lrc"`：歌词文件的 URL（字符串）
2. ~访问 `/list` 可获取音乐详情列表~（已于1.0.3版本移除）
