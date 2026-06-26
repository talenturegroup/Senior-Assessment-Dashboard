import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Clean up extracted text by fixing common PDF artifacts and formatting issues.
 * This improves AI extraction accuracy by normalizing spacing, fixing broken
 * line breaks, and removing common PDF extraction noise.
 */
function cleanExtractedText(text: string): string {
  // Replace multiple consecutive spaces with a single space
  let cleaned = text.replace(/[ \t]+/g, " ");

  // Fix broken line breaks within words (common in PDFs)
  // Lines ending with lowercase followed by a line starting with lowercase
  // are likely word breaks
  cleaned = cleaned.replace(/([a-z])\n([a-z])/g, "$1$2");

  // Fix broken line breaks with hyphens
  cleaned = cleaned.replace(/([a-z])-\n([a-z])/g, "$1$2");

  // Normalize multiple newlines to double-newline (paragraph separator)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Remove common PDF artifacts
  cleaned = cleaned.replace(/\f/g, ""); // Form feed characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Control characters except tab/newline

  // Clean up bullet points that may have been mangled
  cleaned = cleaned.replace(/•/g, "• ");
  cleaned = cleaned.replace(/\s*•\s*/g, " • ");

  // Normalize spacing around common punctuation
  cleaned = cleaned.replace(/\s+([.,;:!?)])/g, "$1");
  cleaned = cleaned.replace(/([(\[])\s+/g, "$1");

  // Trim final result
  return cleaned.trim();
}

/**
 * Extract readable text from an uploaded CV/resume file.
 * Supports PDF (pdf.js), DOCX (mammoth) and plain text. Throws on failure so the
 * caller can surface a clear message to the candidate.
 */
export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(text);
    }
    return cleanExtractedText(pages.join("\n"));
  }

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return cleanExtractedText(result.value);
  }

  // .txt and anything else readable as text.
  return cleanExtractedText(await file.text());
}
