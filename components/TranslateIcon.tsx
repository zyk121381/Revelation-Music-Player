import React from 'react';

interface TranslateIconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

/**
 * 现代矢量翻译图标 (SVG)
 */
export const TranslateIcon: React.FC<TranslateIconProps> = ({ 
  size = 18, 
  className = "" 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
};

/**
 * 音乐播放器经典“译”字符号徽章 (SVG 矢量路径设计)
 */
export const TranslateBadgeIcon: React.FC<TranslateIconProps> = ({
  size = 18,
  className = "",
  active = false
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      {/* 外部圆角徽章矩形 */}
      <rect 
        x="2.5" 
        y="2.5" 
        width="19" 
        height="19" 
        rx="5.5" 
        stroke="currentColor" 
        strokeWidth="1.8" 
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.15" : "0"}
      />
      {/* 字符 "译" 矢量精细排布笔画 */}
      {/* 言字旁 */}
      <path 
        d="M6 7.2h2.2M7.1 7.2v2.4M6 9.6h2.2" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M6 13.2h2c0 .9-.3 1.8-1.5 2.5" 
        stroke="currentColor" 
        strokeWidth="1.4" 
        strokeLinecap="round" 
      />
      {/* 右半部分 */}
      <path 
        d="M12.5 7.2h5.5M15.2 7.2v1.8M12.2 10.2h6.1" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M13.2 12.8c.8 1.2 1.8 2.2 3.8 2.6M17.4 13c-.8 1.1-1.8 1.9-3.5 2.4" 
        stroke="currentColor" 
        strokeWidth="1.4" 
        strokeLinecap="round" 
      />
    </svg>
  );
};
