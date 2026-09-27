import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SONG_LIST } from './constants';
import { Song, PlayMode } from './types';
import { PlayerControls } from './components/PlayerControls';
import { ProgressBar } from './components/ProgressBar';
import { SongList } from './components/SongList';
import { LyricsView } from './components/LyricsView';
import { AudioVisualizer } from './components/AudioVisualizer';
import { parseLrc, LyricLine } from './utils';
import { MarqueeText } from './components/MarqueeText';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { SongVaultEditorModal } from './components/SongVaultEditorModal';
import { TranslateBadgeIcon } from './components/TranslateIcon';
import { 
  Volume2, 
  VolumeX, 
  ListMusic, 
  Repeat, 
  Repeat1, 
  Shuffle, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronDown, 
  ChevronRight,
  Disc3
} from 'lucide-react';

// 主应用组件
const App: React.FC = () => {
  // 状态
  const [playlist, setPlaylist] = useState<Song[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const url = params.get('audio') || params.get('url'); // 使用 audio 替代 url 避免 Vite 冲突
    const playerSongName = params.get('player');

    if (name && url) {
      return [{
        name,
        artist: params.get('artist') || 'Unknown Artist',
        url,
        cover: params.get('cover') || 'https://picsum.photos/seed/custom/500/500',
        lrc: params.get('lrc') || ''
      }, ...SONG_LIST];
    }
    
    if (playerSongName) {
      const targetSongIndex = SONG_LIST.findIndex(song => song.name === playerSongName);
      if (targetSongIndex !== -1) {
        // 将目标歌曲移动到列表顶部
        const newPlaylist = [...SONG_LIST];
        const [targetSong] = newPlaylist.splice(targetSongIndex, 1);
        newPlaylist.unshift(targetSong);
        return newPlaylist;
      }
    }

    return SONG_LIST;
  });

  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showAutoPlayAlert, setShowAutoPlayAlert] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCustomSong = !!(params.get('name') && (params.get('audio') || params.get('url')));
    const hasPlayerSong = !!params.get('player') && SONG_LIST.some(song => song.name === params.get('player'));
    return hasCustomSong || hasPlayerSong;
  });
  const [playMode, setPlayMode] = useState<PlayMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCustomSong = !!(params.get('name') && (params.get('audio') || params.get('url')));
    const hasPlayerSong = !!params.get('player') && SONG_LIST.some(song => song.name === params.get('player'));
    return (hasCustomSong || hasPlayerSong) ? PlayMode.LOOP : PlayMode.SEQUENCE;
  });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [isMobileVolumeOpen, setIsMobileVolumeOpen] = useState<boolean>(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  // 单首歌曲的歌词翻译控制 (需要单独主动开启，切歌自动重置为 false)
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const hasTranslation = useMemo(() => parsedLyrics.some(line => !!line.translation), [parsedLyrics]);
  
  // 移动端视图状态：'cover' (黑胶封面首页) 或 'lyrics' (完整歌词页)
  const [mobileTab, setMobileTab] = useState<'cover' | 'lyrics'>('cover');

  // 检查歌曲是否被设置为隐藏 (hide 为 "true" 或 true)
  const isSongHidden = (s?: Song) => s?.hide === 'true' || s?.hide === true;

  // 管理员解锁隐藏歌曲状态 (默认每次访问都必须是未解锁锁定状态，彻底清除历史遗留的本地缓存)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      localStorage.removeItem('revelation_unlocked');
      sessionStorage.removeItem('revelation_unlocked');
    } catch (e) {
      console.warn(e);
    }
    return false;
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isVaultEditorOpen, setIsVaultEditorOpen] = useState<boolean>(false);

  // 根据管理员解锁状态过滤出可见的播放列表
  const visiblePlaylist = useMemo(() => {
    return isUnlocked ? playlist : playlist.filter(song => !isSongHidden(song));
  }, [playlist, isUnlocked]);

  const hiddenSongsCount = useMemo(() => {
    return playlist.filter(song => isSongHidden(song)).length;
  }, [playlist]);

  const handleUnlockSuccess = () => {
    const currentPlayingSong = visiblePlaylist[currentSongIndex];
    setIsUnlocked(true);
    // 解锁后所有歌曲可见，重新定位当前歌曲的索引，避免歌曲跳变
    if (currentPlayingSong) {
      const newIdx = playlist.findIndex(s => s.name === currentPlayingSong.name && s.url === currentPlayingSong.url);
      if (newIdx !== -1) {
        setCurrentSongIndex(newIdx);
      }
    }
  };

  const handleToggleLock = () => {
    const currentPlayingSong = visiblePlaylist[currentSongIndex];
    setIsUnlocked(false);
    try {
      localStorage.removeItem('revelation_unlocked');
      sessionStorage.removeItem('revelation_unlocked');
    } catch (e) {
      console.warn(e);
    }
    const newVisible = playlist.filter(s => !isSongHidden(s));
    if (currentPlayingSong) {
      const newIdx = newVisible.findIndex(s => s.name === currentPlayingSong.name && s.url === currentPlayingSong.url);
      if (newIdx !== -1) {
        setCurrentSongIndex(newIdx);
      } else {
        // 当前播放的是被隐藏歌曲，退回到可见列表的第 0 首
        setCurrentSongIndex(0);
      }
    }
  };

  // 移动端手势滑动处理 (左滑进入完整歌词，右滑返回黑胶封面)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    
    // 水平滑动距离大于40px，且横向位移大于纵向位移的1.3倍时触发切换
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && mobileTab === 'cover') {
        // 左滑 -> 进入歌词
        setMobileTab('lyrics');
      } else if (deltaX > 0 && mobileTab === 'lyrics') {
        // 右滑 -> 返回封面
        setMobileTab('cover');
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // 引用
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentLoadedSongUrlRef = useRef<string>('');
  
  const currentSong = visiblePlaylist[currentSongIndex] || visiblePlaylist[0] || playlist[0];

  // 当前播放行歌词（用于单行展示）
  const activeLyricIndex = parsedLyrics.findIndex((line, index) => {
    const nextLine = parsedLyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });
  const currentActiveLyric = parsedLyrics[activeLyricIndex];
  const currentLyricText = currentActiveLyric
    ? (showTranslation && currentActiveLyric.translation 
        ? `${currentActiveLyric.text}  (${currentActiveLyric.translation})` 
        : currentActiveLyric.text)
    : (parsedLyrics.length > 0 && parsedLyrics[0]?.text !== '暂无歌词' ? '♪ 音乐就绪 ♪' : '暂无歌词');

  // --- 全局安全与交互设置 ---
  useEffect(() => {
    // 禁止右键菜单
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 禁止开发者工具快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Windows/Linux)
      // Cmd+Option+I, Cmd+Option+J, Cmd+Option+C (Mac)
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.shiftKey || e.altKey) && 
        ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)
      ) {
        e.preventDefault();
      }

      // Ctrl+U (查看源代码) / Ctrl+S (保存)
      if ((e.ctrlKey || e.metaKey) && ['u', 'U', 's', 'S'].includes(e.key)) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- 音频事件处理程序 ---

  // 使用 requestAnimationFrame 进行高精度时间更新
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (audioRef.current) {
        // 只有在未暂停时更新时间，避免冲突
        if (!audioRef.current.paused) {
           setCurrentTime(audioRef.current.currentTime);
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      // 确保应用当前的播放速度
      audioRef.current.playbackRate = playbackRate;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play failed:", e));
      }
    }
  };

  const handleSongEnd = () => {
    if (playMode === PlayMode.LOOP) {
        if(audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    } else {
        handleNext();
    }
  };

  // --- 控制逻辑 ---

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = useCallback(() => {
    setCurrentSongIndex((prevIndex) => {
      if (playMode === PlayMode.SHUFFLE) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * visiblePlaylist.length);
        } while (newIndex === prevIndex && visiblePlaylist.length > 1);
        return newIndex;
      } else {
        return (prevIndex + 1) % visiblePlaylist.length;
      }
    });
  }, [playMode, visiblePlaylist.length]);

  const handlePrev = () => {
    // 如果当前时间 > 10 秒，则重播当前歌曲而不是切换到上一首
    if (audioRef.current && audioRef.current.currentTime > 10) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0); // 手动更新状态以获得即时反馈
      return;
    }

    setCurrentSongIndex((prevIndex) => {
      if (playMode === PlayMode.SHUFFLE) {
        return Math.floor(Math.random() * visiblePlaylist.length);
      }
      return (prevIndex - 1 + visiblePlaylist.length) % visiblePlaylist.length;
    });
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlayMode = () => {
    setPlayMode((prev) => {
      if (prev === PlayMode.SEQUENCE) return PlayMode.LOOP;
      if (prev === PlayMode.LOOP) return PlayMode.SHUFFLE;
      return PlayMode.SEQUENCE;
    });
  };

  useEffect(() => {
    // 检查音频 URL 是否真正改变。
    // 如果是因为【解锁隐藏歌曲】或【重新锁定隐藏歌曲】导致列表长度或当前索引发生微调，
    // 但正在播放的音频 URL 并没有变，则不重新 load() 或 reset 进度，保持原样无缝播放。
    if (currentLoadedSongUrlRef.current === currentSong.url) {
      return;
    }

    currentLoadedSongUrlRef.current = currentSong.url;

    // 单首歌曲的歌词翻译需要单独主动开启：切歌时自动重置为未开启
    setShowTranslation(false);

    // 真正切换到另一首新歌曲时，才重置时间和时长
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch((e) => {
            console.warn("Autoplay blocked or file not found:", e);
        });
      }
    }
    
    // 获取并解析歌词
    setParsedLyrics([]);
    if (currentSong.lrc) {
      fetch(currentSong.lrc)
        .then(res => {
            if(!res.ok) throw new Error("Lyrics not found");
            return res.text();
        })
        .then(text => {
          const lines = parseLrc(text);
          setParsedLyrics(lines);
        })
        .catch(err => {
          console.error("Failed to load lyrics:", err);
          setParsedLyrics([{ time: 0, text: "暂无歌词" }]);
        });
    } else {
      setParsedLyrics([{ time: 0, text: "未提供歌词链接" }]);
    }

  }, [currentSong.url]); 

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 更新播放速度
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  return (
    <div className="relative h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden font-sans bg-gray-950 text-white select-none">
      
      {/* 动态背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out z-0 opacity-30 scale-110 blur-[80px]"
        style={{ backgroundImage: `url(${currentSong.cover})` }}
      />
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* 可视化效果（仅限桌面端）- 精确贴合底部控制栏顶部 */}
      <div 
        className="hidden md:block absolute bottom-[114px] left-0 right-0 h-[35vh] z-[5] pointer-events-none opacity-80"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)' }}
      >
         <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />
      </div>

      {/* 头部 / 品牌 & 移动端导航 */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2.5 md:p-6 w-full max-w-7xl mx-auto flex-shrink-0">
        {/* 品牌 Logo 与 名称（移动端 & 桌面端常驻，充分利用空间并支持长标题走马灯滚动） */}
        <div 
          onClick={() => mobileTab === 'lyrics' && setMobileTab('cover')}
          className={`flex items-center gap-2 md:gap-3 select-none flex-1 min-w-0 mr-3 md:mr-0 ${mobileTab === 'lyrics' ? 'cursor-pointer md:cursor-default active:scale-95 md:active:scale-100 transition-transform' : ''}`}
          title={mobileTab === 'lyrics' ? "点击返回唱片封面" : "Revelation's Music"}
        >
          <img 
            src="https://telegraph-image-uqe.pages.dev/file/BQACAgUAAyEGAASupuQzAAM6aW6Rl0hr3GhPenfS1Ec-5oEJj7IAAp0dAAJKfnhX7lAt8rS8dj84BA.svg" 
            alt="Revelation Logo" 
            className="w-7 h-7 md:w-10 md:h-10 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] shrink-0"
            draggable={false}
          />
          <div className="overflow-hidden flex-1 min-w-0">
            <MarqueeText
              text="Revelation's Music"
              className="text-sm md:text-2xl font-bold tracking-wider uppercase text-white drop-shadow-sm"
              speed={24}
              pauseDuration={2400}
            />
          </div>
        </div>

        {/* 移动端顶部控制器：分页指示器 + 视图快捷键 */}
        <div className="flex md:hidden items-center gap-2.5 shrink-0">
          {/* 中间：分页指示器 */}
          <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setMobileTab('cover')}
              className={`transition-all duration-300 rounded-full ${mobileTab === 'cover' ? 'w-3.5 h-1.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
              title="封面视图"
            />
            <button 
              onClick={() => setMobileTab('lyrics')}
              className={`transition-all duration-300 rounded-full ${mobileTab === 'lyrics' ? 'w-3.5 h-1.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
              title="完整歌词"
            />
          </div>

          {/* 右侧：快速切换视图按钮 (正圆形 SVG 图标) */}
          <button
            onClick={() => setMobileTab(mobileTab === 'cover' ? 'lyrics' : 'cover')}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 text-gray-200 active:scale-90 transition-all shadow-sm"
            title={mobileTab === 'cover' ? '查看歌词' : '返回唱片封面'}
          >
            {mobileTab === 'cover' ? (
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]"
              >
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2" />
                <text 
                  x="12" 
                  y="12.5" 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  fill="currentColor" 
                  fontSize="11.5" 
                  fontWeight="bold" 
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  词
                </text>
              </svg>
            ) : (
              <Disc3 
                size={16} 
                className="text-green-400 animate-[spin_6s_linear_infinite]" 
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
            )}
          </button>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="relative z-10 flex-1 flex flex-col w-full max-w-7xl mx-auto min-h-0 overflow-hidden">
          
          {/* ===================== 桌面端布局 ===================== */}
          <div className="hidden md:flex flex-row items-center md:items-stretch justify-center w-full h-full px-6 gap-16 pb-36 pt-0 min-h-0">
            {/* 左侧：专辑封面 */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-1/2 max-w-md space-y-8">
              <div className={`
                  relative w-96 h-96 rounded-2xl shadow-2xl overflow-hidden
                  transition-all duration-700 ease-out border border-white/10
                  ${isPlaying ? 'scale-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'scale-95 opacity-80'}
              `}>
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
              </div>
              
              <div className="text-center space-y-2">
                  <h1 className="text-4xl font-bold text-white drop-shadow-md line-clamp-2">
                      {currentSong.name}
                  </h1>
                  <p className="text-xl text-gray-400 font-medium">
                      {currentSong.artist}
                  </p>
              </div>
            </div>

            {/* 右侧：歌词 */}
            <div className="flex-1 w-full min-h-0 relative overflow-hidden">
              <LyricsView 
                  lyrics={parsedLyrics} 
                  currentTime={currentTime} 
                  onLyricClick={handleSeek}
                  showTranslation={showTranslation}
                  onToggleTranslation={() => setShowTranslation(v => !v)}
                  hasTranslation={hasTranslation}
              />
            </div>
          </div>

          {/* ===================== 移动端布局 ===================== */}
          <div 
            className="flex md:hidden flex-col flex-1 min-h-0 w-full px-4 pt-0 pb-[136px] relative select-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {mobileTab === 'cover' ? (
              /* ----- 经典黑胶唱机 + 紧凑歌曲信息 + 单行歌词 + 两端分散对齐工具栏 ----- */
              <div className="flex-1 flex flex-col justify-between min-h-0 w-full max-w-md mx-auto pt-0 pb-2.5 overflow-hidden">
                {/* 1. 经典拟真黑胶唱片机卡片 (自适应高度，贴近顶部并缩短下方间距) */}
                <div className="flex-1 flex items-center justify-center min-h-0 max-h-[35vh] sm:max-h-[40vh] my-auto py-0 -translate-y-1">
                  <div className="relative w-full aspect-square max-w-[215px] xs:max-w-[245px] sm:max-w-[275px] max-h-[245px] sm:max-h-[275px] rounded-[30px] bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/15 p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-center overflow-hidden">
                    {/* 唱针臂 (Tonearm Stylus) */}
                    <div 
                      className="absolute top-2 right-4 w-16 h-28 pointer-events-none transition-transform duration-700 origin-top-right z-30"
                      style={{
                        transform: isPlaying ? 'rotate(18deg)' : 'rotate(-10deg)',
                        transformOrigin: 'top right'
                      }}
                    >
                      {/* 唱针底座 */}
                      <div className="absolute top-0 right-0 w-7 h-7 rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 shadow-md border border-white/30 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-500" />
                      </div>
                      {/* 唱针杆 */}
                      <div className="absolute top-3.5 right-3 w-1 h-20 bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-600 shadow-sm origin-top -rotate-[16deg]">
                        {/* 唱头 */}
                        <div className="absolute -bottom-3 -left-1.5 w-4 h-6 rounded-sm bg-gradient-to-r from-zinc-900 to-zinc-700 border border-zinc-600 shadow-lg flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                        </div>
                      </div>
                    </div>

                    {/* 黑胶唱片盘体（拟真同心圆黑胶纹理，播放旋转/暂停原地停留） */}
                    <div 
                      className="relative w-full h-full rounded-full shadow-[0_18px_40px_rgba(0,0,0,0.85)] border-[3.5px] border-zinc-800/80 flex items-center justify-center animate-[spin_20s_linear_infinite]"
                      style={{
                        background: 'radial-gradient(circle, #27272a 32%, #09090b 42%, #18181b 50%, #09090b 60%, #18181b 70%, #09090b 80%, #18181b 90%, #09090b 100%)',
                        animationPlayState: isPlaying ? 'running' : 'paused'
                      }}
                    >
                      {/* 唱片中心封面 */}
                      <div className="w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/25 shadow-inner relative flex items-center justify-center">
                        <img 
                          src={currentSong.cover} 
                          alt={currentSong.name} 
                          className="w-full h-full object-cover" 
                          draggable={false} 
                        />
                        {/* 中心轴孔 */}
                        <div className="absolute w-4.5 h-4.5 rounded-full bg-gray-950 border-2 border-white/40 shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 紧凑歌曲信息 */}
                <div className="w-full px-2 mt-0.5 shrink-0">
                  <div className="w-full overflow-hidden">
                    <MarqueeText
                      text={currentSong.name}
                      className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm leading-tight"
                      speed={32}
                      pauseDuration={2400}
                    />
                    <div className="flex items-center gap-2 mt-0.5 w-full overflow-hidden">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <MarqueeText
                          text={currentSong.artist}
                          className="text-xs sm:text-sm text-gray-400 font-medium"
                          speed={25}
                          pauseDuration={2500}
                        />
                      </div>
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-white/10 text-green-400/90 rounded border border-white/10 tracking-wider shrink-0">
                        SQ
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-white/10 text-gray-300 rounded border border-white/10 shrink-0">
                        沉浸音效
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. 单行歌词展示栏 (支持走马灯与点击跳转完整歌词) */}
                <div className="w-full px-2 mt-1.5 shrink-0">
                  <div 
                    onClick={() => setMobileTab('lyrics')}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/10 active:scale-98 transition-all group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <MarqueeText
                          text={currentLyricText}
                          className="text-xs sm:text-sm font-medium text-green-300 group-hover:text-green-200 transition-colors"
                          speed={30}
                          pauseDuration={2000}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0 group-hover:text-white transition-colors">
                      <span>歌词</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>

                {/* 4. 辅助操作栏 */}
                <div className="w-full px-2 mt-2 mb-1 flex items-center justify-between text-xs text-gray-400 shrink-0">
                  {/* 音量控制 */}
                  <div className="relative">
                    {isMobileVolumeOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMobileVolumeOpen(false)} />
                        <div className="absolute bottom-full left-0 mb-3 p-3 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-2 w-12 z-50 animate-in fade-in duration-200">
                          <div className="h-28 w-2 flex items-center justify-center relative">
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="absolute w-28 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400 -rotate-90 origin-center"
                            />
                          </div>
                          <div className="text-[10px] font-mono text-green-400 font-bold">{Math.round(volume * 100)}%</div>
                        </div>
                      </>
                    )}
                    <button 
                      onClick={() => setIsMobileVolumeOpen(!isMobileVolumeOpen)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all text-[11px]"
                    >
                      {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span className="font-mono">{Math.round(volume * 100)}%</span>
                    </button>
                  </div>

                  {/* 移动端黑胶视图下外部翻译按钮 (仅在存在译文时显示，居中/右侧自然分布) */}
                  {hasTranslation ? (
                    <button 
                      onClick={() => setShowTranslation(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 shadow-sm ${
                        showTranslation 
                          ? 'bg-green-500/20 text-green-300 border-green-500/40 shadow-green-500/10' 
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                      title={showTranslation ? "关闭歌词翻译" : "开启歌词翻译"}
                    >
                      <TranslateBadgeIcon active={showTranslation} size={14} />
                      <span>{showTranslation ? '译 ON' : '译 OFF'}</span>
                    </button>
                  ) : <div />}

                  {/* 倍速控制 */}
                  <div className="relative">
                    {isSpeedMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSpeedMenuOpen(false)} />
                        <div className="absolute bottom-full right-0 mb-3 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col w-20 z-50 animate-in fade-in duration-200 py-1">
                          {[2.0, 1.5, 1.25, 1.0, 0.75].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => {
                                setPlaybackRate(rate);
                                setIsSpeedMenuOpen(false);
                              }}
                              className={`px-0 py-1.5 text-xs font-bold font-mono hover:bg-white/10 transition-colors text-center w-full ${playbackRate === rate ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button 
                      onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all font-mono text-[11px]"
                    >
                      <span>倍速</span>
                      <span className="text-green-400 font-bold">{playbackRate}x</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ----- 迷你歌曲信息栏 + 沉浸式完整歌词滚动 ----- */
              <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
                {/* 顶部迷你歌曲栏 */}
                <div 
                  onClick={() => setMobileTab('cover')}
                  className="w-full px-3 py-1.5 flex items-center justify-between cursor-pointer group bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md mb-1.5 shrink-0 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <img 
                      src={currentSong.cover} 
                      alt={currentSong.name} 
                      className="w-10 h-10 rounded-xl object-cover shadow-md border border-white/15 shrink-0 group-hover:scale-105 transition-transform" 
                    />
                    <div className="overflow-hidden flex-1 min-w-0">
                      <MarqueeText
                        text={currentSong.name}
                        className="text-sm font-bold text-white group-hover:text-green-300 transition-colors"
                        speed={28}
                        pauseDuration={2200}
                      />
                      <div className="text-xs text-gray-400 mt-0.5 overflow-hidden">
                        <MarqueeText
                          text={currentSong.artist}
                          className="text-xs text-gray-400"
                          speed={22}
                          pauseDuration={2400}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5 text-gray-400 group-hover:text-white shrink-0 ml-2 transition-colors">
                    <ChevronDown size={18} />
                  </div>
                </div>

                {/* 完整歌词滚动视图 */}
                <div className="flex-1 w-full min-h-0 relative overflow-hidden">
                  <LyricsView 
                    lyrics={parsedLyrics} 
                    currentTime={currentTime} 
                    onLyricClick={handleSeek}
                    showTranslation={showTranslation}
                    onToggleTranslation={() => setShowTranslation(v => !v)}
                    hasTranslation={hasTranslation}
                  />
                </div>
              </div>
            )}
          </div>

      </main>

      {/* 底部控制栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-2xl border-t border-white/10 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-3 sm:px-4 md:px-8 shadow-2xl">
         <div className="max-w-7xl mx-auto flex flex-col gap-2 md:gap-3">
             
             {/* 进度条 */}
             <ProgressBar 
                currentTime={currentTime} 
                duration={duration} 
                onSeek={handleSeek} 
             />

             {/* ===================== 桌面端播放器主控 (保持原样不变) ===================== */}
             <div className="hidden md:flex items-center justify-between gap-2 w-full">
                 {/* 左侧：歌曲信息 */}
                 <div className="flex w-1/3 items-center gap-4 justify-start">
                    <img 
                      src={currentSong.cover} 
                      className="w-14 h-14 rounded-lg bg-gray-800 object-cover border border-white/10" 
                      alt="mini cover"
                      draggable={false}
                    />
                    <div className="overflow-hidden">
                        <div className="text-base font-bold truncate text-white">{currentSong.name}</div>
                        <div className="text-sm text-gray-400 truncate">{currentSong.artist}</div>
                    </div>
                 </div>

                 {/* 中间：播放核心控制 */}
                 <div className="flex flex-1 justify-center">
                    <PlayerControls 
                        isPlaying={isPlaying} 
                        onPlayPause={handlePlayPause} 
                        onNext={handleNext} 
                        onPrev={handlePrev}
                        playMode={playMode}
                    />
                 </div>

                 {/* 右侧：模式、倍速、音量、歌单 */}
                 <div className="flex w-1/3 items-center gap-3 justify-end">
                    {/* 倍速控制 */}
                    <div className="relative z-40">
                         {isSpeedMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSpeedMenuOpen(false)} />
                                <div className="absolute bottom-full right-0 mb-3 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col w-20 z-50 animate-in fade-in duration-200 py-1">
                                    {[2.0, 1.5, 1.25, 1.0, 0.75].map((rate) => (
                                        <button
                                            key={rate}
                                            onClick={() => {
                                                setPlaybackRate(rate);
                                                setIsSpeedMenuOpen(false);
                                            }}
                                            className={`px-0 py-2 text-xs font-bold font-mono hover:bg-white/10 transition-colors text-center w-full ${playbackRate === rate ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        <button 
                            onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                            className={`w-9 h-9 flex items-center justify-center text-xs font-bold font-mono transition-colors rounded-full border border-white/20 hover:border-white/50 ${isSpeedMenuOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title="播放速度"
                        >
                            {playbackRate}x
                        </button>
                    </div>

                    {/* 循环模式 */}
                    <button 
                        onClick={togglePlayMode}
                        className="p-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-full"
                        title="切换播放模式"
                    >
                        {playMode === PlayMode.LOOP ? (
                            <Repeat1 size={20} className="text-green-400" />
                        ) : playMode === PlayMode.SHUFFLE ? (
                            <Shuffle size={20} className="text-green-400" />
                        ) : (
                            <Repeat size={20} />
                        )}
                    </button>

                    {/* 音量控制 */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setVolume(v => v === 0 ? 0.7 : 0)} className="text-gray-400 hover:text-white">
                             {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400"
                        />
                    </div>

                    {/* 播放列表 */}
                    <button 
                        onClick={() => setIsPlaylistOpen(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-full"
                        title="播放列表"
                    >
                        <ListMusic size={20} />
                    </button>
                 </div>
             </div>

             {/* ===================== 移动端播放器主控 ===================== */}
             <div className="flex md:hidden items-center justify-between w-full px-2">
                 {/* 1. 播放模式切换 (顺序/单曲循环/随机) */}
                 <button 
                     onClick={togglePlayMode}
                     className="p-2.5 text-gray-400 hover:text-white transition-all active:scale-90 rounded-full hover:bg-white/10"
                     title="切换播放模式"
                 >
                     {playMode === PlayMode.LOOP ? (
                         <Repeat1 size={22} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                     ) : playMode === PlayMode.SHUFFLE ? (
                         <Shuffle size={22} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                     ) : (
                         <Repeat size={22} />
                     )}
                 </button>

                 {/* 2. 上一首 */}
                 <button 
                     onClick={handlePrev}
                     className="p-2.5 text-gray-200 hover:text-white transition-transform active:scale-90 rounded-full hover:bg-white/10"
                     title="上一首"
                 >
                     <SkipBack size={26} fill="currentColor" />
                 </button>

                 {/* 3. 播放 / 暂停 */}
                 <button 
                     onClick={handlePlayPause}
                     className="bg-white text-black rounded-full p-4 hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-white/20 mx-1"
                     title={isPlaying ? "暂停" : "播放"}
                 >
                     {isPlaying ? (
                         <Pause size={28} fill="currentColor" />
                     ) : (
                         <Play size={28} fill="currentColor" className="ml-1" />
                     )}
                 </button>

                 {/* 4. 下一首 */}
                 <button 
                     onClick={handleNext}
                     className="p-2.5 text-gray-200 hover:text-white transition-transform active:scale-90 rounded-full hover:bg-white/10"
                     title="下一首"
                 >
                     <SkipForward size={26} fill="currentColor" />
                 </button>

                 {/* 5. 播放列表抽屉 */}
                 <button 
                     onClick={() => setIsPlaylistOpen(true)}
                     className="p-2.5 text-gray-400 hover:text-white transition-all active:scale-90 rounded-full hover:bg-white/10"
                     title="播放列表"
                 >
                     <ListMusic size={22} />
                 </button>
             </div>
         </div>
      </div>

      {/* 播放列表模态框/抽屉 */}
      <div 
        className={`
            fixed inset-y-0 right-0 w-full md:w-96 bg-gray-900/95 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-out shadow-2xl border-l border-white/10
            ${isPlaylistOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none invisible'}
        `}
      >
        <div className="h-full overflow-hidden">
             <SongList 
                 songs={visiblePlaylist} 
                 currentSongIndex={currentSongIndex} 
                 isPlaying={isPlaying} 
                 onSelectSong={(idx) => {
                     setCurrentSongIndex(idx);
                     setIsPlaying(true);
                 }} 
                 onClose={() => setIsPlaylistOpen(false)}
                 isUnlocked={isUnlocked}
                 onOpenUnlockModal={() => setIsPasswordModalOpen(true)}
                 onToggleLock={handleToggleLock}
                 hiddenCount={hiddenSongsCount}
                 onOpenVaultEditor={() => setIsVaultEditorOpen(true)}
             />
        </div>
      </div>
      
      {/* 播放列表背景（点击外部关闭） - 打开时在移动端和桌面端均可见 */}
      {isPlaylistOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:bg-transparent"
            onClick={() => setIsPlaylistOpen(false)}
        />
      )}

      {/* 管理员密码解锁弹窗 */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccessUnlock={handleUnlockSuccess}
      />

      {/* 管理员曲库明文维护与加密助手 */}
      <SongVaultEditorModal
        isOpen={isVaultEditorOpen}
        onClose={() => setIsVaultEditorOpen(false)}
        songs={playlist}
      />

      {/* 自定义弹窗：自动播放提示 */}
      {showAutoPlayAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 text-green-400">
              <Play size={32} fill="currentColor" className="ml-1" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">准备就绪</h3>
            <p className="text-gray-400 text-sm mb-6">
              由于浏览器自动播放策略限制，我们需要您手动点击播放按钮来开始音乐。
            </p>
            <button 
              onClick={() => setShowAutoPlayAlert(false)}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous" 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnd}
        onError={(e) => console.error("Audio Load Error:", e)}
      />
    </div>
  );
};

export default App;