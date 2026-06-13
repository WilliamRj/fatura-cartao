import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mapFaturaRow, mapGastoRow } from "@/lib/api/mappers";
import { TABLES } from "@/lib/api/endpoints";
import type { FaturaRow, GastoRow } from "@/lib/api/types";
import { getServerEnvironment } from "@/lib/env/server";
import { logServerEvent } from "@/lib/server/logger";
import {
  generatePDFReport,
  type ReportScope,
} from "@/lib/utils/pdfExport";

const reportSchema = z.object({
  faturaId: z.string().uuid(),
  responsible: z
    .object({
      id: z.string().uuid(),
    })
    .optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get("X-Request-Id") ?? randomUUID();
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Usuário não autenticado.", requestId },
      { status: 401 },
    );
  }

  const input = reportSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      {
        error: "Os dados solicitados para o relatório são inválidos.",
        requestId,
      },
      { status: 400 },
    );
  }

  const environment = getServerEnvironment();
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
    return NextResponse.json(
      { error: "Usuário não autenticado.", requestId },
      { status: 401 },
    );
  }

  const [{ data: faturaRow, error: faturaError }, { data: gastoRows, error: gastosError }] =
    await Promise.all([
      supabase
        .from(TABLES.FATURAS)
        .select("*")
        .eq("id", input.data.faturaId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from(TABLES.GASTOS)
        .select("*")
        .eq("fatura_id", input.data.faturaId)
        .eq("user_id", user.id)
        .order("data", { ascending: true }),
    ]);

  if (faturaError || !faturaRow) {
    logServerEvent(
      "warn",
      "report_pdf.invoice_not_found",
      { requestId, userId: user.id, faturaId: input.data.faturaId },
      faturaError,
    );
    return NextResponse.json(
      { error: "A fatura selecionada não foi encontrada.", requestId },
      { status: 404 },
    );
  }
  if (gastosError) {
    logServerEvent(
      "error",
      "report_pdf.expenses_query_failed",
      { requestId, userId: user.id, faturaId: input.data.faturaId },
      gastosError,
    );
    return NextResponse.json(
      {
        error: "Não foi possível carregar os gastos para o relatório.",
        requestId,
      },
      { status: 500 },
    );
  }

  const fatura = mapFaturaRow(faturaRow as FaturaRow);
  const gastos = ((gastoRows ?? []) as GastoRow[]).map(mapGastoRow);
  let scope: ReportScope = { type: "all" };

  if (input.data.responsible) {
    const responsibleId = input.data.responsible.id;
    const responsibleName = gastos
      .slice()
      .reverse()
      .flatMap((gasto) =>
        gasto.divisoes && gasto.divisoes.length > 0
          ? gasto.divisoes
          : [{
              valor: gasto.valor,
              responsavelId: gasto.responsavelId,
              responsavel: gasto.responsavel,
            }],
      )
      .find((item) => item.responsavelId === responsibleId)?.responsavel;

    if (!responsibleName) {
      return NextResponse.json(
        {
          error: "Este responsável não possui gastos na fatura selecionada.",
          requestId,
        },
        { status: 422 },
      );
    }

    scope = {
      type: "responsible",
      id: responsibleId,
      name: responsibleName,
    };
  }

  try {
    const report = await generatePDFReport(fatura, gastos, scope);
    logServerEvent("info", "report_pdf.generated", {
      requestId,
      userId: user.id,
      faturaId: fatura.id,
      scope: scope.type,
      responsibleId: scope.type === "responsible" ? scope.id : null,
      expenseCount: report.expenseCount,
      byteLength: report.bytes.byteLength,
      durationMs: Date.now() - startedAt,
    });
    return new NextResponse(report.bytes, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${report.fileName}"`,
        "Content-Length": report.bytes.byteLength.toString(),
        "Content-Type": "application/pdf",
        "X-Report-Expense-Count": report.expenseCount.toString(),
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    logServerEvent(
      "error",
      "report_pdf.generation_failed",
      {
        requestId,
        userId: user.id,
        faturaId: fatura.id,
        scope: scope.type,
        responsibleId: scope.type === "responsible" ? scope.id : null,
        expenseCount: gastos.length,
        durationMs: Date.now() - startedAt,
      },
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message.replace(/^Falha ao gerar o PDF:\s*/, "")
            : "Não foi possível gerar o relatório.",
        requestId,
      },
      { status: 422 },
    );
  }
}
