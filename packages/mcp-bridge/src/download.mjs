import { lookup } from 'node:dns/promises';
import net from 'node:net';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
}

export async function validatePublicHttps(rawUrl, lookupImpl = lookup) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) throw new Error('File download_url must be a public HTTPS URL.');
  const addresses = await lookupImpl(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('File download_url cannot target a private or local address.');
  return url;
}

export async function downloadOpenAIFile(file, { fetchImpl = globalThis.fetch, lookupImpl = lookup } = {}) {
  let url = await validatePublicHttps(file.download_url, lookupImpl);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetchImpl(url, { redirect: 'manual', headers: { 'user-agent': 'MatFlow-Frontend/1.0' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 5) throw new Error('File download exceeded the redirect limit.');
      url = await validatePublicHttps(new URL(location, url).href, lookupImpl);
      continue;
    }
    if (!response.ok) throw new Error(`File download failed with HTTP ${response.status}.`);
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_FILE_BYTES) throw new Error('File exceeds the 25 MB MatFlow limit.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('File exceeds the 25 MB MatFlow limit.');
    return { bytes, name: file.file_name || file.file_id, type: file.mime_type || 'application/octet-stream' };
  }
  throw new Error('File download failed.');
}
