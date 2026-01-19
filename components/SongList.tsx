import React, { useRef, useEffect } from 'react';
import { Song } from '../types';
import { BarChart3, X } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  onSelectSong: (index: number) => void;
  onClose?: () => void;
}

export const SongList: React.FC<SongListProps> = ({ songs, currentSongIndex, isPlaying, onSelectSong, onClose }) => {
  const activeItemRef = useRef<HTMLLIElement>(null);

  // 自动滚动到当前播放的歌曲
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSongIndex]);

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-xl">
      <div className="p-4 border-b border-white/10 sticky top-0 bg-gray-900/95 z-10 flex items-center justify-between">
        <div>
            <h2 className="text-lg font-bold text-white">当前播放列表</h2>
            <p className="text-xs text-gray-400 mt-1">{songs.length} 首歌曲</p>
        </div>
        {onClose && (
            <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                title="关闭"
            >
                <X size={24} />
            </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {songs.map((song, index) => {
          const isActive = index === currentSongIndex;
          return (
            <li
              key={`${song.name}-${index}`}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSelectSong(index)}
              className={`
                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${isActive ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                <img 
                  src={song.cover} 
                  alt={song.name} 
                  loading="lazy"
                  className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-50' : ''}`}
                />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isPlaying ? (
                      <BarChart3 size={16} className="animate-pulse text-green-400" />
                    ) : (
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium truncate ${isActive ? 'text-green-400' : ''}`}>
                  {song.name}
                </h3>
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-400">
                  {song.artist}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};