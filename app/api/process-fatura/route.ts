import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
} from "@google/generative-ai";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  formatValidationIssues,
  parsedFaturaSchema,
} from "@/lib/ai/fatura-schema";
import { STORAGE } from "@/lib/api/endpoints";
import { getServerEnvironment } from "@/lib/env/server";
import { logServerEvent } from "@/lib/server/logger";

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 240_000;
const stagedPdfSchema = z.object({
  pdfPath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_PDF_SIZE),
});

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const importStartedAt = new Date().toISOString();
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  let userId: string | undefined;
  let cleanupStagedPdf: (() => Promise<void>) | undefined;

  const respond = async (
    body: Record<string, unknown>,
    status: number,
    stage: string,
    error?: unknown,
  ) => {
    if (status >= 400 && cleanupStagedPdf) {
      await cleanupStagedPdf();
      cleanupStagedPdf = undefined;
    }

    logServerEvent(
      status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      status >= 400 ? "invoice_import.failed" : "invoice_import.completed",
      {
        requestId,
        userId,
        stage,
        status,
        durationMs: Date.now() - requestStartedAt,
      },
      error,
    );

    const response = NextResponse.json(body, { status });
    response.headers.set("X-Request-Id", requestId);
    return response;
  };

  try {
    const environment = getServerEnvironment();
    const genAI = new GoogleGenerativeAI(environment.GEMINI_API_KEY);

    logServerEvent("info", "invoice_import.started", {
      requestId,
      stage: "authentication",
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond(
        { error: "Missing authorization header" },
        401,
        "authentication",
      );
    }

    const supabase = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond({ error: "Unauthorized" }, 401, "authentication", authError);
    }
    userId = user.id;

    const contentType = req.headers.get("content-type") ?? "";
    let buffer: Buffer;
    let storedPdfPath: string | undefined;

    if (contentType.includes("application/json")) {
      const stagedPdfResult = stagedPdfSchema.safeParse(await req.json());
      if (!stagedPdfResult.success) {
        return respond(
          { error: "Os dados do PDF enviado são inválidos." },
          400,
          "file_validation",
        );
      }

      const { pdfPath, fileSize } = stagedPdfResult.data;
      const expectedPath = new RegExp(
        `^${user.id}/[0-9a-f-]{36}\\.pdf$`,
        "i",
      );
      if (!expectedPath.test(pdfPath)) {
        return respond(
          { error: "O caminho do PDF enviado é inválido." },
          400,
          "file_validation",
        );
      }

      cleanupStagedPdf = async () => {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE.FATURAS)
          .remove([pdfPath]);

        if (cleanupError) {
          logServerEvent(
            "error",
            "invoice_import.staged_pdf_cleanup_failed",
            { requestId, userId, stage: "pdf_cleanup" },
            cleanupError,
          );
        }
      };

      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from(STORAGE.FATURAS)
        .download(pdfPath);

      if (downloadError) {
        return respond(
          { error: "Não foi possível acessar o PDF enviado." },
          500,
          "pdf_download",
          downloadError,
        );
      }

      if (pdfBlob.size !== fileSize || pdfBlob.size > MAX_PDF_SIZE) {
        return respond(
          { error: "O tamanho do PDF armazenado não corresponde ao envio." },
          400,
          "file_validation",
        );
      }

      buffer = Buffer.from(await pdfBlob.arrayBuffer());
      storedPdfPath = pdfPath;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return respond({ error: "No file provided" }, 400, "file_validation");
      }

      if (file.size === 0 || file.size > MAX_PDF_SIZE) {
        return respond(
          { error: "O PDF deve ter entre 1 byte e 20 MB." },
          400,
          "file_validation",
        );
      }

      if (file.type !== "application/pdf") {
        return respond(
          { error: "O arquivo enviado deve ser um PDF." },
          400,
          "file_validation",
        );
      }

      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return respond(
        { error: "O conteúdo do arquivo não corresponde a um PDF válido." },
        400,
        "file_validation",
      );
    }

    const pdfHash = createHash("sha256").update(buffer).digest("hex");
    const { data: existingFatura, error: duplicateCheckError } = await supabase
      .from("faturas")
      .select("id, mes_referencia")
      .eq("user_id", user.id)
      .eq("arquivo_hash", pdfHash)
      .maybeSingle();

    if (duplicateCheckError) {
      return respond(
        { error: "Não foi possível verificar se esta fatura já foi importada." },
        500,
        "duplicate_check",
        duplicateCheckError,
      );
    }

    if (existingFatura) {
      return respond(
        {
          error: `Este PDF já foi importado como a fatura de ${existingFatura.mes_referencia}.`,
          codigo: "FATURA_DUPLICADA",
          faturaId: existingFatura.id,
        },
        409,
        "duplicate_check",
      );
    }
    
    const pdfPart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    const model = genAI.getGenerativeModel(
      { model: "gemini-3.5-flash" },
      { timeout: GEMINI_TIMEOUT_MS },
    );
    const prompt = `
      You are a helpful assistant that processes credit card invoices from Banco Itaú in Brazil.
      I have attached the PDF invoice.
      
      You need to find:
      1. 'mes_referencia': The month and year of the invoice, based on the 'Emissão' (Issue) date. 
         Example: If Emissão is 30/05/2026, the mes_referencia is 'Maio 2026'.
      2. 'valor_total': The total value of the invoice as a float number.
      3. 'lancamentos': A list of all purchases/expenses in the invoice. 
         IMPORTANT: Include all items listed under "Lançamentos", specifically including items under "produtos e serviços" and items containing "PARCELAMEN FATURA".
         CRITICAL: You must completely IGNORE and DISCARD any entry that contains "crédito parcelamento" in its description. Do NOT ignore "PARCELAMEN FATURA".
         Ignore payments of the previous invoice and fees/taxes if possible, focus on purchases. For each, extract:
         - 'data': The date of the purchase in YYYY-MM-DD format. Use the invoice year if not specified.
         - 'estabelecimento': The name of the place/store.
         - 'valor': The value of the purchase as a float number.
         - 'parcela': If it's an installment, like '01/10', put it here as a string. Otherwise, use null.
         - 'categoria': Infer a general category based on the establishment name. Use EXACTLY one of these PT-BR values: 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Compras', 'Assinaturas', 'Entretenimento', 'Pagamentos', 'Condomínio', 'Dívida', 'Outros'.
           IMPORTANT CATEGORIZATION RULES:
           - If the establishment name contains "PICPAY", the category MUST be "Pagamentos".
           - If the establishment name contains "PGCONTA ATLANTIDA", the category MUST be "Condomínio".
           - If the establishment name contains "PARCELAMEN FATURA", the category MUST be "Dívida".

      Return EXACTLY a JSON object (and nothing else, no markdown formatting) with this structure:
      {
        "mes_referencia": "String",
        "valor_total": Number,
        "lancamentos": [
          { "data": "YYYY-MM-DD", "estabelecimento": "String", "valor": Number, "parcela": "String" | null, "categoria": "String" }
        ]
      }
    `;

    const result = await model.generateContent([prompt, pdfPart]);
    let textResult = result.response.text();
    
    if (textResult.startsWith('\`\`\`json')) {
      textResult = textResult.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
    } else if (textResult.startsWith('\`\`\`')) {
      textResult = textResult.replace(/\`\`\`/g, '');
    }

    let untrustedData: unknown;
    try {
      untrustedData = JSON.parse(textResult.trim());
    } catch (error) {
      return respond(
        {
          error:
            "A IA retornou uma resposta inválida. Nenhum dado foi salvo. Tente importar novamente.",
        },
        422,
        "ai_response_parsing",
        error,
      );
    }

    const validationResult = parsedFaturaSchema.safeParse(untrustedData);
    if (!validationResult.success) {
      const validationIssues = formatValidationIssues(validationResult.error);
      logServerEvent("warn", "invoice_import.ai_validation_failed", {
        requestId,
        userId,
        stage: "ai_response_validation",
        issueCount: validationIssues.length,
      });
      return respond(
        {
          error:
            "A IA retornou dados inconsistentes. Nenhum dado foi salvo.",
          detalhes: validationIssues,
        },
        422,
        "ai_response_validation",
      );
    }

    const parsedData = validationResult.data;

    const { data: responsaveis, error: responsaveisError } = await supabase
      .from('responsaveis')
      .select('nome, cor')
      .eq('user_id', user.id);

    if (responsaveisError) {
      return respond(
        { error: "Não foi possível preparar a importação da fatura." },
        500,
        "responsaveis_query",
        responsaveisError,
      );
    }

    let responsavelName = "Não definido";
    if (responsaveis && responsaveis.length > 0) {
      const principal = responsaveis.find(r => r.cor === 'pessoal');
      if (principal) {
        responsavelName = principal.nome;
      } else {
        responsavelName = responsaveis[0].nome;
      }
    }

    const pdfPath = storedPdfPath ?? `${user.id}/${randomUUID()}.pdf`;
    if (!storedPdfPath) {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE.FATURAS)
        .upload(pdfPath, buffer, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        return respond(
          { error: "Não foi possível armazenar o PDF da fatura." },
          500,
          "pdf_upload",
          uploadError,
        );
      }
    }

    const { data: fatura, error: importError } = await supabase.rpc(
      "import_fatura_atomically",
      {
        p_mes_referencia: parsedData.mes_referencia,
        p_valor_total: parsedData.valor_total,
        p_data_importacao: importStartedAt,
        p_responsavel: responsavelName,
        p_lancamentos: parsedData.lancamentos,
        p_arquivo_url: pdfPath,
        p_arquivo_hash: pdfHash,
      },
    );

    if (importError) {
      logServerEvent(
        "error",
        "invoice_import.database_failed",
        {
          requestId,
          userId,
          stage: "database_import",
        },
        importError,
      );
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE.FATURAS)
        .remove([pdfPath]);
      cleanupStagedPdf = undefined;

      if (cleanupError) {
        logServerEvent(
          "error",
          "invoice_import.cleanup_failed",
          {
            requestId,
            userId,
            stage: "pdf_cleanup",
          },
          cleanupError,
        );
      }

      if (importError.code === "23505") {
        return respond(
          {
            error: "Este PDF já foi importado anteriormente.",
            codigo: "FATURA_DUPLICADA",
          },
          409,
          "database_import",
          importError,
        );
      }

      return respond(
        {
          error:
            "Não foi possível salvar a fatura. Nenhum dado foi persistido.",
        },
        500,
        "database_import",
        importError,
      );
    }

    cleanupStagedPdf = undefined;
    return respond({ success: true, fatura }, 200, "completed");

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "";

    if (
      error instanceof GoogleGenerativeAIAbortError ||
      errorMessage.includes("aborted")
    ) {
      return respond(
        {
          error:
            "O processamento da IA excedeu 4 minutos. Nenhum dado foi salvo. Tente novamente.",
        },
        504,
        "ai_timeout",
        error,
      );
    }
    
    if (errorMessage.includes("503 Service Unavailable") || errorMessage.includes("high demand")) {
      return respond(
        { error: "A inteligência artificial está temporariamente indisponível devido à alta demanda. Por favor, tente novamente em alguns instantes." },
        503,
        "ai_processing",
        error,
      );
    }
    
    if (errorMessage.includes("429 Too Many Requests") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
      return respond(
        { error: "O limite de uso (tokens/cota) da inteligência artificial foi atingido. Por favor, tente novamente mais tarde." },
        429,
        "ai_processing",
        error,
      );
    }

    return respond(
      { error: "Ocorreu um erro interno ao processar a fatura. Tente novamente." },
      500,
      "unexpected",
      error,
    );
  }
}
