import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../page';
import * as mapData from '@/lib/api/map-data';

// Mock the API functions
jest.mock('@/lib/api/map-data', () => ({
  fetchFilteredCountries: jest.fn(),
  fetchGeoJson: jest.fn(),
  fetchMapData: jest.fn(),
}));

describe('Home', () => {
  beforeEach(() => {
    // Mock successful API responses
    const mockFetchGeoJson = mapData.fetchGeoJson as jest.Mock;
    mockFetchGeoJson.mockResolvedValue({
      type: 'FeatureCollection',
      features: [],
    });

    const mockFetchMapData = mapData.fetchMapData as jest.Mock;
    mockFetchMapData.mockResolvedValue({
      aliases: {},
      geoguessrCountries: [],
      drivingSideData: {},
      roadLinesData: {},
      linePatternLabels: {},
      linePatternColors: {},
      euPlateData: {},
      cameraGenData: {},
      coverageYearsData: {},
      carColorData: {},
      vehicleTypeData: {},
      tooltipHtmlByCountry: {},
    });

    const mockFetchFilteredCountries = mapData.fetchFilteredCountries as jest.Mock;
    mockFetchFilteredCountries.mockResolvedValue({ countries: [] });
  });

  it('renders the main page without crashing', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('shows loading state initially', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
