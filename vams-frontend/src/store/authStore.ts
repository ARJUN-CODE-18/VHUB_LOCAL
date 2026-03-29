import { useSyncExternalStore } from 'react';

export type AuthToken = {
  access_token: string;
  token_type: string;
  userid: string;
};

const AUTH_STORAGE_KEY = 'vams.auth.session';
const LEGACY_AUTH_STORAGE_KEYS = ['auth'] as const;

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  tokenType: string | null;
  userid: string | null;
};

type AuthSubscriber = () => void;

let authState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  tokenType: null,
  userid: null,
};

const subscribers = new Set<AuthSubscriber>();

function emptyAuthState(): AuthState {
  return {
    isAuthenticated: false,
    accessToken: null,
    tokenType: null,
    userid: null,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidAuthToken(auth: Partial<AuthToken> | null | undefined): auth is AuthToken {
  if (!auth) {
    return false;
  }

  if (!isNonEmptyString(auth.access_token) || !isNonEmptyString(auth.userid)) {
    return false;
  }

  if (!isNonEmptyString(auth.token_type)) {
    return false;
  }

  return auth.token_type.toLowerCase() === 'bearer';
}

function getStoredAuthRecord(): { key: string; raw: string } | null {
  const primaryRaw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (primaryRaw) {
    return { key: AUTH_STORAGE_KEY, raw: primaryRaw };
  }

  for (const legacyKey of LEGACY_AUTH_STORAGE_KEYS) {
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      return { key: legacyKey, raw: legacyRaw };
    }
  }

  return null;
}

function removeAllAuthStorageKeys(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  for (const legacyKey of LEGACY_AUTH_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
  }
}

function migrateLegacyAuthStorageIfNeeded(sourceKey: string, payload: AuthToken): void {
  if (sourceKey === AUTH_STORAGE_KEY) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  localStorage.removeItem(sourceKey);
}

function readPersistedAuthState(): AuthState {
  const storedRecord = getStoredAuthRecord();
  if (!storedRecord) {
    return emptyAuthState();
  }

  try {
    const parsed = JSON.parse(storedRecord.raw) as Partial<AuthToken>;
    if (!isValidAuthToken(parsed)) {
      removeAllAuthStorageKeys();
      return emptyAuthState();
    }

    const normalized: AuthToken = {
      access_token: parsed.access_token.trim(),
      token_type: parsed.token_type.trim().toLowerCase(),
      userid: parsed.userid.trim(),
    };

    migrateLegacyAuthStorageIfNeeded(storedRecord.key, normalized);

    return {
      isAuthenticated: true,
      accessToken: normalized.access_token,
      tokenType: normalized.token_type,
      userid: normalized.userid,
    };
  } catch {
    removeAllAuthStorageKeys();
    return emptyAuthState();
  }
}

function persistAuthState(nextState: AuthState): void {
  if (nextState.isAuthenticated && nextState.accessToken && nextState.tokenType && nextState.userid) {
    const payload: AuthToken = {
      access_token: nextState.accessToken,
      token_type: nextState.tokenType,
      userid: nextState.userid,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    for (const legacyKey of LEGACY_AUTH_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    return;
  }

  removeAllAuthStorageKeys();
}

function emitAuthChange(): void {
  subscribers.forEach((subscriber) => subscriber());
}

function setAuthState(nextState: AuthState): void {
  authState = nextState;
  persistAuthState(nextState);
  emitAuthChange();
}

type InitAuthStateOptions = {
  forceLogout?: boolean;
};

export function initAuthState(options?: InitAuthStateOptions): void {
  if (options?.forceLogout) {
    authState = emptyAuthState();
    removeAllAuthStorageKeys();
    emitAuthChange();
    return;
  }

  authState = readPersistedAuthState();
  emitAuthChange();
}

export function setAuthenticated(token: AuthToken): void {
  setAuthState({
    isAuthenticated: true,
    accessToken: token.access_token,
    tokenType: token.token_type,
    userid: token.userid,
  });
}

export function clearAuthentication(): void {
  setAuthState({
    isAuthenticated: false,
    accessToken: null,
    tokenType: null,
    userid: null,
  });
}

export function getAuthState(): AuthState {
  return authState;
}

export function getAccessToken(): string | null {
  return authState.accessToken;
}

function subscribeAuth(subscriber: AuthSubscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function useAuthStore(): AuthState {
  return useSyncExternalStore(subscribeAuth, () => authState, () => authState);
}
