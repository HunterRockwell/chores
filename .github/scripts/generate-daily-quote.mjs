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
You write "edgy dad humor" that is still kid-safe for ages 10–18.
Rules:
- No profanity.
- No sexual content.
- No drug references.
- No hate/harassment.
- No bullying a specific kid; jokes must be general and playful.
- Keep it short and punchy.
Output must be valid JSON with keys: title, message.
`;

const user = `
Generate ONE "Daily Dad Drop" for a household chore app.
Funny, attention-grabbing, loosely tied to chores/discipline/teamwork.
Length:
- title: max 6 words
- message: 1–2 sentences, max 200 characters
`;

const resp = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.9,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: system.trim() },
    { role: "user", content: user.trim() },
  ],
});

const content = resp.choices?.[0]?.message?.content ?? "{}";
let obj;
try {
  obj = JSON.parse(content);
} catch {
  obj = { title: "Daily Dad Drop", message: "Do the chore. Earn the glory." };
}

const payload = {
  date: dateStr,
  title: String(obj.title || "Daily Dad Drop").slice(0, 60),
  message: String(obj.message || "").slice(0, 240),
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${outFile}`);
