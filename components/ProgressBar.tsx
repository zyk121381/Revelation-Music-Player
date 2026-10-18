import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
  isPlaying?: boolean;
  themeColor?: string;
  glowColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  audioRef,
  isPlaying = false,
  themeColor = '#4ade80',
  glowColor = 'rgba(74, 222, 128, 0.45)'
}) => {
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  // 直接写 DOM：进度位置与时间码都不经过 state，因此不会触发 React 重渲染
  const applyProgress = (time: number) => {
    const percent = duration > 0 ? Math.min(100, Math.max(0, (time / duration) * 100)) : 0;
    if (fillRef.current) fillRef.current.style.width = `${percent}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${percent}%`;
  };

  // 播放期间跟随屏幕刷新率推进（60fps 平滑），但因为只改 DOM，开销极低
  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;
    const tick = () => {
      const audio = audioRef?.current;
      if (audio && duration > 0 && !isDraggingRef.current) {
        applyProgress(audio.currentTime);
        if (elapsedRef.current) {
          const text = formatTime(audio.currentTime);
          if (elapsedRef.current.textContent !== text) {
            elapsedRef.current.textContent = text;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, duration, audioRef]);

  // 兜底同步：暂停、切歌、程序跳转等非播放状态由 props 驱动
  useEffect(() => {
    if (isDraggingRef.current) return;
    applyProgress(currentTime);
    if (elapsedRef.current) elapsedRef.current.textContent = formatTime(currentTime);
  }, [currentTime, duration]);

  // 拖拽期间停止自动推进，松手后恢复（监听 window 避免手指滑出进度条后卡在拖拽态）
  useEffect(() => {
    if (!isDragging) return;
    const stopDrag = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, [isDragging]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    applyProgress(time);
    onSeek(time);
  };

  return (
    <div className="flex items-center gap-3 w-full text-xs font-medium text-gray-400 select-none">
      <span ref={elapsedRef} className="w-10 text-right font-mono">{formatTime(currentTime)}</span>

      <div className="relative flex-1 h-8 flex items-center group">
        {/* 背景轨道 */}
        <div className="absolute w-full h-1 bg-white/20 rounded-full overflow-hidden">
          {/* 进度填充 - 随封面色彩自适应（宽度由 JS 直接控制） */}
          <div
            ref={fillRef}
            className="h-full"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 10px ${glowColor}`
            }}
          />
        </div>

        {/* 输入范围（不可见但可点击拖拽） */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleChange}
          onPointerDown={() => {
            isDraggingRef.current = true;
            setIsDragging(true);
          }}
          className="slider-thumb absolute w-full h-full opacity-0 cursor-pointer z-10"
        />

        {/* 可见滑块（悬停/激活时显示自适应光点） */}
        <div
          ref={thumbRef}
          className="absolute h-3.5 w-3.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 border border-white"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: themeColor,
            boxShadow: `0 0 12px ${glowColor}`
          }}
        />
      </div>

      <span className="w-10 font-mono">{formatTime(duration)}</span>
    </div>
  );
};
