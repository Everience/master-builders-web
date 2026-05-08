import { environment } from '../environments/environments';

/**
 * OAuth redirect must hit a route that runs `handleRedirectObservable` before any
 * router redirect strips `code` / `state` query params (e.g. '' → home).
 */
export function msalRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/login`;
  }
  return environment.msal.redirectUri;
}

export function msalPostLogoutRedirectUri(): string {
  return `${msalRedirectUri()}/login`;
}
