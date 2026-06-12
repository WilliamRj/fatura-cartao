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
  actorEmail?: string;
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
  is_admin: boolean;
}

interface AdminAccessUserRow extends AccessStateRow {
  last_login_at: string | null;
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
    isAdmin: row.is_admin,
  };
}

export async function getMyAccessProfile(user: User) {
  const { data, error } = await supabase.rpc("get_my_access_state");

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível verificar sua autorização de acesso.",
    );
  }

  const row = firstRow(data as AccessStateRow[] | null);
  if (!row || row.user_id !== user.id) {
    throw new Error("O estado de acesso retornado é inválido.");
  }

  return mapAccessProfile(row);
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
) {
  const { error } = await supabase.rpc("admin_set_access_status", {
    p_target_user_id: userId,
    p_new_status: status,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    throw createPublicDataError(
      error,
      "Não foi possível atualizar o acesso deste usuário.",
    );
  }
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
    actor_email: string | null;
    created_at: string;
  }>).map(
    (row): AccessAuditEntry => ({
      id: row.id,
      action: row.action,
      previousStatus: row.previous_status ?? undefined,
      newStatus: row.new_status,
      reason: row.reason ?? undefined,
      actorEmail: row.actor_email ?? undefined,
      createdAt: row.created_at,
    }),
  );
}
