import React, { useRef, useEffect, useState } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  pauseDuration?: number; // ms to pause at initial position
  gap?: number; // pixel gap between repeated texts
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  speed = 30,
  pauseDuration = 2000,
  gap = 48,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const [cycleDistance, setCycleDistance] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && measureRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = measureRef.current.scrollWidth;
        if (textWidth > containerWidth + 2) {
          setIsOverflowing(true);
          setCycleDistance(textWidth + gap);
        } else {
          setIsOverflowing(false);
          setCycleDistance(0);
        }
        setOffset(0);
      }
    };

    checkOverflow();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', checkOverflow);
      return () => window.removeEventListener('resize', checkOverflow);
    }
  }, [text, gap]);

  useEffect(() => {
    if (!isOverflowing || cycleDistance <= 0) {
      setOffset(0);
      return;
    }

    let isCancelled = false;
    let timerId: NodeJS.Timeout;
    let animId: number;

    const scrollDuration = (cycleDistance / speed) * 1000;

    const runCycle = () => {
      if (isCancelled) return;
      // 从起始点(偏移 0)开始，并停留一段时间以便清晰阅读开头
      setOffset(0);

      timerId = setTimeout(() => {
        if (isCancelled) return;
        const startTime = performance.now();

        const step = (now: number) => {
          if (isCancelled) return;
          const elapsed = now - startTime;
          const progress = elapsed / scrollDuration;

          if (progress < 1) {
            // 始终向左单向平滑位移
            setOffset(progress * cycleDistance);
            animId = requestAnimationFrame(step);
          } else {
            // 当完整位移了一个循环距离(文本长度 + 间隔)后，
            // 尾随跟进的第二份文字恰好完美对应到初始像素位置。
            // 此时无缝重置 offset 为 0，方向始终向左无回弹跳跃，开始下一轮循环。
            setOffset(0);
            runCycle();
          }
        };

        animId = requestAnimationFrame(step);
      }, pauseDuration);
    };

    runCycle();

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      cancelAnimationFrame(animId);
    };
  }, [isOverflowing, cycleDistance, speed, pauseDuration, text]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
        <span ref={measureRef} className="inline-block whitespace-nowrap">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative whitespace-nowrap select-none ${className}`}
    >
      <div
        className="inline-flex items-center whitespace-nowrap will-change-transform"
        style={{
          transform: `translateX(-${offset}px)`,
        }}
      >
        <span ref={measureRef} className="inline-block whitespace-nowrap">
          {text}
        </span>
        <span className="inline-block shrink-0" style={{ width: gap }} />
        <span className="inline-block whitespace-nowrap">
          {text}
        </span>
        <span className="inline-block shrink-0" style={{ width: gap }} />
      </div>
    </div>
  );
};
