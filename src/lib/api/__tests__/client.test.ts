// src/lib/api/__tests__/client.test.ts
import { ApiClient, ApiError } from '@/lib/api/client';

const BASE = 'http://localhost:3001';

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    // Create a fresh client for each test with a predictable base URL
    apiClient = new ApiClient(BASE);
  });

  it('builds URL with query params', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true, data: {} }),
    });

    await apiClient.get('/data/geojson', { params: { foo: 'bar' } });

    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/data/geojson?foo=bar`, expect.any(Object));
  });

  it('builds URL without trailing ? when no params provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true, data: {} }),
    });

    await apiClient.get('/data/geojson');

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${BASE}/data/geojson`);
    expect(calledUrl).not.toContain('?');
  });

  it('throws ApiError with correct status and message on non-2xx response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValueOnce({ message: 'Resource not found' }),
    });

    await expect(apiClient.get('/data/missing')).rejects.toBeInstanceOf(ApiError);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValueOnce({ message: 'Resource not found' }),
    });
    await expect(apiClient.get('/data/missing')).rejects.toMatchObject({
      status: 404,
      message: 'Resource not found',
    });
  });

  it('falls back to statusText when error response body is not valid JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockRejectedValueOnce(new Error('invalid json')),
    });

    await expect(apiClient.get('/data/broken')).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error',
    });
  });

  it('sends POST with JSON-serialized body and Content-Type header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true, data: { countries: [] } }),
    });

    const body = { sideFilter: 'all' };
    await apiClient.post('/data/filter', body);

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/data/filter`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
