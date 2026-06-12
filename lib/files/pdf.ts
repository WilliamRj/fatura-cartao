export const MAX_PDF_SIZE = 20 * 1024 * 1024;

const PDF_SIGNATURE = "%PDF-";

export interface ValidatedPdf {
  hash: string;
}

export async function validatePdfFile(file: File): Promise<ValidatedPdf> {
  if (file.size === 0) {
    throw new Error("O arquivo PDF está vazio.");
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error("O PDF deve ter no máximo 20 MB.");
  }

  if (file.type && file.type !== "application/pdf") {
    throw new Error("O tipo real informado pelo arquivo não é PDF.");
  }

  const signature = await file.slice(0, PDF_SIGNATURE.length).text();
  if (signature !== PDF_SIGNATURE) {
    throw new Error("O conteúdo do arquivo não corresponde a um PDF válido.");
  }

  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return { hash };
}
