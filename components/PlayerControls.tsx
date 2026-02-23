import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat1 } from 'lucide-react';
import { PlayMode } from '../types';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  playMode: PlayMode;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  playMode,
}) => {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-8 relative">
      <button onClick={onPrev} className="text-gray-300 hover:text-white transition-transform active:scale-95 p-2 hover:bg-white/10 rounded-full">
        <SkipBack size={24} fill="currentColor" />
      </button>

      <button
        onClick={onPlayPause}
        className="bg-white text-black rounded-full p-3 hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-white/10"
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

      {/* 仅在激活时显示的移动端随机播放指示器 */}
      {playMode !== PlayMode.SEQUENCE && (
        <div className="sm:hidden absolute -right-2 -top-2 text-green-400">
           {playMode === PlayMode.SHUFFLE ? <Shuffle size={14}/> : <Repeat1 size={14}/>}
        </div>
      )}
    </div>
  );
};