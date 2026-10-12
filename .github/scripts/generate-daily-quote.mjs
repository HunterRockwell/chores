import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";

const TIME_ZONE = "America/Los_Angeles";
const DAILY_DIR = path.join(process.cwd(), "daily");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function laNowParts(now = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });

  const parts = dtf.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  // weekday: Sun Mon Tue Wed Thu Fri Sat
  const weekday = get("weekday");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return {
    weekday,
    ymd: `${year}-${month}-${day}`,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
  };
}

function isThursday(weekdayShort) {
  return weekdayShort === "Thu";
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function extractOutputText(json) {
  if (json.status && json.status !== "completed") throw new Error("OpenAI response was not completed");
  const text = (json.output || []).filter(item => item.type === "message")
    .flatMap(item => item.content || []).filter(item => item.type === "output_text")
    .map(item => item.text || "").join("\n").trim();
  if (!text) throw new Error("OpenAI returned no text");
  return text;
}

async function callOpenAI({ apiKey, prompt, fetchFn = fetch }) {
  const res = await fetchFn("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(45000),
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You write one short daily message for a kid-safe chore app. Tone: edgy dad humor, clever, not crude, no hate, no sex, no drugs. Keep it punchy.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: { format: { type: "json_schema", name: "daily_message", strict: true,
        schema: { type: "object", properties: { title: { type: "string" }, message: { type: "string" } },
          required: ["title", "message"], additionalProperties: false } } },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed (HTTP ${res.status})`);
  }

  const json = await res.json();
  const text = extractOutputText(json);

  const result = JSON.parse(text);
  if (typeof result.title !== "string" || typeof result.message !== "string") throw new Error("Invalid daily message");
  const title = result.title.trim();
  const message = result.message.trim();
  if (!title || !message || title.length > 100 || message.length > 800) throw new Error("Invalid daily message length");
  return { title, message };
}

export function validateDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error("Date must be YYYY-MM-DD");
  const d = new Date(`${ymd}T12:00:00Z`);
  if (isNaN(d) || d.toISOString().slice(0, 10) !== ymd) throw new Error("Invalid calendar date");
  return d;
}

export async function main({ env = process.env, now = new Date(), dailyDir = DAILY_DIR, fetchFn = fetch } = {}) {
  const apiKey = env.OPENAI_API_KEY;
  const parts = laNowParts(now);
  const manual = env.GITHUB_EVENT_NAME === "workflow_dispatch";
  const ymd = manual && env.TARGET_DATE ? env.TARGET_DATE : parts.ymd;
  const date = validateDate(ymd);
  const regenerate = manual && env.REGENERATE === "true";
  // Scheduled hourly runs catch up after a delayed/missed midnight run, once per date.
  const outFile = path.join(dailyDir, `${ymd}.json`);
  if (fs.existsSync(outFile) && !regenerate) {
    console.log(`Already exists: daily/${ymd}.json. Exiting.`);
    return;
  }
  ensureDir(dailyDir);
  if (date.getUTCDay() === 4) {
    if (regenerate) throw new Error("Thursday content cannot be regenerated");
    const anchor = Date.UTC(2026, 1, 19, 12);
    const recycle = ((date.getTime() - anchor) / 86400000) % 14 === 0;
    writeJson(outFile, { date: ymd, type: "trash", title: "",
      message: "TAKE TRASH TO ROAD" + (recycle ? " AND RECYCLE CAN" : "") });
    return;
  }
  // Fail visibly and retain any previous content; never commit a missing-key fallback.
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for non-Thursday content");
  const categories = ["dad joke", "inspiration", "fun fact"];
  const category = categories[Math.floor(date.getTime() / 86400000) % categories.length];
  const prompt =
    `Write ONE daily message for ${ymd}.\n` +
    `Return a plain-text short title and a 1–2 sentence message in the required JSON format. No markdown or category labels.\n` +
    `Category: ${category}. Witty, edgy and/or inspiring. Keep it kid-safe. No profanity. No politics. Fun facts must be accurate.`;

  const { title, message } = await callOpenAI({ apiKey, prompt, fetchFn });

  writeJson(outFile, {
    date: ymd,
    type: "normal",
    category,
    generated_at: now.toISOString(),
    title,
    message,
  });

  console.log(`Wrote: daily/${ymd}.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exitCode = 1; });
}
