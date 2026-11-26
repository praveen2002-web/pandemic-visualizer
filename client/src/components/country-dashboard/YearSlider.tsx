import React, { useEffect } from 'react';
import { Pause, Play } from 'lucide-react';

interface Props {
  years: number[]; // years with data, ascending
  year: number;
  accentColor: string;
  isPlaying: boolean;
  reducedMotion: boolean;
  onChange: (year: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

export const YearSlider: React.FC<Props> = ({
  years, year, accentColor, isPlaying, reducedMotion, onChange, onPlayingChange,
}) => {
  const index = Math.max(0, years.indexOf(year));
  const last = years.length - 1;

  useEffect(() => {
    if (!isPlaying) return;
    if (index >= last) {
      onPlayingChange(false);
      return;
    }
    const id = setTimeout(() => onChange(years[index + 1]), 1000);
    return () => clearTimeout(id);
  }, [isPlaying, index, last, years, onChange, onPlayingChange]);

  const play = () => {
    if (!isPlaying && index >= last) onChange(years[0]);
    onPlayingChange(!isPlaying);
  };

  const step = last <= 10 ? 2 : last <= 24 ? 3 : 4;
  // label every `step`th year, always the last, without crowding it
  const labels = years.filter((_, i) => i === last || (i % step === 0 && last - i >= step));

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor="dashboard-year" className="text-sm font-medium text-slate-300">Year: {year}</label>
        <button
          type="button"
          onClick={play}
          disabled={reducedMotion || years.length < 2}
          title={reducedMotion ? 'Auto-play is off because reduced motion is enabled' : undefined}
          className="flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <input
        id="dashboard-year"
        type="range"
        min={0}
        max={last}
        value={index}
        aria-valuetext={String(year)}
        onChange={e => {
          onPlayingChange(false);
          onChange(years[Number(e.target.value)]);
        }}
        className="w-full"
        style={{ accentColor }}
      />
      <div className="relative mt-1 h-4 text-xs text-slate-400" aria-hidden="true">
        {labels.map(label => {
          const position = last ? (years.indexOf(label) / last) * 100 : 0;
          return (
            <span key={label} className="absolute" style={{ left: `${position}%`, transform: `translateX(-${position}%)` }}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
