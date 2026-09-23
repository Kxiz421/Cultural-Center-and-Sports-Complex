/**
 * Round-trip check for the announcement body formatter/parser used by the
 * panel inbox. Read-only, no database access.
 * Usage: node scripts/check-announcement-body-format.mjs
 */
import {
  ANNOUNCEMENT_MESSAGE_LABEL,
  ANNOUNCEMENT_TITLE_LABEL,
  formatAnnouncementBody,
  parseAnnouncementBody,
} from "../lib/panel-notifications.js";

let failures = 0;

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}\n        expected ${e}\n        actual   ${a}`);
    failures += 1;
  }
}

console.log("=== Labels ===");
check("title label", ANNOUNCEMENT_TITLE_LABEL, "Title");
check("message label", ANNOUNCEMENT_MESSAGE_LABEL, "Message");

console.log("\n=== formatAnnouncementBody ===");
const formatted = formatAnnouncementBody("Sample title", "Sample Message");
check(
  "exact stored shape",
  formatted,
  "Title : Sample title\n\nMessage : Sample Message"
);

console.log("\n=== parseAnnouncementBody (current shape) ===");
check("round trip", parseAnnouncementBody(formatted), {
  title: "Sample title",
  content: "Sample Message",
});

check(
  "multi-line message preserved",
  parseAnnouncementBody(formatAnnouncementBody("T", "line one\n\nline two")),
  { title: "T", content: "line one\n\nline two" }
);

check(
  "tolerates 'Title:' without space",
  parseAnnouncementBody("Title:NoSpace\n\nMessage:Body"),
  { title: "NoSpace", content: "Body" }
);

check(
  "case insensitive labels",
  parseAnnouncementBody("title : a\n\nmessage : b"),
  { title: "a", content: "b" }
);

check(
  "CRLF bodies",
  parseAnnouncementBody("Title : a\r\n\r\nMessage : b"),
  { title: "a", content: "b" }
);

console.log("\n=== parseAnnouncementBody (legacy '<title>\\n\\n<content>') ===");
check("legacy split", parseAnnouncementBody("Old title\n\nOld body"), {
  title: "Old title",
  content: "Old body",
});

check(
  "legacy single-line body is not split",
  parseAnnouncementBody("Just a plain notification."),
  null
);

check("empty body", parseAnnouncementBody(""), null);
check("null body", parseAnnouncementBody(null), null);

console.log(
  failures === 0 ? "\nOK - all parser checks passed" : `\n${failures} check(s) failed`
);
process.exitCode = failures === 0 ? 0 : 1;
