'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorldMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  getColor: (countryName: string) => string;
  getTooltip: (countryName: string) => string;
}

export default function WorldMap({
  geojson,
  getColor,
  getTooltip,
}: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [40, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      touchZoom: true,
      zoomControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        noWrap: true,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      },
    ).addTo(mapRef.current);

    mapRef.current.invalidateSize();

    const handleResize = () => {
      mapRef.current?.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update layer when geojson or callbacks change
  const getCountryName = useCallback((feature: GeoJSON.Feature) => {
    const props = feature.properties as Record<string, string> | null;
    return props?.ADMIN || props?.NAME || '';
  }, []);

  useEffect(() => {
    if (!mapRef.current || !geojson) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }

    layerRef.current = L.geoJSON(geojson, {
      style: (feature) => {
        if (!feature) return {};
        const name = getCountryName(feature);
        const color = getColor(name);
        const isGreyedOut = color === '#111827';
        return {
          fillColor: color,
          fillOpacity: isGreyedOut ? 0.3 : 0.7,
          color: '#444',
          weight: isGreyedOut ? 0.5 : 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = getCountryName(feature);
        layer.bindTooltip(() => getTooltip(name), {
          sticky: true,
          className: 'map-tooltip',
        });

        layer.on({
          mouseover: (e) => {
            const l = e.target as L.Path;
            l.setStyle({ weight: 2, color: '#fff', fillOpacity: 0.9 });
            l.bringToFront();
          },
          mouseout: (e) => {
            layerRef.current?.resetStyle(e.target);
          },
        });
      },
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(layerRef.current.getBounds(), {
      paddingTopLeft: [24, 120],
      paddingBottomRight: [24, 24],
    });
  }, [geojson, getColor, getTooltip, getCountryName]);

  return <div ref={containerRef} className='h-full w-full' />;
}
