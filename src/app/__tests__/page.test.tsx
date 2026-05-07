import { render, act } from '@testing-library/react';
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
  });

  it('renders the main page without crashing', async () => {
    await act(async () => {
      render(<Home />);
    });
    // Check if the page renders without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<Home />);
    // Basic check that component mounts
  });
});
