import React from 'react';
import { ColorPalette } from './colorExtractor';

interface AmbientLightingProps {
  palette: ColorPalette;
  isPlaying: boolean;
}

/**
 * 桌面端动态环境光 (Dynamic Ambient Lighting Canvas)
 * 提取当前专辑封面的色彩流光，在唱片背景与歌词背板后方生成呼吸式环境光晕
 */
export const AmbientLighting: React.FC<AmbientLightingProps> = ({ palette, isPlaying }) => {
  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none z-[2] overflow-hidden select-none">
      {/* 光晕 1：封面背部主光环 (与专辑封面联动呼应，带来立体悬浮质感与温和呼吸) */}
      <div 
        className={`
          absolute w-[460px] h-[460px] rounded-full blur-[110px] opacity-75
          left-[25%] top-[46%] -translate-x-1/2 -translate-y-1/2
          transition-all duration-[1600ms] ease-out
          ${isPlaying ? 'scale-105 opacity-85' : 'scale-95 opacity-60'}
        `}
        style={{
          background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.ambientGlow} 65%, transparent 100%)`,
          transform: `translate(-50%, -50%) ${isPlaying ? 'scale(1.06)' : 'scale(0.96)'}`
        }}
      />

      {/* 光晕 2：右侧歌词沉浸环境光 (辅助对比色漫反射，提升阅读舒适度) */}
      <div 
        className={`
          absolute w-[520px] h-[520px] rounded-full blur-[130px] opacity-65
          right-[18%] top-[42%] -translate-x-1/2 -translate-y-1/2
          transition-all duration-[1800ms] ease-out
        `}
        style={{
          background: `radial-gradient(circle, ${palette.secondary} 0%, ${palette.ambientGlow} 70%, transparent 100%)`,
          transform: `translate(-50%, -50%) ${isPlaying ? 'scale(1.04)' : 'scale(0.98)'}`
        }}
      />

      {/* 光晕 3：中央底部微光晕 (轻柔映衬桌面音频频谱) */}
      <div 
        className="absolute w-[720px] h-[220px] rounded-full blur-[120px] opacity-45 left-1/2 bottom-[110px] -translate-x-1/2 transition-all duration-[1600ms] ease-out"
        style={{
          background: `radial-gradient(ellipse at center, ${palette.accent} 0%, transparent 80%)`
        }}
      />
    </div>
  );
};
