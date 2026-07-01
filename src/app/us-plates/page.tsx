'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { US_PLATES, PLATES_IMAGE_BASE } from '@/data/us-plates';
import type { USPlate } from '@/data/us-plates';
import { filterPlates, getHighlightedStates } from './filter';

const USMap = dynamic(() => import('@/components/USMap'), { ssr: false });

const COLORS = ['all', 'white', 'blue', 'green', 'yellow', 'red'] as const;
type ColorFilter = (typeof COLORS)[number];

export default function USPlatesPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  const filteredPlates = useMemo<USPlate[]>(
    () => filterPlates(US_PLATES, colorFilter, selectedState),
    [colorFilter, selectedState]
  );

  const highlightedStates = useMemo<Set<string>>(
    () => getHighlightedStates(US_PLATES, colorFilter),
    [colorFilter]
  );

  function handleStateClick(state: string) {
    setSelectedState((prev) => (prev === state ? null : state));
  }

  function handlePlateClick(plate: USPlate) {
    setSelectedState((prev) => (prev === plate.state ? null : plate.state));
  }

  const stateLabel = selectedState
    ? `${selectedState} · ${filteredPlates.length} plate${filteredPlates.length !== 1 ? 's' : ''}`
    : `All states · ${filteredPlates.length} plates`;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-zinc-800 bg-[#1e2530]">
        <div className="border-b border-zinc-800 p-3">
          <h1 className="mb-2 text-sm font-bold text-white">US License Plates</h1>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setColorFilter(color)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  colorFilter === color
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a3340] text-slate-400 hover:text-slate-200'
                }`}
              >
                {color === 'all' ? 'All' : color.charAt(0).toUpperCase() + color.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
          {stateLabel}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {filteredPlates.map((plate) => (
              <button
                key={plate.file}
                onClick={() => handlePlateClick(plate)}
                title={`${plate.state} — ${plate.label}`}
                className={`aspect-video overflow-hidden rounded transition-all ${
                  plate.state === selectedState
                    ? 'ring-2 ring-blue-500'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={`${PLATES_IMAGE_BASE}${plate.file}`}
                  alt={plate.label}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          {filteredPlates.length === 0 && (
            <p className="mt-8 text-center text-xs text-zinc-600">No plates match</p>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1">
        <USMap
          selectedState={selectedState}
          highlightedStates={highlightedStates}
          onStateClick={handleStateClick}
        />
      </div>
    </div>
  );
}
