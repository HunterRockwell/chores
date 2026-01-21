import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Los Angeles date (matches your household)
function getLAISODate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

const dateStr = getLAISODate();
const outDir = path.join(process.cwd(), "daily");
const outFile = path.join(outDir, `${dateStr}.json`);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Don’t overwrite if already created today
if (fs.existsSync(outFile)) {
  console.log(`Already exists: ${outFile}`);
  process.exit(0);
}

const system = `
You generate short daily messages for a private honey-do list app used by four husbands.
Follow the user's instructions exactly.
Output MUST be valid JSON only. No markdown. No extra text.
`.trim();

const user = `
You are generating a single “Daily Message” for a private honey-do list app used by four husbands.

Goal:
Make it attention-grabbing and fresh. It should feel like a confident, slightly unhinged “dad narrator” — funny, sarcastic, a little arrogant, occasionally dramatic — but NOT genuinely hateful, sexual, or cruel.

Hard rules:
- No explicit sex, graphic violence, self-harm, slurs, or bullying a real group of people.
- No threats. No humiliation. No targeted insults about appearance, disability, race, etc.
- Avoid references to drugs or illegal activity.
- No profanity.
- Do not mention OpenAI/ChatGPT or “as an AI”.

Content variety requirement:
Choose exactly ONE category per day, rotating naturally:
1) Dad joke
2) Sarcastic / arrogant “dad wisdom”
3) Dramatic / cinematic motivation
4) Thought-provoking line
5) Did-you-know fact (realistic, broadly true; no obscure medical claims)

Output format:
Return valid JSON ONLY (no markdown, no extra text) with these keys:
{
  "title": "...",
  "message": "...",
  "category": "dad_joke|sarcasm|dramatic|thoughtful|did_you_know"
}

Style notes:
- Title: 3–8 words, punchy.
- Message: 1–3 sentences max.
- Keep it short enough to read in 5–8 seconds.
- It’s okay to be a little spicy in tone, but keep it “family-living-room safe”.
`.trim();

const fallback = {
  title: "Do the chore. Be legendary.",
  message: "The floor isn’t going to clean itself. Sadly, neither is your reputation.",
  category: "sarcasm",
};

const resp = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.9,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: system },
    { role: "user", content: user },
  ],
});

const content = resp.choices?.[0]?.message?.content ?? "{}";

let obj;
try {
  obj = JSON.parse(content);
} catch {
  obj = fallback;
}

const allowedCategories = new Set([
  "dad_joke",
  "sarcasm",
  "dramatic",
  "thoughtful",
  "did_you_know",
]);

const safeTitle =
  String(obj?.title ?? fallback.title)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const safeMessage =
  String(obj?.message ?? fallback.message)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

const rawCategory = String(obj?.category ?? fallback.category).trim();
const safeCategory = allowedCategories.has(rawCategory)
  ? rawCategory
  : fallback.category;

const payload = {
  date: dateStr,
  title: safeTitle || fallback.title,
  message: safeMessage || fallback.message,
  category: safeCategory,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${outFile}`);
