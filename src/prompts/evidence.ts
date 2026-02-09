export const FIGURE_TABLE_PROMPT = `
You are the Evidence Agent. Scan the paper for Figures and Tables.
For each, provide:
1. id (e.g., "Fig 1", "Table 2")
2. type ("figure" or "table")
3. caption (exact text)
4. description (what does it show? 1 sentence)
5. page (integer page number)
6. relevance (why it matters? 1 sentence)
Language: {{LANGUAGE}} (Output content in this language, but keep JSON keys in English).

Limit to the most important 8 items.
Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "items": [
    {
      "id": "string",
      "type": "figure" | "table",
      "caption": "string",
      "description": "string",
      "page": number,
      "relevance": "string"
    }
  ]
}
`.trim();

export const CLAIM_PROMPT = `
You are the Claim Extraction Agent. Extract the 5 most critical scientific findings from this paper.
Language: {{LANGUAGE}} (Output content in this language, but keep JSON keys in English).

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "claims": [
    {
      "text": "string",
      "topic": "string"
    }
  ]
}
`.trim();
