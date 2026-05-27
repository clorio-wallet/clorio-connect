const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const anonymousSessionId = crypto.randomUUID();

function isAnalyticsEnabled(): boolean {
  return Boolean(posthogKey && posthogHost);
}

function getRuntimeContext(): string {
  if (typeof chrome !== 'undefined' && chrome.extension) {
    return window.location.pathname.replace(/^\//, '') || 'extension';
  }

  return 'browser';
}

function sendPostHogRequest(
  endpoint: string,
  payload: Record<string, unknown>,
): void {
  if (!isAnalyticsEnabled()) return;

  void fetch(new URL(endpoint, posthogHost).toString(), {
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
  _distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    sendPostHogRequest('/capture/', {
      api_key: posthogKey,
      event,
      distinct_id: anonymousSessionId,
      $process_person_profile: false,
      properties: {
        distinct_id: anonymousSessionId,
        runtime_context: getRuntimeContext(),
        ...(properties ?? {}),
      },
    });
  } catch {
    // Never let analytics errors surface to the user
  }
}

export function identifyUser(
  _distinctId: string,
  _properties?: Record<string, unknown>,
): void {
  // Intentionally disabled in no-consent mode.
}

export function captureException(error: unknown, _distinctId: string): void {
  try {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    captureEvent(anonymousSessionId, '$exception', {
      $exception_message: normalizedError.message,
      $exception_type: normalizedError.name,
      runtime_context: getRuntimeContext(),
      $exception_list: [
        {
          type: normalizedError.name,
          value: normalizedError.message,
          stacktrace: normalizedError.stack,
        },
      ],
    });
  } catch {
    // Never let analytics errors surface to the user
  }
}
