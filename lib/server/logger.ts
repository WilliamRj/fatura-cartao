import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogValue = boolean | number | string | null | undefined;
type LogContext = Record<string, LogValue>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return { errorMessage: error.message };
  }

  return {};
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
  error?: unknown,
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    ...serializeError(error),
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}
