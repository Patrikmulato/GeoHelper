'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import FilterDropdown from '@/components/FilterDropdown';
import { fetchFilteredCountries, fetchGeoJson, fetchMapData } from '@/lib/api/map-data';
import type { CarColor, MapDataResponse, RoadLinePattern, VehicleType } from '@/types/map-data';

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false });

const GREY_OUT = '#111827';
const NO_DATA = '#1f2937';

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Home() {
  const [sideFilter, setSideFilter] = useState<'all' | 'left' | 'right'>('all');
  const [lineFilter, setLineFilter] = useState<RoadLinePattern | 'all'>('all');
  const [euPlateFilter, setEuPlateFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [cameraGenFilter, setCameraGenFilter] = useState<'all' | string>('all');
  const [coverageYearFilter, setCoverageYearFilter] = useState<string>('all');
  const [carColorFilter, setCarColorFilter] = useState<'all' | CarColor>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | VehicleType>('all');
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [filteredCountries, setFilteredCountries] = useState<string[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setIsInitialLoading(true);
      setInitialError(null);
      try {
        const [geoJsonData, serverMapData] = await Promise.all([fetchGeoJson(), fetchMapData()]);
        if (!active) return;
        setGeojson(geoJsonData);
        setMapData(serverMapData);
      } catch {
        if (!active) return;
        setInitialError('Failed to load map data from backend API.');
      } finally {
        if (!active) return;
        setIsInitialLoading(false);
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapData) return;

    let active = true;

    async function loadFilteredCountries() {
      setIsFilterLoading(true);
      setFilterError(null);
      try {
        const res = await fetchFilteredCountries({
          sideFilter,
          lineFilter,
          euPlateFilter,
          cameraGenFilter,
          coverageYearFilter,
          carColorFilter,
          vehicleTypeFilter,
        });
        if (!active) return;
        setFilteredCountries(res.countries);
      } catch {
        if (!active) return;
        setFilterError('Failed to apply filters from backend.');
      } finally {
        if (!active) return;
        setIsFilterLoading(false);
      }
    }

    loadFilteredCountries();

    return () => {
      active = false;
    };
  }, [
    mapData,
    sideFilter,
    lineFilter,
    euPlateFilter,
    cameraGenFilter,
    coverageYearFilter,
    carColorFilter,
    vehicleTypeFilter,
  ]);

  const allLinePatterns = useMemo(() => {
    if (!mapData) return [] as RoadLinePattern[];
    return Object.keys(mapData.linePatternLabels) as RoadLinePattern[];
  }, [mapData]);

  const linePatternGroups = useMemo(() => {
    if (!mapData) return [] as { label: string; patterns: RoadLinePattern[] }[];

    const grouped = new Map<string, RoadLinePattern[]>();
    allLinePatterns.forEach((pattern) => {
      const [outside = 'other'] = pattern.split('-');
      const existing = grouped.get(outside) ?? [];
      grouped.set(outside, [...existing, pattern]);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([outside, patterns]) => ({
        label: `Outside: ${toTitleCase(outside)}`,
        patterns: [...patterns].sort((a, b) =>
          (mapData.linePatternLabels[a] ?? a).localeCompare(mapData.linePatternLabels[b] ?? b)
        ),
      }));
  }, [allLinePatterns, mapData]);

  const allCarColors = useMemo(() => {
    if (!mapData) return [] as CarColor[];
    const colors = new Set<CarColor>();
    Object.values(mapData.carColorData).forEach((countryColors) => {
      countryColors.forEach((c) => colors.add(c));
    });
    // white is default fallback color even if omitted from country-specific map
    colors.add('white');
    return Array.from(colors).sort((a, b) => a.localeCompare(b));
  }, [mapData]);

  const allVehicleTypes = useMemo(() => {
    if (!mapData) return [] as VehicleType[];
    const vehicleTypes = new Set<VehicleType>(['car']);
    Object.values(mapData.vehicleTypeData).forEach((v) => vehicleTypes.add(v));
    return Array.from(vehicleTypes).sort((a, b) => a.localeCompare(b));
  }, [mapData]);

  const allCoverageYears = useMemo(() => {
    if (!mapData) return [] as number[];
    const years = new Set<number>();
    Object.values(mapData.coverageYearsData).forEach((countryYears) => {
      countryYears.forEach((y) => years.add(y));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [mapData]);

  const allCameraGens = useMemo(() => {
    if (!mapData) return [] as string[];
    const gens = new Set<string>();
    Object.values(mapData.cameraGenData).forEach((countryGens) => {
      countryGens.forEach((g) => gens.add(String(g)));
    });
    return Array.from(gens).sort((a, b) => Number(a) - Number(b));
  }, [mapData]);

  const geoguessrSet = useMemo(() => new Set(mapData?.geoguessrCountries ?? []), [mapData]);

  const filteredSet = useMemo(() => new Set(filteredCountries ?? []), [filteredCountries]);

  const getColor = useCallback(
    (geoName: string) => {
      if (!mapData) return NO_DATA;

      const name = mapData.aliases[geoName] ?? geoName;
      if (!geoguessrSet.has(name)) return GREY_OUT;
      if (!filteredSet.has(name)) return NO_DATA;

      // Color priority: specific line filter > driving side filter > default
      if (lineFilter !== 'all') return mapData.linePatternColors[lineFilter];

      if (sideFilter !== 'all') {
        return sideFilter === 'left' ? '#3b82f6' : '#ef4444';
      }

      // Default: color by driving side
      const side = mapData.drivingSideData[name];
      if (!side) return NO_DATA;
      return side === 'left' ? '#3b82f6' : '#ef4444';
    },
    [mapData, geoguessrSet, filteredSet, lineFilter, sideFilter]
  );

  const getTooltip = useCallback(
    (geoName: string) => {
      if (!mapData) return geoName;

      const name = mapData.aliases[geoName] ?? geoName;
      if (!geoguessrSet.has(name)) return `${name}: Not in GeoGuessr`;

      return mapData.tooltipHtmlByCountry[name] ?? `<strong>${name}</strong>`;
    },
    [mapData, geoguessrSet]
  );

  const hasActiveFilters =
    sideFilter !== 'all' ||
    lineFilter !== 'all' ||
    euPlateFilter !== 'all' ||
    cameraGenFilter !== 'all' ||
    coverageYearFilter !== 'all' ||
    carColorFilter !== 'all' ||
    vehicleTypeFilter !== 'all';

  const resetFilters = useCallback(() => {
    setSideFilter('all');
    setLineFilter('all');
    setEuPlateFilter('all');
    setCameraGenFilter('all');
    setCoverageYearFilter('all');
    setCarColorFilter('all');
    setVehicleTypeFilter('all');
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#262b31] text-white">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/94 px-5 py-4 shadow-lg">
        <h1 className="text-lg font-bold text-white">GeoGuessr Helper</h1>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative z-[2000] hidden w-auto shrink-0 border-r border-zinc-800 bg-zinc-900/94 xl:flex xl:flex-col">
          <div
            className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Driving Side
              </p>
              {isFilterLoading && (
                <p className="mb-2 text-[11px] text-zinc-500">Applying filters…</p>
              )}
              {filterError && <p className="mb-2 text-[11px] text-red-400">{filterError}</p>}
              <FilterDropdown
                value={sideFilter}
                onChange={setSideFilter}
                placeholder="Driving Side: All"
                openDirection="right"
                options={[
                  { value: 'all', label: 'Driving Side: All' },
                  { value: 'left', label: 'Driving Side: Left' },
                  { value: 'right', label: 'Driving Side: Right' },
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Road Lines
              </p>
              <FilterDropdown
                value={lineFilter}
                onChange={(v) => setLineFilter(v as RoadLinePattern | 'all')}
                placeholder="Road Lines: All"
                openDirection="right"
                groups={[
                  {
                    label: '',
                    options: [{ value: 'all', label: 'Road Lines: All' }],
                  },
                  ...linePatternGroups.map((g) => ({
                    label: g.label,
                    options: g.patterns.map((p) => ({
                      value: p,
                      label: mapData?.linePatternLabels[p] ?? p,
                    })),
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                EU Plate
              </p>
              <FilterDropdown
                value={euPlateFilter}
                onChange={(v) => setEuPlateFilter(v as typeof euPlateFilter)}
                placeholder="EU Plate: All"
                openDirection="right"
                options={[
                  { value: 'all', label: 'EU Plate: All' },
                  { value: 'yes', label: 'Yes — EU blue strip' },
                  { value: 'no', label: 'No — non-EU plate' },
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Camera Generation
              </p>
              <FilterDropdown
                value={cameraGenFilter}
                onChange={(v) => setCameraGenFilter(v as typeof cameraGenFilter)}
                placeholder="Camera Gen: All"
                openDirection="right"
                options={[
                  { value: 'all', label: 'Camera Gen: All' },
                  ...allCameraGens.map((gen) => ({
                    value: gen,
                    label: `Gen ${gen}`,
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Coverage Year
              </p>
              <FilterDropdown
                value={coverageYearFilter}
                onChange={setCoverageYearFilter}
                placeholder="Coverage: Any year"
                openDirection="right"
                options={[
                  { value: 'all', label: 'Coverage: Any year' },
                  ...allCoverageYears.map((y) => ({
                    value: String(y),
                    label: String(y),
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Car Color
              </p>
              <FilterDropdown
                value={carColorFilter}
                onChange={(v) => setCarColorFilter(v as typeof carColorFilter)}
                placeholder="Car Color: All"
                openDirection="right"
                options={[
                  { value: 'all', label: 'Car Color: All' },
                  ...allCarColors.map((color) => ({
                    value: color,
                    label: toTitleCase(color),
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Vehicle Type
              </p>
              <FilterDropdown
                value={vehicleTypeFilter}
                onChange={(v) => setVehicleTypeFilter(v as typeof vehicleTypeFilter)}
                placeholder="Vehicle: All"
                openDirection="right"
                options={[
                  { value: 'all', label: 'Vehicle: All' },
                  ...allVehicleTypes.map((type) => ({
                    value: type,
                    label: type === 'truck' ? 'Truck / Pickup' : toTitleCase(type),
                  })),
                ]}
              />
            </div>
          </div>

          <div className="border-t border-zinc-800 px-3 py-3">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="w-full rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 shadow-[0_0_0_1px_rgba(239,68,68,0.08)] transition-colors hover:bg-red-500/20 hover:text-red-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500 disabled:shadow-none"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 bg-[#262b31]">
          <div className="h-full w-full">
            {initialError ? (
              <div className="flex h-full items-center justify-center text-red-400">
                {initialError}
              </div>
            ) : geojson && mapData && filteredCountries ? (
              <WorldMap geojson={geojson} getColor={getColor} getTooltip={getTooltip} />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                {isInitialLoading ? 'Loading map…' : 'Waiting for data…'}
              </div>
            )}
          </div>
        </main>

        <aside className="hidden">
          <div>
            <p className="mb-1.5 font-semibold text-zinc-300">Driving Side</p>
            <div className="flex flex-col gap-1">
              {(sideFilter === 'all' ? (['right', 'left'] as const) : [sideFilter]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ background: s === 'left' ? '#3b82f6' : '#ef4444' }}
                  />
                  {s === 'left' ? 'Left' : 'Right'}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 font-semibold text-zinc-300">Road Lines</p>
            <div className="flex flex-col gap-1">
              {(lineFilter === 'all' ? allLinePatterns : [lineFilter]).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{
                      background: mapData?.linePatternColors[key] ?? NO_DATA,
                    }}
                  />
                  <span className="whitespace-nowrap">
                    {mapData?.linePatternLabels[key] ?? key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-zinc-700 pt-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded" style={{ background: NO_DATA }} />
              No data
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded" style={{ background: GREY_OUT }} />
              Not in game
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
