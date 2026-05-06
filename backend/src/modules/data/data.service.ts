import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoJsonNameAliases } from '../../data/country-aliases.js';
import { drivingSideData } from '../../data/driving-side.js';
import { geoguessrCountries } from '../../data/geoguessr-countries.js';
import { linePatternColors, linePatternLabels, roadLinesData } from '../../data/road-lines.js';
import {
    euPlateData,
    cameraGenData,
    coverageYearsData,
    carColorData,
    vehicleTypeData,
} from '../../data/geo-car-helpdesk.js';
import { FilterRequestDto } from './dto/filter-request.dto.js';

type FilterResponse = { countries: string[] };

const FILTER_CACHE_MAX_ENTRIES = 300;

@Injectable()
export class DataService {
    private readonly filterCache = new Map<string, FilterResponse>();

    private getFilterCacheKey(filters: FilterRequestDto): string {
        return [
            filters.sideFilter,
            filters.lineFilter,
            filters.euPlateFilter,
            filters.cameraGenFilter,
            filters.coverageYearFilter,
            filters.carColorFilter,
            filters.vehicleTypeFilter,
        ].join('|');
    }

    private buildTooltip(country: string): string {
        const parts: string[] = [`<strong>${country}</strong>`];

        const side = drivingSideData[country];
        parts.push(side ? `Driving: ${side}` : 'Driving: No data');

        const patterns = roadLinesData[country];
        if (patterns && patterns.length > 0) {
            parts.push(...patterns.map((p) => linePatternLabels[p]));
        } else {
            parts.push('Lines: No data');
        }

        const euPlate = euPlateData[country];
        parts.push(
            typeof euPlate !== 'boolean'
                ? 'EU plate: No data'
                : euPlate
                    ? 'EU plate: Yes'
                    : 'EU plate: No',
        );

        const gens = cameraGenData[country] ?? [];
        parts.push(gens.length > 0 ? `Camera: Gen ${gens.join(', ')}` : 'Camera: No data');

        const colors = carColorData[country] ?? ['white'];
        parts.push(`Car color: ${colors.join(', ')}`);

        const vehicle = vehicleTypeData[country] ?? 'car';
        if (vehicle !== 'car') parts.push(`Vehicle: ${vehicle}`);

        return parts.join('<br/>');
    }

    private setFilterCache(key: string, value: FilterResponse) {
        // Simple FIFO eviction is enough for this small query space.
        if (this.filterCache.size >= FILTER_CACHE_MAX_ENTRIES) {
            const firstKey = this.filterCache.keys().next().value;
            if (firstKey) {
                this.filterCache.delete(firstKey);
            }
        }
        this.filterCache.set(key, value);
    }

    getGeoJson() {
        // Support running from either workspace root or backend directory.
        const candidates = [
            join(process.cwd(), 'public', 'countries.geo.json'),
            join(process.cwd(), '../public', 'countries.geo.json'),
        ];

        const sourcePath = candidates.find((path) => existsSync(path));
        if (!sourcePath) {
            throw new Error('countries.geo.json not found');
        }

        return JSON.parse(readFileSync(sourcePath, 'utf-8'));
    }

    getMapData() {
        const tooltipHtmlByCountry = Object.fromEntries(
            Array.from(geoguessrCountries).map((country) => [country, this.buildTooltip(country)]),
        );

        return {
            aliases: geoJsonNameAliases,
            geoguessrCountries: Array.from(geoguessrCountries),
            drivingSideData,
            roadLinesData,
            linePatternLabels,
            linePatternColors,
            euPlateData,
            cameraGenData,
            coverageYearsData,
            carColorData,
            vehicleTypeData,
            tooltipHtmlByCountry,
        };
    }

    getFilteredCountries(filters: FilterRequestDto) {
        const cacheKey = this.getFilterCacheKey(filters);
        const cached = this.filterCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const matches: string[] = [];

        for (const country of geoguessrCountries) {
            const passesSide =
                filters.sideFilter === 'all' || drivingSideData[country] === filters.sideFilter;

            const passesLines = (() => {
                if (filters.lineFilter === 'all') return true;
                const patterns = roadLinesData[country];
                if (!patterns || patterns.length === 0) return false;
                return patterns.includes(filters.lineFilter as keyof typeof linePatternLabels);
            })();

            const passesEuPlate = (() => {
                if (filters.euPlateFilter === 'all') return true;
                const val = euPlateData[country];
                if (typeof val !== 'boolean') return false;
                return filters.euPlateFilter === 'yes' ? val : !val;
            })();

            const passesCameraGen = (() => {
                if (filters.cameraGenFilter === 'all') return true;
                const gens = cameraGenData[country] ?? [];
                return gens.includes(Number(filters.cameraGenFilter) as 1 | 2 | 3 | 4);
            })();

            const passesCoverage = (() => {
                if (filters.coverageYearFilter === 'all') return true;
                const years = coverageYearsData[country] ?? [];
                return years.includes(Number(filters.coverageYearFilter));
            })();

            const passesCarColor = (() => {
                if (filters.carColorFilter === 'all') return true;
                const colors = carColorData[country] ?? ['white'];
                return colors.includes(filters.carColorFilter);
            })();

            const passesVehicleType = (() => {
                if (filters.vehicleTypeFilter === 'all') return true;
                const vehicle = vehicleTypeData[country] ?? 'car';
                return vehicle === filters.vehicleTypeFilter;
            })();

            if (
                passesSide &&
                passesLines &&
                passesEuPlate &&
                passesCameraGen &&
                passesCoverage &&
                passesCarColor &&
                passesVehicleType
            ) {
                matches.push(country);
            }
        }

        const response = { countries: matches };
        this.setFilterCache(cacheKey, response);
        return response;
    }
}
