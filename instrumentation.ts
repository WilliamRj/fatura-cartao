import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const [{ inspectServerEnvironment }, { logServerEvent }] = await Promise.all([
    import("./lib/env/server"),
    import("./lib/server/logger"),
  ]);

  const environmentValidation = inspectServerEnvironment();
  if (!environmentValidation.success) {
    logServerEvent("error", "application.environment_invalid", {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      invalidVariables: environmentValidation.invalidVariables.join(","),
    });
    return;
  }

  logServerEvent("info", "application.started", {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { logServerEvent } = await import("./lib/server/logger");

  logServerEvent(
    "error",
    "request.unhandled_error",
    {
      method: request.method,
      path: request.path,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    error,
  );
};
