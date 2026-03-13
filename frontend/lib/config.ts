import Constants from 'expo-constants';

function resolveHostFromExpo(): string {
  // For Expo Go / dev builds, this is usually "<ip>:<port>"
  const hostUri =
    // Newer Expo SDKs
    (Constants as any).expoConfig?.hostUri ??
    // Fallback for classic manifests
    (Constants.manifest as any)?.debuggerHost ??
    '';

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'undefined') {
      return host;
    }
  }

  // Web or unknown environment
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      return url.hostname;
    } catch {
      // ignore
    }
  }

  return 'localhost';
}

const BACKEND_PORT = 8000;
const detectedHost = resolveHostFromExpo();

export const API_BASE_URL = `http://${detectedHost}:${BACKEND_PORT}`;



