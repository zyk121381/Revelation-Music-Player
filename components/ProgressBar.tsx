import React from 'react';
import { formatTime } from '../utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, onSeek }) => {
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    <div className="flex items-center gap-3 w-full text-xs font-medium text-gray-400 select-none">
      <span className="w-10 text-right">{formatTime(currentTime)}</span>
      
      <div className="relative flex-1 h-8 flex items-center group">
        {/* 背景轨道 */}
        <div className="absolute w-full h-1 bg-gray-600 rounded-full overflow-hidden">
          {/* 进度填充 */}
          <div 
            className="h-full bg-white group-hover:bg-green-400 transition-colors"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* 输入范围（不可见但可点击） */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleChange}
          className="slider-thumb absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {/* 可见滑块（仅在悬停/激活时） */}
        <div 
            className="absolute h-3 w-3 bg-white rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      <span className="w-10">{formatTime(duration)}</span>
    </div>
  );
};