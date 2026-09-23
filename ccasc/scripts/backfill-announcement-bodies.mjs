/**
 * One-off backfill for announcement notification bodies.
 *
 * Rewrites legacy bodies ("<title>\n\n<message>") into the labelled shape the
 * panel inbox renders ("Title : <title>\n\nMessage : <message>").
 *
 * Idempotent: rows that already carry the labels are left alone, so re-running
 * is a no-op. Conservative: a row is only rewritten when the legacy shape is
 * unambiguous (single-line first paragraph + non-empty remainder).
 *
 * Usage:
 *   node --env-file=.env scripts/backfill-announcement-bodies.mjs           # dry run
 *   node --env-file=.env scripts/backfill-announcement-bodies.mjs --apply   # write
 */
import { PrismaClient } from "@prisma/client";
import {
  ANNOUNCEMENT_MESSAGE_LABEL,
  ANNOUNCEMENT_TITLE_LABEL,
  formatAnnouncementBody,
} from "../lib/panel-notifications.js";

const prisma = new PrismaClient();

/** Mirrors ANNOUNCEMENT_NOTIFICATION_TYPE from lib/announcements.js. */
const NOTIFICATION_TYPE = "Announcement";
const APPLY = process.argv.includes("--apply");

const TITLE_PREFIX = `${ANNOUNCEMENT_TITLE_LABEL} :`;
const MESSAGE_PREFIX = `${ANNOUNCEMENT_MESSAGE_LABEL} :`;

/** The Railway proxy drops connections now and then - retry a few times. */
async function db(label, fn, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`${label} attempt ${attempt} failed; retrying...`);
      await prisma.$disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return undefined;
}

const rows = await db("fetch announcement notifications", () =>
  prisma.notification.findMany({
    where: { type: NOTIFICATION_TYPE },
    select: { notificationId: true, message: true },
    orderBy: { notificationId: "asc" },
  })
);

let alreadyLabelled = 0;
let converted = 0;
const skipped = [];

for (const row of rows) {
  const raw = String(row.message ?? "");
  const text = raw.replace(/\r\n/g, "\n").trim();

  if (text.startsWith(TITLE_PREFIX)) {
    alreadyLabelled += 1;
    continue;
  }

  const splitAt = text.search(/\n\s*\n/);
  if (splitAt === -1) {
    skipped.push({ id: row.notificationId, reason: "no blank-line separator" });
    continue;
  }

  const title = text.slice(0, splitAt).trim();
  let content = text.slice(splitAt).trim();

  if (!title || !content) {
    skipped.push({ id: row.notificationId, reason: "empty title or message" });
    continue;
  }
  if (title.includes("\n")) {
    skipped.push({ id: row.notificationId, reason: "multi-line title" });
    continue;
  }

  // Guard against double-labelling a half-converted body.
  if (content.toLowerCase().startsWith(MESSAGE_PREFIX.toLowerCase())) {
    content = content.slice(MESSAGE_PREFIX.length).trim();
  }

  const next = formatAnnouncementBody(title, content);

  if (APPLY) {
    await db(`update ${row.notificationId}`, () =>
      prisma.notification.update({
        where: { notificationId: row.notificationId },
        data: { message: next },
      })
    );
  }

  converted += 1;
  if (converted <= 3) {
    console.log(`\n${APPLY ? "UPDATED" : "WOULD UPDATE"} #${row.notificationId}`);
    console.log(JSON.stringify(next));
  }
}

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "apply" : "dry-run",
      totalAnnouncementNotifications: rows.length,
      alreadyLabelled,
      converted,
      skipped: skipped.length,
    },
    null,
    2
  )
);

if (skipped.length > 0) {
  console.log("skipped rows:");
  for (const row of skipped) {
    console.log(`  #${row.id} - ${row.reason}`);
  }
}

await prisma.$disconnect();
