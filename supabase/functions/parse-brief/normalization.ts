import type { NormalizedParserBundle, ParserInputBundle } from "./types.ts";

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function normalizeParserBundle(
  input: ParserInputBundle
): NormalizedParserBundle {
  const briefText = cleanText(input.briefText);
  const ocrText = cleanText(input.ocrText);
  const voiceTranscript = cleanText(input.voiceTranscript);
  const attachmentSummary = cleanText(input.attachmentSummary);

  return {
    ...input,
    briefText,
    ocrText,
    voiceTranscript,
    attachmentSummary,
    combinedText: [
      briefText ? `Typed brief:\n${briefText}` : "",
      ocrText ? `OCR text:\n${ocrText}` : "",
      voiceTranscript ? `Voice transcript:\n${voiceTranscript}` : "",
      attachmentSummary ? `Attachment summary:\n${attachmentSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
