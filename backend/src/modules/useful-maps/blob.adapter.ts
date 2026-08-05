export type PublicBlobHead = {
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
};

export async function headPublicBlob(url: string): Promise<PublicBlobHead> {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`Blob HEAD request failed with status ${response.status}`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const parsedLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;

  return {
    contentType: response.headers.get('content-type'),
    contentLength: Number.isFinite(parsedLength) ? parsedLength : null,
    etag: response.headers.get('etag'),
  };
}
