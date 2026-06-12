import { NextResponse } from "next/server";
import { inspectServerEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = inspectServerEnvironment();
  const status = environment.success ? 200 : 503;

  return NextResponse.json(
    {
      status: environment.success ? "ok" : "unhealthy",
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      deployment: {
        region: process.env.VERCEL_REGION ?? null,
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      },
      checks: {
        environment: environment.success
          ? { status: "ok" }
          : {
              status: "error",
              invalidVariables: environment.invalidVariables,
            },
      },
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
