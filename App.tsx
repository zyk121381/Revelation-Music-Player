import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SONG_LIST } from './constants';
import { PlayMode } from './types';
import { PlayerControls } from './components/PlayerControls';
import { ProgressBar } from './components/ProgressBar';
import { SongList } from './components/SongList';
import { LyricsView } from './components/LyricsView';
import { AudioVisualizer } from './components/AudioVisualizer';
import { parseLrc } from './utils';
import { Volume2, VolumeX, ListMusic, Repeat, Repeat1, Shuffle } from 'lucide-react';

// 主应用组件
const App: React.FC = () => {
  // 状态
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.SEQUENCE);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [isMobileVolumeOpen, setIsMobileVolumeOpen] = useState<boolean>(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
  const [parsedLyrics, setParsedLyrics] = useState<{ time: number; text: string }[]>([]);
  
  // 引用
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const currentSong = SONG_LIST[currentSongIndex];

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
      // 关键修复：无论是否 paused，只要 isPlaying 为 true，都要保持循环运行
      // 这样当歌曲切换（短暂 loading/paused）完成后，循环能继续更新时间
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
          newIndex = Math.floor(Math.random() * SONG_LIST.length);
        } while (newIndex === prevIndex && SONG_LIST.length > 1);
        return newIndex;
      } else {
        return (prevIndex + 1) % SONG_LIST.length;
      }
    });
  }, [playMode]);

  const handlePrev = () => {
    // 如果当前时间 > 10 秒，则重播当前歌曲而不是切换到上一首
    if (audioRef.current && audioRef.current.currentTime > 10) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0); // 手动更新状态以获得即时反馈
      return;
    }

    setCurrentSongIndex((prevIndex) => {
      if (playMode === PlayMode.SHUFFLE) {
        return Math.floor(Math.random() * SONG_LIST.length);
      }
      return (prevIndex - 1 + SONG_LIST.length) % SONG_LIST.length;
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

  // --- 副作用 ---

  // 当歌曲索引改变时，加载新歌曲
  useEffect(() => {
    // 修复：切换歌曲时立即重置时间和时长
    // 防止显示上一首歌曲的残留进度，导致 ProgressBar 或歌词异常
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

  }, [currentSongIndex, currentSong]); 

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
    <div className="relative h-screen w-full flex flex-col overflow-hidden font-sans bg-gray-950 text-white select-none">
      
      {/* 动态背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out z-0 opacity-30 scale-110 blur-[80px]"
        style={{ backgroundImage: `url(${currentSong.cover})` }}
      />
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* 可视化效果（仅限桌面端） */}
      {/* 更新为 bottom-[142.8px] 以匹配底部的实际高度 */}
      <div 
        className="hidden md:block absolute bottom-[142.8px] left-0 right-0 h-[35vh] z-[5] pointer-events-none opacity-80"
        style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%)' }}
      >
         <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />
      </div>

      {/* 头部 / 品牌 */}
      <header className="relative z-20 flex items-center justify-between p-4 md:p-6 w-full max-w-7xl mx-auto flex-shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src="https://telegraph-image-uqe.pages.dev/file/BQACAgUAAyEGAASupuQzAAM6aW6Rl0hr3GhPenfS1Ec-5oEJj7IAAp0dAAJKfnhX7lAt8rS8dj84BA.svg" 
            alt="Revelation Logo" 
            className="w-8 h-8 md:w-10 md:h-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            draggable={false}
          />
          <span className="text-xl md:text-2xl font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Revelation's Music
          </span>
        </div>
      </header>

      {/* 主要内容 */}
      {/* 修改: 在桌面端(md)使用 items-stretch 替代 items-center，以限制子元素高度，确保滚动条生效 */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-stretch justify-start md:justify-center w-full max-w-7xl mx-auto px-6 gap-6 md:gap-16 pb-40 md:pb-36 pt-2 md:pt-0 min-h-0">
          
          {/* 左侧：专辑封面 */}
          {/* 由于父级使用了 items-stretch，这里需要内部 justify-center 来保持垂直居中 */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-1/2 max-w-md space-y-4 md:space-y-8">
             <div className={`
                relative w-48 h-48 md:w-96 md:h-96 rounded-2xl shadow-2xl overflow-hidden
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
                 <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-md line-clamp-2">
                    {currentSong.name}
                 </h1>
                 <p className="text-lg md:text-xl text-gray-400 font-medium">
                    {currentSong.artist}
                 </p>
            </div>
          </div>

          {/* 右侧：歌词 */}
          {/* 确保父容器限制高度，使内部 overflow-y-auto 生效 */}
          <div className="flex-1 w-full min-h-0 relative overflow-hidden">
             <LyricsView 
                lyrics={parsedLyrics} 
                currentTime={currentTime} 
                onLyricClick={handleSeek}
             />
          </div>

      </main>

      {/* 底部栏：控制 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-2xl border-t border-white/5 pt-4 pb-6 px-4 md:px-8">
         <div className="max-w-7xl mx-auto flex flex-col gap-4">
             
             {/* 进度条 */}
             <ProgressBar 
                currentTime={currentTime} 
                duration={duration} 
                onSeek={handleSeek} 
             />

             {/* 控制容器 */}
             <div className="flex items-center justify-between gap-2">
                 
                 {/* 左侧部分：信息（桌面端）或音量（移动端） */}
                 {/* 修改: 移动端 flex-1，桌面端 w-1/3，确保左右对称 */}
                 <div className="flex flex-1 md:flex-none md:w-1/3 items-center gap-4 justify-start">
                    {/* 桌面端：信息 */}
                    <div className="hidden md:flex items-center gap-4">
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
                    {/* 移动端：音量（垂直弹出） */}
                    <div className="flex md:hidden items-center relative z-50">
                        {isMobileVolumeOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsMobileVolumeOpen(false)} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-3 w-14 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="h-32 w-2 flex items-center justify-center relative">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="1" 
                                            step="0.01" 
                                            value={volume}
                                            onChange={(e) => setVolume(Number(e.target.value))}
                                            className="absolute w-32 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400 -rotate-90 origin-center"
                                            style={{ boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                                        />
                                    </div>
                                    <div className="text-xs font-mono text-green-400 font-bold">{Math.round(volume * 100)}%</div>
                                </div>
                            </>
                        )}
                        <button 
                            onClick={() => setIsMobileVolumeOpen(!isMobileVolumeOpen)} 
                            className={`p-2 transition-all duration-200 rounded-full active:scale-95 ${isMobileVolumeOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                             {volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                        </button>
                    </div>
                 </div>

                 {/* 中间部分：主控制 */}
                 {/* 修改: 移动端 shrink-0，桌面端 flex-1 */}
                 <div className="flex shrink-0 md:flex-1 justify-center">
                    <PlayerControls 
                        isPlaying={isPlaying} 
                        onPlayPause={handlePlayPause} 
                        onNext={handleNext} 
                        onPrev={handlePrev}
                        playMode={playMode}
                    />
                 </div>

                 {/* 右侧部分：音量+播放列表（桌面端）或播放列表（移动端） */}
                 {/* 修改: 移动端 flex-1，桌面端 w-1/3 */}
                 <div className="flex flex-1 md:flex-none md:w-1/3 items-center gap-3 justify-end min-w-[3rem]">
                    
                    {/* 播放速度控制 - 移动端和桌面端均显示 */}
                    <div className="relative z-40">
                         {isSpeedMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSpeedMenuOpen(false)} />
                                <div className="absolute bottom-full right-0 mb-3 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col w-20 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 py-1">
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
                            className={`w-9 h-9 flex items-center justify-center text-xs font-bold font-mono transition-colors rounded-full border border-transparent hover:border-white/5 ${isSpeedMenuOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title="播放速度"
                        >
                            {playbackRate}x
                        </button>
                    </div>

                    {/* 桌面端：播放模式切换 (放在音量左侧) */}
                    <button 
                        onClick={togglePlayMode}
                        className="hidden md:block p-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-full"
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

                    {/* 桌面端：音量 */}
                    <div className="hidden md:flex items-center gap-3">
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

                    {/* 播放列表按钮（两者） */}
                    <button 
                        onClick={() => setIsPlaylistOpen(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-full"
                        title="播放列表"
                    >
                        <ListMusic size={20} />
                    </button>
                 </div>
             </div>
         </div>
      </div>

      {/* 播放列表模态框/抽屉 */}
      <div 
        className={`
            fixed inset-y-0 right-0 w-full md:w-96 bg-gray-900/95 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-out shadow-2xl border-l border-white/10
            ${isPlaylistOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full overflow-hidden">
             <SongList 
                 songs={SONG_LIST} 
                 currentSongIndex={currentSongIndex} 
                 isPlaying={isPlaying} 
                 onSelectSong={(idx) => {
                     setCurrentSongIndex(idx);
                     setIsPlaying(true);
                 }} 
                 onClose={() => setIsPlaylistOpen(false)}
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
