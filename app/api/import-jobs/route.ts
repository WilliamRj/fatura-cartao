import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { STORAGE, TABLES } from "@/lib/api/endpoints";
import type { ImportJobRow } from "@/lib/api/types";
import { getServerEnvironment } from "@/lib/env/server";
import { logServerEvent } from "@/lib/server/logger";

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const enqueueSchema = z.object({
  pdfPath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_PDF_SIZE),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/),
  requestId: z.string().uuid(),
});

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const environment = getServerEnvironment();
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const input = enqueueSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json(
      { error: "Os dados do job de importação são inválidos." },
      { status: 400 },
    );
  }

  const supabase = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const { pdfPath, fileName, fileSize, fileHash, requestId } = input.data;
  const expectedPath = new RegExp(
    `^${user.id}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`,
    "i",
  );
  if (!expectedPath.test(pdfPath)) {
    return NextResponse.json(
      { error: "O caminho do PDF enviado é inválido." },
      { status: 400 },
    );
  }

  const { data: job, error: insertError } = await supabase
    .from(TABLES.IMPORT_JOBS)
    .insert({
      user_id: user.id,
      request_id: requestId,
      file_name: fileName,
      file_size: fileSize,
      file_hash: fileHash,
      pdf_path: pdfPath,
    })
    .select("*")
    .single();

  if (insertError) {
    const duplicate = insertError.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "Este PDF já está aguardando processamento."
          : "Não foi possível registrar a importação.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }

  const persistedJob = job as ImportJobRow;
  const origin = request.nextUrl.origin;

  after(async () => {
    const startedAt = Date.now();
    try {
      await supabase
        .from(TABLES.IMPORT_JOBS)
        .update({
          status: "processing",
          stage: "ai_processing",
          progress: 55,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", persistedJob.id)
        .eq("user_id", user.id);

      const processResponse = await fetch(`${origin}/api/process-fatura`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
        body: JSON.stringify({ pdfPath, fileName, fileSize, fileHash }),
      });
      const result = (await processResponse.json().catch(() => ({}))) as {
        error?: string;
        stage?: string;
        durationMs?: number;
        codigo?: string;
        fatura?: { id?: string };
      };
      const completedAt = new Date().toISOString();

      if (!processResponse.ok) {
        await supabase
          .from(TABLES.IMPORT_JOBS)
          .update({
            status: result.codigo === "FATURA_DUPLICADA" ? "duplicate" : "error",
            stage: result.stage ?? "unexpected",
            progress: 100,
            error_message: result.error ?? "A importação falhou.",
            duration_ms: result.durationMs ?? Date.now() - startedAt,
            completed_at: completedAt,
            updated_at: completedAt,
          })
          .eq("id", persistedJob.id)
          .eq("user_id", user.id);
        return;
      }

      await supabase
        .from(TABLES.IMPORT_JOBS)
        .update({
          status: "success",
          stage: "completed",
          progress: 100,
          fatura_id: result.fatura?.id ?? null,
          duration_ms: result.durationMs ?? Date.now() - startedAt,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq("id", persistedJob.id)
        .eq("user_id", user.id);
    } catch (error) {
      const completedAt = new Date().toISOString();
      await supabase.storage.from(STORAGE.FATURAS).remove([pdfPath]);
      await supabase
        .from(TABLES.IMPORT_JOBS)
        .update({
          status: "error",
          stage: "background_processing",
          progress: 100,
          error_message: "O processamento em segundo plano foi interrompido.",
          duration_ms: Date.now() - startedAt,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq("id", persistedJob.id)
        .eq("user_id", user.id);
      logServerEvent(
        "error",
        "invoice_import.background_failed",
        { requestId, userId: user.id, stage: "background_processing" },
        error,
      );
    }
  });

  return NextResponse.json({ job: persistedJob }, { status: 202 });
}
