import React from 'react';
import { formatTime } from '../utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  themeColor?: string;
  glowColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentTime, 
  duration, 
  onSeek,
  themeColor = '#4ade80',
  glowColor = 'rgba(74, 222, 128, 0.45)'
}) => {
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    <div className="flex items-center gap-3 w-full text-xs font-medium text-gray-400 select-none">
      <span className="w-10 text-right font-mono">{formatTime(currentTime)}</span>
      
      <div className="relative flex-1 h-8 flex items-center group">
        {/* 背景轨道 */}
        <div className="absolute w-full h-1 bg-white/20 rounded-full overflow-hidden">
          {/* 进度填充 - 随封面色彩自适应 */}
          <div 
            className="h-full transition-all duration-75"
            style={{ 
              width: `${progressPercent}%`, 
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
          className="slider-thumb absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {/* 可见滑块（悬停/激活时显示自适应光点） */}
        <div 
          className="absolute h-3.5 w-3.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-150 border border-white"
          style={{ 
            left: `${progressPercent}%`, 
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