import { apiClient } from '@/lib/api/client';
import type { FilterRequest, FilterResponse, MapDataResponse } from '@/types/map-data';

export function fetchGeoJson() {
  return apiClient.get<GeoJSON.FeatureCollection>('/data/geojson');
}

export function fetchMapData() {
  return apiClient.get<MapDataResponse>('/data/map');
}

export function fetchFilteredCountries(filters: FilterRequest) {
  return apiClient.post<FilterResponse>('/data/filter', filters);
}
