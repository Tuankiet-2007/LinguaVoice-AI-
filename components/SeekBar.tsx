import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const SeekBar: React.FC<SeekBarProps> = ({ 
  currentTime, 
  duration, 
  onSeek,
  onSeekStart,
  onSeekEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [dragTime, setDragTime] = useState<number>(0);

  // Calculate percentage for the progress bar
  const activeTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const calculateTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current || duration === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (offsetX / rect.width) * duration;
  }, [duration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newTime = calculateTimeFromEvent(e);
    setDragTime(newTime);
    if (onSeekStart) onSeekStart();
    
    // Immediate visual update handled by dragTime state
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newTime = calculateTimeFromEvent(e);
      setDragTime(newTime);
    }
  }, [isDragging, calculateTimeFromEvent]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      const newTime = calculateTimeFromEvent(e);
      onSeek(newTime); // Commit the seek
      if (onSeekEnd) onSeekEnd();
    }
  }, [isDragging, calculateTimeFromEvent, onSeek, onSeekEnd]);

  // Global event listeners for drag/drop outside the component
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Hover effect handling
  const handleHoverMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverPos(offsetX);
    setHoverTime((offsetX / rect.width) * duration);
  };

  const handleHoverLeave = () => {
    setHoverTime(null);
    setHoverPos(null);
  };

  return (
    <div 
      className="relative w-full h-8 flex items-center cursor-pointer group select-none touch-none"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleHoverMove}
      onMouseLeave={handleHoverLeave}
    >
      {/* Hitbox area (larger than visible bar) */}
      <div className="absolute inset-0 z-10" />

      {/* Background Track */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden pointer-events-none">
        {/* Progress Fill */}
        <div 
          className="h-full bg-brand-500 will-change-[width]"
          style={{ 
            width: `${progressPercent}%`,
            transition: isDragging ? 'none' : 'width 0.1s linear'
          }}
        />
      </div>

      {/* Playhead */}
      <div 
        className="absolute h-4 w-4 bg-white border-2 border-brand-600 rounded-full shadow-md z-20 pointer-events-none transform -translate-x-1/2 transition-transform duration-100 ease-out group-hover:scale-125"
        style={{ 
          left: `${progressPercent}%`,
          transition: isDragging ? 'none' : 'left 0.1s linear'
        }}
      />

      {/* Hover Tooltip */}
      {hoverTime !== null && hoverPos !== null && (
        <div 
          className="absolute -top-8 bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg transform -translate-x-1/2 pointer-events-none z-30 whitespace-nowrap"
          style={{ left: hoverPos }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
};