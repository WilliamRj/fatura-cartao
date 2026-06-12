import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "node:crypto";
import {
  formatValidationIssues,
  parsedFaturaSchema,
} from "@/lib/ai/fatura-schema";
import { STORAGE } from "@/lib/api/endpoints";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MAX_PDF_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "O PDF deve ter entre 1 byte e 20 MB." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "O arquivo enviado deve ser um PDF." },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key is missing. Add GEMINI_API_KEY to .env.local" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { error: "O conteúdo do arquivo não corresponde a um PDF válido." },
        { status: 400 },
      );
    }
    
    const pdfPart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
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
    } catch {
      console.error("Gemini returned invalid JSON");
      return NextResponse.json(
        {
          error:
            "A IA retornou uma resposta inválida. Nenhum dado foi salvo. Tente importar novamente.",
        },
        { status: 422 },
      );
    }

    const validationResult = parsedFaturaSchema.safeParse(untrustedData);
    if (!validationResult.success) {
      const validationIssues = formatValidationIssues(validationResult.error);
      console.error("Gemini response failed validation", {
        issues: validationIssues,
      });
      return NextResponse.json(
        {
          error:
            "A IA retornou dados inconsistentes. Nenhum dado foi salvo.",
          detalhes: validationIssues,
        },
        { status: 422 },
      );
    }

    const parsedData = validationResult.data;

    const { data: responsaveis, error: responsaveisError } = await supabase
      .from('responsaveis')
      .select('nome, cor')
      .eq('user_id', user.id);

    if (responsaveisError) {
      console.error("Error loading responsaveis:", responsaveisError);
      return NextResponse.json(
        { error: "Não foi possível preparar a importação da fatura." },
        { status: 500 },
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

    const pdfPath = `${user.id}/${randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE.FATURAS)
      .upload(pdfPath, buffer, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading invoice PDF:", uploadError);
      return NextResponse.json(
        { error: "Não foi possível armazenar o PDF da fatura." },
        { status: 500 },
      );
    }

    const { data: fatura, error: importError } = await supabase.rpc(
      "import_fatura_atomically",
      {
        p_mes_referencia: parsedData.mes_referencia,
        p_valor_total: parsedData.valor_total,
        p_data_importacao: new Date().toISOString(),
        p_responsavel: responsavelName,
        p_lancamentos: parsedData.lancamentos,
        p_arquivo_url: pdfPath,
      },
    );

    if (importError) {
      console.error("Error importing fatura atomically:", importError);
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE.FATURAS)
        .remove([pdfPath]);

      if (cleanupError) {
        console.error("Error removing orphaned invoice PDF:", cleanupError);
      }

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar a fatura. Nenhum dado foi persistido.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, fatura });

  } catch (error: unknown) {
    console.error("API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "";
    
    if (errorMessage.includes("503 Service Unavailable") || errorMessage.includes("high demand")) {
      return NextResponse.json({ error: "A inteligência artificial está temporariamente indisponível devido à alta demanda. Por favor, tente novamente em alguns instantes." }, { status: 503 });
    }
    
    if (errorMessage.includes("429 Too Many Requests") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
      return NextResponse.json({ error: "O limite de uso (tokens/cota) da inteligência artificial foi atingido. Por favor, tente novamente mais tarde." }, { status: 429 });
    }

    return NextResponse.json({ error: "Ocorreu um erro interno ao processar a fatura. Tente novamente." }, { status: 500 });
  }
}
