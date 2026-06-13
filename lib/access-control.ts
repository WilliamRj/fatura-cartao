import type { User } from "@supabase/supabase-js";

import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export type AccessStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "withdrawn";

export interface AccessProfile {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  status: AccessStatus;
  decisionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  lastRequestAt: string;
  requestCount: number;
  accessExpiresAt?: string;
  isAdmin: boolean;
}

export interface AdminAccessUser extends AccessProfile {
  lastLoginAt?: string;
}

export interface AccessAuditEntry {
  id: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  accessExpiresAt?: string;
  actorEmail?: string;
  emailStatus?: "pending" | "sent" | "failed" | "skipped";
  emailError?: string;
  createdAt: string;
}

interface AccessStateRow {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  access_status: AccessStatus;
  decision_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  last_request_at: string;
  request_count: number;
  access_expires_at: string | null;
  is_admin: boolean;
}

interface AdminAccessUserRow extends AccessStateRow {
  last_login_at: string | null;
}

interface SupabaseErrorDetails {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function accessErrorMessage(error: SupabaseErrorDetails) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return "O controle de acesso ainda não foi instalado no Supabase. Aplique as migrations de acesso e tente novamente.";
  }

  if (error.code === "42501") {
    return "O Supabase bloqueou a verificação de acesso por falta de permissão. Reaplique os grants da migration.";
  }

  return "Não foi possível verificar sua autorização de acesso.";
}

function firstRow<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}

function mapAccessProfile(row: AccessStateRow): AccessProfile {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    status: row.access_status,
    decisionReason: row.decision_reason ?? undefined,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at ?? undefined,
    lastRequestAt: row.last_request_at,
    requestCount: row.request_count,
    accessExpiresAt: row.access_expires_at ?? undefined,
    isAdmin: row.is_admin,
  };
}

export async function getMyAccessProfile(user: User) {
  const { data, error } = await supabase.rpc("get_my_access_state");

  if (error) {
    console.error("Falha na RPC get_my_access_state", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw createPublicDataError(
      error,
      accessErrorMessage(error),
    );
  }

  const row = firstRow(data as AccessStateRow[] | null);
  if (!row || row.user_id !== user.id) {
    throw new Error("O estado de acesso retornado é inválido.");
  }

  const profile = mapAccessProfile(row);
  if (profile.status === "approved") {
    const { error: responsibleError } = await supabase.rpc(
      "ensure_owner_responsavel",
    );

    if (responsibleError) {
      throw createPublicDataError(
        responsibleError,
        "Não foi possível preparar o responsável principal da conta.",
      );
    }
  }

  return profile;
}

export async function renewMyAccessRequest() {
  const { error } = await supabase.rpc("renew_my_access_request");

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível enviar uma nova solicitação.",
    );
  }
}

export async function withdrawMyAccessRequest() {
  const { error } = await supabase.rpc("withdraw_my_access_request");

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível retirar sua solicitação.",
    );
  }
}

export async function listAccessUsers(status?: AccessStatus) {
  const { data, error } = await supabase.rpc("admin_list_access_requests", {
    p_requested_status: status ?? null,
  });

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível carregar os usuários do sistema.",
    );
  }

  return ((data ?? []) as AdminAccessUserRow[]).map((row) => ({
    ...mapAccessProfile(row),
    lastLoginAt: row.last_login_at ?? undefined,
  }));
}

export async function setUserAccessStatus(
  userId: string,
  status: "approved" | "rejected" | "suspended",
  reason?: string,
  accessExpiresAt?: string,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch("/api/admin/access/decision", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, status, reason, accessExpiresAt }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    emailStatus?: "sent" | "failed" | "skipped";
  };
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível atualizar o acesso deste usuário.");
  }

  return result;
}

export async function downloadAccessAuditExport() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch("/api/admin/access/audit-export", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error || "Não foi possível exportar o histórico.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
    "historico-administrativo.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listAccessAudit(userId: string) {
  const { data, error } = await supabase.rpc("admin_get_access_audit", {
    p_target_user_id: userId,
  });

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível carregar o histórico de acesso.",
    );
  }

  return ((data ?? []) as Array<{
    id: string;
    action: string;
    previous_status: string | null;
    new_status: string;
    reason: string | null;
    access_expires_at: string | null;
    actor_email: string | null;
    email_status: "pending" | "sent" | "failed" | "skipped" | null;
    email_error: string | null;
    created_at: string;
  }>).map(
    (row): AccessAuditEntry => ({
      id: row.id,
      action: row.action,
      previousStatus: row.previous_status ?? undefined,
      newStatus: row.new_status,
      reason: row.reason ?? undefined,
      accessExpiresAt: row.access_expires_at ?? undefined,
      actorEmail: row.actor_email ?? undefined,
      emailStatus: row.email_status ?? undefined,
      emailError: row.email_error ?? undefined,
      createdAt: row.created_at,
    }),
  );
}
