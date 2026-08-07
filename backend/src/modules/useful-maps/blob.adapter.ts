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

  if (!isHostAllowed(parsedUrl.hostname, allowedBlobHosts)) {
    throw new Error('Blob host is not allowed');
  }

  // Reconstruct URL from validated parts only to prevent SSRF.
  // Hostname is validated against allowedBlobHosts, and protocol is verified as HTTPS.
  // The pathname/search come from Vercel Blob storage URLs, which are safe to fetch.
  // lgtm[js/request-forgery]
  const safeUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`;
  const response = await fetch(safeUrl, { method: 'HEAD' });
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
