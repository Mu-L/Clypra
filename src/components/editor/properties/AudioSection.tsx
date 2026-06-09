import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { Clip } from "@/types";

interface AudioSectionProps {
  selectedClip: Clip;
  handleUpdate: (key: string, value: any) => void;
}

export const AudioSection: React.FC<AudioSectionProps> = ({ selectedClip, handleUpdate }) => {
  const volume = selectedClip.volume ?? 1.0;
  const volumePercent = Math.round(volume * 100);
  const isMuted = volume === 0;

  const handleVolumeChange = (newVolume: number) => {
    // Clamp between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    handleUpdate("volume", clampedVolume);
  };

  const handleVolumePercentChange = (percent: number) => {
    handleVolumeChange(percent / 100);
  };

  const toggleMute = () => {
    handleVolumeChange(isMuted ? 1.0 : 0);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-primary">Volume</label>
          <span className="text-xs text-text-muted">{volumePercent}%</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className="flex items-center justify-center w-8 h-8 rounded hover:bg-surface-raised transition-colors" title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <VolumeX className="w-4 h-4 text-text-muted" /> : <Volume2 className="w-4 h-4 text-accent" />}
          </button>

          <input type="range" min="0" max="100" value={volumePercent} onChange={(e) => handleVolumePercentChange(Number(e.target.value))} className="flex-1 h-2 bg-surface-raised rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />

          <input type="number" min="0" max="100" value={volumePercent} onChange={(e) => handleVolumePercentChange(Number(e.target.value))} className="w-16 px-2 py-1 text-xs text-center bg-surface-raised border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <button onClick={() => handleVolumeChange(0)} className="hover:text-text-primary transition-colors">
            0%
          </button>
          <button onClick={() => handleVolumeChange(0.5)} className="hover:text-text-primary transition-colors">
            50%
          </button>
          <button onClick={() => handleVolumeChange(1.0)} className="hover:text-text-primary transition-colors">
            100%
          </button>
          <button onClick={() => handleVolumeChange(1.5)} className="hover:text-text-primary transition-colors">
            150%
          </button>
          <button onClick={() => handleVolumeChange(2.0)} className="hover:text-text-primary transition-colors">
            200%
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <p className="text-[10px] text-text-muted leading-relaxed">Adjust the volume level for this audio clip. Values above 100% will amplify the audio (may cause clipping).</p>
      </div>
    </div>
  );
};
