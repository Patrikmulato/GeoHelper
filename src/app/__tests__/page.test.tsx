// src/app/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from '../page';
import * as mapData from '@/lib/api/map-data';

jest.mock('@/lib/api/map-data', () => ({
  fetchFilteredCountries: jest.fn(),
  fetchGeoJson: jest.fn(),
  fetchMapData: jest.fn(),
}));

// WorldMap uses Leaflet which cannot run in jsdom
jest.mock('@/components/WorldMap', () => ({
  __esModule: true,
  default: () => <div data-testid="world-map" />,
}));

const MOCK_MAP_DATA = {
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
};

const MOCK_GEOJSON = { type: 'FeatureCollection' as const, features: [] };

describe('Home', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (mapData.fetchGeoJson as jest.Mock).mockResolvedValue(MOCK_GEOJSON);
    (mapData.fetchMapData as jest.Mock).mockResolvedValue(MOCK_MAP_DATA);
    (mapData.fetchFilteredCountries as jest.Mock).mockResolvedValue({ countries: [] });
  });

  it('calls fetchGeoJson and fetchMapData exactly once on mount', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(mapData.fetchGeoJson).toHaveBeenCalledTimes(1);
      expect(mapData.fetchMapData).toHaveBeenCalledTimes(1);
    });
  });

  it('calls fetchFilteredCountries with updated filter when a filter changes', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Wait for initial data load + first filter call
    await waitFor(() => {
      expect(mapData.fetchFilteredCountries).toHaveBeenCalledTimes(1);
    });

    jest.clearAllMocks();
    (mapData.fetchFilteredCountries as jest.Mock).mockResolvedValue({ countries: [] });

    // Click the "Driving Side: All" trigger to open the dropdown
    await user.click(screen.getByRole('button', { name: /Driving Side: All/i }));

    // Click the "Driving Side: Left" option
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Driving Side: Left/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Driving Side: Left/i }));

    await waitFor(() => {
      expect(mapData.fetchFilteredCountries).toHaveBeenCalledWith(
        expect.objectContaining({ sideFilter: 'left' })
      );
    });
  });

  it('renders an error message when fetchMapData fails', async () => {
    (mapData.fetchMapData as jest.Mock).mockRejectedValue(new Error('backend down'));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load map data from backend API.')).toBeInTheDocument();
    });
  });

  it('renders an error message when fetchGeoJson fails', async () => {
    (mapData.fetchGeoJson as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load map data from backend API.')).toBeInTheDocument();
    });
  });

  it('does not crash when fetchFilteredCountries returns a non-empty countries array', async () => {
    (mapData.fetchFilteredCountries as jest.Mock).mockResolvedValue({
      countries: ['Australia', 'Canada', 'France'],
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('world-map')).toBeInTheDocument();
    });
  });
});
