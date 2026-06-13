import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnvironment } from "@/lib/env/server";

const decisionSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().trim().max(500).optional(),
  accessExpiresAt: z.string().datetime().optional(),
});

type EmailStatus = "sent" | "failed" | "skipped";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ]!,
  );
}

async function sendDecisionEmail({
  email,
  displayName,
  status,
  reason,
  accessExpiresAt,
}: {
  email: string;
  displayName?: string;
  status: "approved" | "rejected" | "suspended";
  reason?: string;
  accessExpiresAt?: string;
}): Promise<{ status: EmailStatus; error?: string }> {
  if (process.env.ACCESS_EMAIL_ENABLED !== "true") {
    return { status: "skipped", error: "Envio de email desabilitado por configuração." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ACCESS_EMAIL_FROM;
  if (!apiKey || !from) {
    return { status: "skipped", error: "Credenciais de email não configuradas." };
  }

  const labels = {
    approved: "aprovado",
    rejected: "recusado",
    suspended: "suspenso",
  } as const;
  const name = escapeHtml(displayName?.trim() || email);
  const details = [
    reason ? `<p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>` : "",
    accessExpiresAt
      ? `<p><strong>Válido até:</strong> ${escapeHtml(
          new Date(accessExpiresAt).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
        )}</p>`
      : "",
  ].join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Seu acesso ao MW Cartão Inteligente foi ${labels[status]}`,
        html: `<p>Olá, ${name}.</p><p>Seu acesso ao MW Cartão Inteligente foi <strong>${labels[status]}</strong>.</p>${details}<p>Esta é uma mensagem automática.</p>`,
      }),
    });
    if (!response.ok) {
      return { status: "failed", error: `Resend respondeu HTTP ${response.status}.` };
    }
    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Falha desconhecida no envio.",
    };
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  const input = decisionSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Os dados da decisão são inválidos." }, { status: 400 });
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

  const { userId, status, reason, accessExpiresAt } = input.data;
  const { data, error } = await supabase.rpc("admin_set_access_status", {
    p_target_user_id: userId,
    p_new_status: status,
    p_reason: reason || null,
    p_access_expires_at: accessExpiresAt || null,
  });
  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar o acesso deste usuário." },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }

  const decision = (Array.isArray(data) ? data[0] : data) as {
    audit_id: string;
    target_email: string;
    target_display_name: string | null;
  } | undefined;
  if (!decision) {
    return NextResponse.json(
      { error: "A decisão foi registrada, mas o resultado não pôde ser confirmado." },
      { status: 500 },
    );
  }
  const emailResult = await sendDecisionEmail({
    email: decision.target_email,
    displayName: decision.target_display_name ?? undefined,
    status,
    reason,
    accessExpiresAt,
  });
  await supabase.rpc("admin_record_access_email_result", {
    p_audit_id: decision.audit_id,
    p_status: emailResult.status,
    p_error: emailResult.error || null,
  });

  return NextResponse.json({ emailStatus: emailResult.status });
}
