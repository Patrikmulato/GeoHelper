import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DataService } from './data.service.js';

const service = new DataService();

describe('DataService.getFilteredCountries', () => {
    it('returns many countries for all filters', () => {
        const res = service.getFilteredCountries({
            sideFilter: 'all',
            lineFilter: 'all',
            euPlateFilter: 'all',
            cameraGenFilter: 'all',
            coverageYearFilter: 'all',
            carColorFilter: 'all',
            vehicleTypeFilter: 'all',
        });

        assert.ok(res.countries.length > 50);
        assert.ok(res.countries.includes('Canada'));
    });

    it('applies driving side filter', () => {
        const res = service.getFilteredCountries({
            sideFilter: 'left',
            lineFilter: 'all',
            euPlateFilter: 'all',
            cameraGenFilter: 'all',
            coverageYearFilter: 'all',
            carColorFilter: 'all',
            vehicleTypeFilter: 'all',
        });

        assert.ok(res.countries.includes('Australia'));
        assert.ok(!res.countries.includes('Canada'));
    });

    it('applies EU plate and camera generation filters together', () => {
        const res = service.getFilteredCountries({
            sideFilter: 'all',
            lineFilter: 'all',
            euPlateFilter: 'yes',
            cameraGenFilter: '4',
            coverageYearFilter: 'all',
            carColorFilter: 'all',
            vehicleTypeFilter: 'all',
        });

        assert.ok(res.countries.includes('France'));
        assert.ok(!res.countries.includes('Brazil'));
    });

    it('applies vehicle and color filters', () => {
        const trucks = service.getFilteredCountries({
            sideFilter: 'all',
            lineFilter: 'all',
            euPlateFilter: 'all',
            cameraGenFilter: 'all',
            coverageYearFilter: 'all',
            carColorFilter: 'all',
            vehicleTypeFilter: 'truck',
        });

        assert.ok(trucks.countries.includes('Namibia'));
        assert.ok(!trucks.countries.includes('Japan'));

        const reds = service.getFilteredCountries({
            sideFilter: 'all',
            lineFilter: 'all',
            euPlateFilter: 'all',
            cameraGenFilter: 'all',
            coverageYearFilter: 'all',
            carColorFilter: 'red',
            vehicleTypeFilter: 'all',
        });

        assert.ok(reds.countries.includes('Belgium'));
        assert.ok(!reds.countries.includes('Canada'));
    });
});
