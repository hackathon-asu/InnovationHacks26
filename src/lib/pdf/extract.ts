import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const buffer = await readFile(pdfPath);
  const data = await pdf(buffer);
  return data.text;
}

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}
