import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Repeat1 } from 'lucide-react';
import { PlayMode } from '../types';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  playMode: PlayMode;
  onToggleMode: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  playMode,
  onToggleMode,
}) => {
  const getModeIcon = () => {
    switch (playMode) {
      case PlayMode.LOOP:
        return <Repeat1 size={20} className="text-green-400" />;
      case PlayMode.SHUFFLE:
        return <Shuffle size={20} className="text-green-400" />;
      default:
        return <Repeat size={20} className="text-gray-400 hover:text-white" />;
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <button 
        onClick={onToggleMode}
        className="p-2 transition-colors duration-200 hidden sm:block hover:bg-white/10 rounded-full"
        title="切换播放模式"
      >
        {getModeIcon()}
      </button>

      {/* 移动端对称占位符，用于平衡右侧指示器 */}
      <div className="sm:hidden w-5" />

      <button onClick={onPrev} className="text-gray-300 hover:text-white transition-transform active:scale-95 p-2 hover:bg-white/10 rounded-full">
        <SkipBack size={24} fill="currentColor" />
      </button>

      <button
        onClick={onPlayPause}
        className="bg-white text-black rounded-full p-3 hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-white/10 mx-2"
      >
        {isPlaying ? (
          <Pause size={28} fill="currentColor" />
        ) : (
          <Play size={28} fill="currentColor" className="ml-1" />
        )}
      </button>

      <button onClick={onNext} className="text-gray-300 hover:text-white transition-transform active:scale-95 p-2 hover:bg-white/10 rounded-full">
        <SkipForward size={24} fill="currentColor" />
      </button>

      {/* 仅在激活时显示的移动端随机播放指示器，否则隐藏（占据空间） */}
      <div className="sm:hidden w-5 flex justify-center">
        {playMode !== PlayMode.SEQUENCE && (
            <div className="text-green-400">
               {playMode === PlayMode.SHUFFLE ? <Shuffle size={16}/> : <Repeat1 size={16}/>}
            </div>
        )}
      </div>
    </div>
  );
};