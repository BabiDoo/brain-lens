export const INGEST_PROMPT = `
You are the Ingest Agent. Analyze this research paper.
Extract the following high-level metadata:
1. Title
2. Authors
3. Abstract Summary (2 sentences max)
4. A rough outline of sections (max 10).
Language: {{LANGUAGE}} (Output content in this language, but keep JSON keys in English).

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "title": "string",
  "authors": ["string"],
  "summary": "string",
  "outline": ["string"]
}
`.trim();

export const COMPOSER_PROMPT = `
You are the Briefing Composer Agent.
Create a high-level 3-slide briefing based on the paper.
Each slide: title + exactly 3 bullet points.
Language: {{LANGUAGE}} (Output content in this language).

Each bullet must include a citation object with:
- page (number) AND/OR sourceId ("Fig 5" / "Table 2")
- a short snippet (<= 160 chars) copied from the paper for grounding

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "slides": [
    {
      "title": "string",
      "points": [
        {
          "text": "string",
          "citation": {
            "page": number,
            "text": "string",
            "sourceId": "string (optional)"
          }
        }
      ]
    }
  ]
}
`.trim();
