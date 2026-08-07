export type PublicBlobHead = {
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
};

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  const labels = hostname.split('.');
  return labels.every((label) => {
    if (!label || label.length > 63) {
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
    return true;
  });
}

function isHostAllowed(hostname: string, allowedPatterns: readonly string[]): boolean {
  const normalizedHost = normalizeHostname(hostname);
  if (!isValidHostname(normalizedHost)) {
    return false;
  }

  return allowedPatterns.some((rawPattern) => {
    const pattern = normalizeHostname(rawPattern);

    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      return normalizedHost.length > suffix.length && normalizedHost.endsWith(`.${suffix}`);
    }

    return pattern === normalizedHost;
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

  const normalizedHostname = normalizeHostname(parsedUrl.hostname);
  if (!isHostAllowed(normalizedHostname, allowedBlobHosts)) {
    throw new Error('Blob host is not allowed');
  }

  // Reconstruct the URL from validated parts only: HTTPS, no credentials, no explicit
  // port, and a canonical hostname matched against the configured blob-host allow-list.
  // Redirects are rejected so an allowed host cannot bounce the request to an internal address.
  const safeUrl = new URL(parsedUrl.pathname + parsedUrl.search, `https://${normalizedHostname}`);
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
