import fs from "fs";
import path from "path";

const TIME_ZONE = "America/Los_Angeles";
const DAILY_DIR = path.join(process.cwd(), "daily");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function laNowParts() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = dtf.formatToParts(new Date());
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

async function callOpenAI({ apiKey, prompt }) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
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
      text: { format: { type: "text" } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const json = await res.json();
  const text = json?.output_text?.trim();
  if (!text) throw new Error("OpenAI returned empty output_text");

  // Expect: Title: ...\nMessage: ...
  // But tolerate minor variance.
  let title = "";
  let message = "";

  const titleMatch = text.match(/title\s*:\s*(.+)/i);
  const msgMatch = text.match(/message\s*:\s*([\s\S]+)/i);

  if (titleMatch) title = titleMatch[1].trim();
  if (msgMatch) message = msgMatch[1].trim();

  // Fallback if formatting differs
  if (!title || !message) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    title = lines[0]?.replace(/^[-*]\s*/, "")?.slice(0, 80) || "Daily Note";
    message = lines.slice(1).join(" ").trim() || text;
  }

  return { title, message };
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  ensureDir(DAILY_DIR);

  const { weekday, ymd, hour } = laNowParts();

  // Only generate during the midnight hour in Los Angeles (handles PST/PDT automatically)
  if (hour !== 0) {
    console.log(`Not midnight in ${TIME_ZONE} (hour=${hour}). Exiting.`);
    return;
  }

  const outFile = path.join(DAILY_DIR, `${ymd}.json`);

  // Only generate once per day
  if (fs.existsSync(outFile)) {
    console.log(`Already exists: daily/${ymd}.json. Exiting.`);
    return;
  }

  // Thursday override
  if (isThursday(weekday)) {
    writeJson(outFile, {
      date: ymd,
      type: "trash",
      title: "",
      message: "TAKE TRASH TO ROAD",
    });
    console.log(`Wrote Thursday trash message: daily/${ymd}.json`);
    return;
  }

  if (!apiKey) {
    // If key missing, write a fallback so the UI still has something
    writeJson(outFile, {
      date: ymd,
      type: "normal",
      title: "No API key",
      message: "No wisdom today. That is the lesson.",
    });
    console.log(`OPENAI_API_KEY missing. Wrote fallback: daily/${ymd}.json`);
    return;
  }

  const prompt =
    `Write ONE daily message for ${ymd}.\n` +
    `Output exactly two lines:\n` +
    `Title: <short title>\n` +
    `Message: <1–2 sentences>\n` +
    `Keep it kid-safe but edgy dad humor. No profanity. No politics.`;

  const { title, message } = await callOpenAI({ apiKey, prompt });

  writeJson(outFile, {
    date: ymd,
    type: "normal",
    title,
    message,
  });

  console.log(`Wrote: daily/${ymd}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
