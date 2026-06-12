import { z } from "zod";
import {
  CATEGORY_DEFINITIONS,
  normalizeCategory,
} from "../categories";

const MAX_MONEY_VALUE = 999_999_999.99;
const MAX_LANCAMENTOS = 5_000;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function normalizeTextKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

const MONTH_BY_KEY = new Map(
  MONTHS.map((month, index) => [normalizeTextKey(month), index]),
);

const ALLOWED_CATEGORIES = new Set<string>(
  CATEGORY_DEFINITIONS.map((category) => category.nome),
);

function parseMoney(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  let normalized = value.trim();
  const isParenthesized =
    normalized.startsWith("(") && normalized.endsWith(")");
  const hasTrailingMinus = normalized.endsWith("-");

  normalized = normalized
    .replace(/^R\$\s*/i, "")
    .replace(/[()]/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/-$/, "")
    .replace(/\s/g, "");

  if (!normalized) {
    return value;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return isParenthesized || hasTrailingMinus ? -Math.abs(parsed) : parsed;
}

function normalizeMonthReference(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const numericMatch = normalized.match(/^(0?[1-9]|1[0-2])\/(\d{4})$/);

  if (numericMatch) {
    return `${MONTHS[Number(numericMatch[1]) - 1]} ${numericMatch[2]}`;
  }

  const textualMatch = normalized.match(/^(.+?)(?:\s+de)?\s+(\d{4})$/i);
  if (!textualMatch) {
    return normalized;
  }

  const monthIndex = MONTH_BY_KEY.get(normalizeTextKey(textualMatch[1]));
  return monthIndex === undefined
    ? normalized
    : `${MONTHS[monthIndex]} ${textualMatch[2]}`;
}

function isValidIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const moneySchema = z.preprocess(
  parseMoney,
  z
    .number({
      invalid_type_error: "deve ser um valor numérico",
    })
    .finite("deve ser um valor finito")
    .positive("deve ser maior que zero")
    .max(MAX_MONEY_VALUE, "excede o valor máximo permitido")
    .transform((value) => Math.round(value * 100) / 100),
);

const entryMoneySchema = z.preprocess(
  parseMoney,
  z
    .number({
      invalid_type_error: "deve ser um valor numérico",
    })
    .finite("deve ser um valor finito")
    .min(-MAX_MONEY_VALUE, "excede o valor mínimo permitido")
    .max(MAX_MONEY_VALUE, "excede o valor máximo permitido")
    .refine((value) => value !== 0, "deve ser diferente de zero")
    .transform((value) => Math.round(value * 100) / 100),
);

const installmentSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  })
  .refine((value) => value === null || /^\d{1,3}\/\d{1,3}$/.test(value), {
    message: "deve seguir o padrão 01/10",
  })
  .refine((value) => {
    if (value === null) {
      return true;
    }

    const [current, total] = value.split("/").map(Number);
    return current >= 1 && total >= 1 && current <= total;
  }, "deve indicar uma parcela válida")
  .transform((value) => {
    if (value === null) {
      return null;
    }

    const [current, total] = value.split("/").map(Number);
    const width = Math.max(2, String(total).length);
    return `${String(current).padStart(width, "0")}/${String(total).padStart(width, "0")}`;
  });

const categorySchema = z
  .string()
  .trim()
  .min(1, "é obrigatória")
  .transform(normalizeCategory)
  .refine((value) => ALLOWED_CATEGORIES.has(value), {
    message: "não pertence à lista de categorias permitidas",
  });

const lancamentoSchema = z
  .object({
    data: z
      .string()
      .trim()
      .refine(isValidIsoDate, "deve ser uma data real no formato YYYY-MM-DD"),
    estabelecimento: z
      .string()
      .trim()
      .min(1, "é obrigatório")
      .max(200, "deve ter no máximo 200 caracteres")
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
        message: "contém caracteres de controle inválidos",
      }),
    valor: entryMoneySchema,
    parcela: installmentSchema,
    categoria: categorySchema,
  })
  .strict();

export const parsedFaturaSchema = z
  .object({
    mes_referencia: z
      .string()
      .transform(normalizeMonthReference)
      .refine((value) => {
        const match = value.match(/^(.+) (\d{4})$/);
        if (!match) {
          return false;
        }

        const year = Number(match[2]);
        return (
          MONTHS.some((month) => match[1] === month) &&
          year >= 2000 &&
          year <= 2100
        );
      }, "deve identificar mês e ano entre 2000 e 2100, por exemplo: Maio 2026"),
    valor_total: moneySchema,
    lancamentos: z
      .array(lancamentoSchema)
      .min(1, "deve conter ao menos um lançamento")
      .max(
        MAX_LANCAMENTOS,
        `deve conter no máximo ${MAX_LANCAMENTOS} lançamentos`,
      ),
  })
  .strict()
  .superRefine((fatura, context) => {
    const totalInCents = Math.round(fatura.valor_total * 100);
    const entriesInCents = fatura.lancamentos.reduce(
      (total, entry) => total + Math.round(entry.valor * 100),
      0,
    );
    const differenceInCents = entriesInCents - totalInCents;

    if (Math.abs(differenceInCents) > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lancamentos"],
        message: `a soma dos lançamentos diverge do total da fatura em ${(differenceInCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`,
      });
    }
  });

export type ParsedFatura = z.infer<typeof parsedFaturaSchema>;

export function formatValidationIssues(error: z.ZodError) {
  return error.issues.slice(0, 8).map((issue) => ({
    campo: issue.path.length > 0 ? issue.path.join(".") : "resposta",
    mensagem: issue.message,
  }));
}
