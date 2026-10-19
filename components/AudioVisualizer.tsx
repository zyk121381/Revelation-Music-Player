import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  themeRgb?: [number, number, number];
}

const AudioVisualizerBase: React.FC<AudioVisualizerProps> = ({
  audioRef,
  isPlaying,
  themeRgb = [74, 222, 128]
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // 保持最新的色彩 RGB 引用，使动画循环无缝平滑自适应，无需重启绘图循环
  const themeRgbRef = useRef<[number, number, number]>(themeRgb);
  useEffect(() => {
    themeRgbRef.current = themeRgb;
  }, [themeRgb]);

  useEffect(() => {
    // 初始化 AudioContext
    const initAudio = () => {
      if (!audioRef.current || sourceRef.current) return;

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        
        // 使用 512 fftSize 获取 256 个频率区间。
        // 这提供了足够的细节用于细条，而不会过于密集。
        analyser.fftSize = 512; 
        
        // 连接源 -> 分析器 -> 目标
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (error) {
        console.error("Failed to initialize Audio Visualizer:", error);
      }
    };

    if (audioRef.current) {
        // 尝试初始化。注意：音频元素必须有 crossOrigin="anonymous"
        initAudio();
    }
  }, [audioRef]);

  // 处理播放/恢复
  useEffect(() => {
    if (isPlaying && audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [isPlaying]);

  // 绘制循环
  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    if (!ctx) return;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      // 响应式画布尺寸
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
      }

      const width = canvas.width;
      const height = canvas.height;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // --- 自定义可视化设置 ---
      // 条形宽度 (5px) 且有间隙 (2px)
      const BAR_WIDTH = 5;
      const GAP = 2;
      const BAR_UNIT = BAR_WIDTH + GAP;
      
      // 仅渲染前 70% 的频率区间，以移除空的高频范围
      const barsToRender = Math.floor(bufferLength * 0.70);
      
      const totalVisualizerWidth = barsToRender * BAR_UNIT;
      
      // 计算起始 X 坐标以居中可视化效果
      let x = (width - totalVisualizerWidth) / 2;

      // 获取当前自适应主题 RGB 色彩
      const [r, g, b] = themeRgbRef.current;

      for (let i = 0; i < barsToRender; i++) {
        // 缩放高度：从 0.6 降低到 0.4，以防止条形过高
        const value = dataArray[i];
        const barHeight = Math.max(2, (value / 255) * height * 0.4); 

        // 创建随封面色自适应的辉光渐变
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`); // 封面自适应高亮顶部
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.45)`); // 主体过渡
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`); // 底部柔和淡出

        ctx.fillStyle = gradient;
        
        // 绘制圆角条
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, BAR_WIDTH, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        x += BAR_UNIT;
      }
    };

    if (isPlaying) {
      draw();
    } else {
       // 暂停或停止时清除画布
       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
       ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  );
};

// 用 React.memo 隔离：currentTime 每帧 60fps 变化时，audioRef/isPlaying/themeRgb 未变就不重渲，
// 避免频谱组件每帧重新走 React 协调与画布挂载路径
export const AudioVisualizer = React.memo(AudioVisualizerBase);