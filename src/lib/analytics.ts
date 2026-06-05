const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

// Ephemeral session ID: generated once per runtime session (popup/background/approval_ui)
// Stored in volatile memory only — not persisted, not cross-session
// Reused for all events in this session for PostHog grouping
let sessionDistinctId: string | undefined;

function getSessionDistinctId(): string {
  if (!sessionDistinctId) {
    if (typeof crypto?.randomUUID === 'function') {
      sessionDistinctId = crypto.randomUUID();
    } else {
      sessionDistinctId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }
  return sessionDistinctId;
}

type AnalyticsProperties = Record<string, unknown>;
type AnalyticsTransport = 'fetch' | 'beacon';
type ApiFailureMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type UiMode = 'popup' | 'sidepanel' | 'window';
type RuntimeArea = 'popup' | 'background' | 'approval_ui';
type EndpointGroup =
  | 'mina_transaction'
  | 'mina_transaction_delegation'
  | 'mina_transactions'
  | 'mina_accounts'
  | 'mina_mempool';
type FailureClass = 'network_error' | 'http_error' | 'timeout' | 'abort' | 'unknown' | 'background_unavailable';
type StorageAreaName = 'local' | 'session' | 'idb';
type StorageOperation = 'get' | 'set' | 'remove' | 'clear';
type ConfigSource = 'default' | 'remote';

type SafeAnalyticsContextInput = {
  networkId?: string | null;
  walletType?: string | null;
  uiMode?: string | null;
  language?: string | null;
};

type ApiFailureProperties = {
  endpoint_group: EndpointGroup;
  method: ApiFailureMethod;
  status_code?: number;
  failure_class: FailureClass;
  runtime_area?: RuntimeArea;
};

type StorageFailureProperties = {
  storage_area: StorageAreaName;
  operation: StorageOperation;
  failure_class: FailureClass;
  runtime_area?: RuntimeArea;
};

type NetworkConfigFailureProperties = {
  failure_class: FailureClass;
  runtime_area?: RuntimeArea;
  status_code?: number;
  config_source: ConfigSource;
};

type BackgroundUnavailableProperties = {
  runtime_area?: RuntimeArea;
};

type DiagnosticHeartbeatProperties = {
  runtime_area?: RuntimeArea;
};

const ALLOWED_API_FAILURE_METHODS = new Set<ApiFailureMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

const ALLOWED_RUNTIME_AREAS = new Set<RuntimeArea>([
  'popup',
  'background',
  'approval_ui',
]);

const ALLOWED_ENDPOINT_GROUPS = new Set<EndpointGroup>([
  'mina_transaction',
  'mina_transaction_delegation',
  'mina_transactions',
  'mina_accounts',
  'mina_mempool',
]);

const ALLOWED_FAILURE_CLASSES = new Set<FailureClass>([
  'network_error',
  'http_error',
  'timeout',
  'abort',
  'unknown',
  'background_unavailable',
]);

const ALLOWED_STORAGE_AREAS = new Set<StorageAreaName>(['local', 'session', 'idb']);

const ALLOWED_STORAGE_OPERATIONS = new Set<StorageOperation>([
  'get',
  'set',
  'remove',
  'clear',
]);

const ALLOWED_CONFIG_SOURCES = new Set<ConfigSource>(['default', 'remote']);

function isAnalyticsEnabled(): boolean {
  return Boolean(posthogKey && posthogHost);
}

function getRuntimeContext(): string {
  if (typeof window === 'undefined') {
    return 'background';
  }

  if (typeof chrome !== 'undefined' && chrome.extension) {
    return window.location.pathname.includes('popup')
      ? 'extension_popup'
      : 'extension_page';
  }

  return 'browser';
}

function getDefaultRuntimeArea(): RuntimeArea {
  return typeof window === 'undefined' ? 'background' : 'popup';
}

function getAppVersion(): string | undefined {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version;
    }
  } catch {
    // Ignore runtime lookup failures.
  }

  return undefined;
}

export function buildSafeAnalyticsContext(
  input: SafeAnalyticsContextInput,
): AnalyticsProperties {
  const language = input.language?.split('-')[0]?.toLowerCase();
  const context: AnalyticsProperties = {};

  if (input.networkId === 'mainnet' || input.networkId === 'devnet') {
    context.network_family = input.networkId;
  }

  if (input.walletType === 'software' || input.walletType === 'ledger') {
    context.wallet_type = input.walletType;
  }

  if (
    input.uiMode === 'popup' ||
    input.uiMode === 'sidepanel' ||
    input.uiMode === 'window'
  ) {
    context.ui_mode = input.uiMode as UiMode;
  }

  if (language && /^[a-z]{2,5}$/.test(language)) {
    context.language = language;
  }

  return context;
}

function withBaseProperties(
  properties?: AnalyticsProperties,
): AnalyticsProperties {
  const appVersion = getAppVersion();

  return {
    runtime_context: getRuntimeContext(),
    ...(appVersion ? { app_version: appVersion } : {}),
    ...(properties ?? {}),
  };
}

function sendViaBeacon(url: string, payload: Record<string, unknown>): boolean {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.sendBeacon !== 'function'
  ) {
    return false;
  }

  return navigator.sendBeacon(
    url,
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );
}

function sendPostHogRequest(
  endpoint: string,
  payload: Record<string, unknown>,
  transport: AnalyticsTransport = 'fetch',
): void {
  if (!isAnalyticsEnabled()) return;

  const url = new URL(endpoint, posthogHost).toString();

  if (transport === 'beacon' && sendViaBeacon(url, payload)) {
    return;
  }

  void fetch(url, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Never let analytics errors surface to the user
  });
}

export function captureEvent(
  event: string,
  properties?: AnalyticsProperties,
  transport: AnalyticsTransport = 'fetch',
): void {
  try {
    sendPostHogRequest(
      '/capture/',
      {
        api_key: posthogKey,
        event,
        distinct_id: getSessionDistinctId(),
        disableGeoip: true,
        $process_person_profile: false,
        properties: withBaseProperties(properties),
      },
      transport,
    );
  } catch {
    // Never let analytics errors surface to the user
  }
}

export function captureApiFailure(properties: ApiFailureProperties): void {
  if (
    !ALLOWED_ENDPOINT_GROUPS.has(properties.endpoint_group) ||
    !ALLOWED_API_FAILURE_METHODS.has(properties.method) ||
    !ALLOWED_FAILURE_CLASSES.has(properties.failure_class) ||
    (properties.runtime_area !== undefined &&
      !ALLOWED_RUNTIME_AREAS.has(properties.runtime_area))
  ) {
    return;
  }

  const statusCode =
    typeof properties.status_code === 'number' &&
    Number.isFinite(properties.status_code)
      ? properties.status_code
      : undefined;

  captureEvent('api_failure', {
    endpoint_group: properties.endpoint_group,
    method: properties.method,
    status_code: statusCode,
    failure_class: properties.failure_class,
    runtime_area: properties.runtime_area,
  });
}

export function captureStorageFailure(
  properties: StorageFailureProperties,
): void {
  if (
    !ALLOWED_STORAGE_AREAS.has(properties.storage_area) ||
    !ALLOWED_STORAGE_OPERATIONS.has(properties.operation) ||
    !ALLOWED_FAILURE_CLASSES.has(properties.failure_class) ||
    (properties.runtime_area !== undefined &&
      !ALLOWED_RUNTIME_AREAS.has(properties.runtime_area))
  ) {
    return;
  }

  captureEvent('storage_failure', {
    storage_area: properties.storage_area,
    operation: properties.operation,
    failure_class: properties.failure_class,
    runtime_area: properties.runtime_area ?? getDefaultRuntimeArea(),
  });
}

export function captureNetworkConfigFailure(
  properties: NetworkConfigFailureProperties,
): void {
  if (
    !ALLOWED_FAILURE_CLASSES.has(properties.failure_class) ||
    !ALLOWED_CONFIG_SOURCES.has(properties.config_source) ||
    (properties.runtime_area !== undefined &&
      !ALLOWED_RUNTIME_AREAS.has(properties.runtime_area))
  ) {
    return;
  }

  const statusCode =
    typeof properties.status_code === 'number' &&
    Number.isFinite(properties.status_code)
      ? properties.status_code
      : undefined;

  captureEvent('network_config_failure', {
    failure_class: properties.failure_class,
    runtime_area: properties.runtime_area ?? getDefaultRuntimeArea(),
    status_code: statusCode,
    config_source: properties.config_source,
  });
}

export function captureBackgroundUnavailable(
  properties: BackgroundUnavailableProperties,
): void {
  if (
    properties.runtime_area !== undefined &&
    !ALLOWED_RUNTIME_AREAS.has(properties.runtime_area)
  ) {
    return;
  }

  captureEvent('background_unavailable', {
    failure_class: 'background_unavailable' as const,
    runtime_area: properties.runtime_area ?? getDefaultRuntimeArea(),
  });
}

export function captureDiagnosticHeartbeat(
  properties: DiagnosticHeartbeatProperties,
): void {
  if (
    properties.runtime_area !== undefined &&
    !ALLOWED_RUNTIME_AREAS.has(properties.runtime_area)
  ) {
    return;
  }

  captureEvent('diagnostic_heartbeat', {
    runtime_area: properties.runtime_area ?? getDefaultRuntimeArea(),
  });
}