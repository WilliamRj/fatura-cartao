import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
      message: "deve usar HTTP ou HTTPS",
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(1),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function inspectServerEnvironment() {
  const result = serverEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  if (result.success) {
    return {
      success: true as const,
      data: result.data,
      invalidVariables: [] as string[],
    };
  }

  return {
    success: false as const,
    data: null,
    invalidVariables: Array.from(
      new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ),
  };
}

export function getServerEnvironment(): ServerEnvironment {
  const result = inspectServerEnvironment();

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente ausentes ou inválidas: ${result.invalidVariables.join(", ")}`,
    );
  }

  return result.data;
}
