import React from 'react';
import { SubtitleSegment } from '../types';

interface SubtitleDisplayProps {
  segments: SubtitleSegment[];
  currentTime: number;
  targetRef?: React.RefObject<HTMLDivElement>;
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ segments, currentTime }) => {
  // Find current active segment
  const activeIndex = segments.findIndex(
    seg => currentTime >= seg.startTime && currentTime < seg.endTime
  );

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-64">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Subtitles</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative scroll-smooth">
        {segments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 italic">
            Subtitles will appear here after generation...
          </div>
        ) : (
          segments.map((seg, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div 
                key={seg.id}
                id={`subtitle-${idx}`}
                className={`transition-all duration-300 transform ${
                  isActive 
                    ? 'opacity-100 scale-105 bg-brand-50 p-4 rounded-lg border-l-4 border-brand-500' 
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <p className={`text-lg font-medium leading-relaxed ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                  {seg.original}
                </p>
                <p className={`mt-1 text-base ${isActive ? 'text-brand-600' : 'text-gray-500'}`}>
                  {seg.translated}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};