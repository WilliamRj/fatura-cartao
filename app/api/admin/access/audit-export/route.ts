import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { getServerEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const environment = getServerEnvironment();
  const supabase = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("admin_export_access_audit");
  if (error) {
    return NextResponse.json(
      { error: "Não foi possível exportar o histórico administrativo." },
      { status: error.code === "42501" ? 403 : 500 },
    );
  }

  const headers = [
    "Data",
    "Email do usuário",
    "Nome do usuário",
    "Ação",
    "Status anterior",
    "Novo status",
    "Motivo",
    "Expiração do acesso",
    "Administrador",
    "Status do email",
    "Erro do email",
  ];
  const keys = [
    "created_at",
    "target_email",
    "target_display_name",
    "action",
    "previous_status",
    "new_status",
    "reason",
    "access_expires_at",
    "actor_email",
    "email_status",
    "email_error",
  ];
  const rows = (data ?? []) as Record<string, unknown>[];
  const csv = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(";")),
  ].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historico-administrativo-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
