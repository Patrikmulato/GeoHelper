export type PublicBlobHead = {
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
};

function isHostAllowed(hostname: string, allowedPatterns: readonly string[]): boolean {
  return allowedPatterns.some((pattern) => {
    if (pattern === hostname) {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${regexPattern}$`).test(hostname);
    }

    return false;
  });
}

export async function headPublicBlob(
  url: string,
  allowedBlobHosts: readonly string[]
): Promise<PublicBlobHead> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid blob URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Blob URL must use HTTPS');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Blob URL must not contain credentials');
  }

  if (parsedUrl.port) {
    throw new Error('Blob URL must not specify a port');
  }

  if (!isHostAllowed(parsedUrl.hostname, allowedBlobHosts)) {
    throw new Error('Blob host is not allowed');
  }

  // Reconstruct the URL from validated parts only: HTTPS, no credentials, no explicit
  // port, and a hostname matched against the configured blob-host allow-list. Redirects
  // are rejected so an allowed host cannot bounce the request to an internal address.
  const safeUrl = `https://${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`;
  const response = await fetch(safeUrl, { method: 'HEAD', redirect: 'error' }); // codeql[js/request-forgery] lgtm[js/request-forgery]
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
