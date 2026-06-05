import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key is missing. Add GEMINI_API_KEY to .env.local" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const pdfPart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
    const prompt = `
      You are a helpful assistant that processes credit card invoices from Banco Itaú in Brazil.
      I have attached the PDF invoice.
      
      You need to find:
      1. 'mes_referencia': The month and year of the invoice, based on the 'Emissão' (Issue) date. 
         Example: If Emissão is 30/05/2026, the mes_referencia is 'Maio 2026'.
      2. 'valor_total': The total value of the invoice as a float number.
      3. 'lancamentos': A list of all purchases/expenses in the invoice. 
         IMPORTANT: Include all items listed under "Lançamentos", specifically including items under "produtos e serviços".
         CRITICAL: You must completely IGNORE and DISCARD any entry that contains "crédito parcelamento" in its description.
         Ignore payments of the previous invoice and fees/taxes if possible, focus on purchases. For each, extract:
         - 'data': The date of the purchase in YYYY-MM-DD format. Use the invoice year if not specified.
         - 'estabelecimento': The name of the place/store.
         - 'valor': The value of the purchase as a float number.
         - 'parcela': If it's an installment, like '01/10', put it here as a string. Otherwise, use null.
         - 'categoria': Infer a general category based on the establishment name (e.g., 'Alimentacao', 'Transporte', 'Saude', 'Educacao', 'Compras', 'Assinaturas', 'Entretenimento', 'Outros').

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

    let parsedData;
    try {
      parsedData = JSON.parse(textResult.trim());
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", textResult);
      return NextResponse.json({ error: "Failed to understand AI output" }, { status: 500 });
    }

    const { data: fatura, error: faturaError } = await supabase
      .from('faturas')
      .insert({
        user_id: user.id,
        mes_referencia: parsedData.mes_referencia,
        valor_total: parsedData.valor_total,
        quantidade_lancamentos: parsedData.lancamentos.length,
        data_importacao: new Date().toISOString(),
      })
      .select()
      .single();

    if (faturaError) {
      console.error("Error inserting fatura:", faturaError);
      return NextResponse.json({ error: "Failed to save fatura" }, { status: 500 });
    }

    const { data: responsaveis } = await supabase
      .from('responsaveis')
      .select('nome, cor')
      .eq('user_id', user.id);
      
    let responsavelName = "Não definido";
    if (responsaveis && responsaveis.length > 0) {
      const principal = responsaveis.find(r => r.cor === 'pessoal');
      if (principal) {
        responsavelName = principal.nome;
      } else {
        responsavelName = responsaveis[0].nome;
      }
    }

    const gastosToInsert = parsedData.lancamentos.map((l: any) => ({
      user_id: user.id,
      fatura_id: fatura.id,
      data: l.data,
      estabelecimento: l.estabelecimento,
      valor: l.valor,
      parcela: l.parcela,
      categoria: l.categoria,
      responsavel: responsavelName,
    }));

    if (gastosToInsert.length > 0) {
      const { error: gastosError } = await supabase
        .from('gastos')
        .insert(gastosToInsert);
        
      if (gastosError) {
        console.error("Error inserting gastos:", gastosError);
        return NextResponse.json({ error: "Failed to save gastos" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, fatura });

  } catch (error: any) {
    console.error("API error:", error);
    
    const errorMessage = error?.message || "";
    
    if (errorMessage.includes("503 Service Unavailable") || errorMessage.includes("high demand")) {
      return NextResponse.json({ error: "A inteligência artificial está temporariamente indisponível devido à alta demanda. Por favor, tente novamente em alguns instantes." }, { status: 503 });
    }
    
    if (errorMessage.includes("429 Too Many Requests") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
      return NextResponse.json({ error: "O limite de uso (tokens/cota) da inteligência artificial foi atingido. Por favor, tente novamente mais tarde." }, { status: 429 });
    }

    return NextResponse.json({ error: "Ocorreu um erro interno ao processar a fatura. Tente novamente." }, { status: 500 });
  }
}