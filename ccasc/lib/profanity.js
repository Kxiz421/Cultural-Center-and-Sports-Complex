/**
 * Username safety check — rejects offensive words (English and common Filipino
 * profanity). Kept dependency-free so both the API route and any client screen
 * can use it.
 *
 * Matching is done on whole words (or whole phrases) after splitting the input
 * on anything that is not a letter or number, so "classic" does not trip on
 * "ass" but "ass_hole" and "putangina" do.
 */

const OFFENSIVE_WORDS = [
  // English
  "asshole", "bastard", "bitch", "bollocks", "bullshit", "cunt", "dickhead",
  "douchebag", "faggot", "fuck", "fucker", "fucking", "motherfucker", "nazi",
  "prick", "pussy", "rape", "retard", "shit", "shithead", "slut", "twat",
  "wanker", "whore", "porn", "dildo", "penis", "vagina", "boobs", "nigga",
  "nigger", "sex",
  // Filipino / Tagalog
  "gago", "gaga", "bobo", "boba", "tanga", "tangina", "putangina", "putang ina",
  "tang ina", "punyeta", "ulol", "tarantado", "tarantada", "lintik",
  "hinayupak", "hayup", "kingina", "king ina", "pokpok", "burat", "titi",
  "pekpek", "bayag", "pakyu", "pakyo", "ungas", "unggoy",
];

/** Lowercase and split into space-separated alphanumeric tokens. */
function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Returns the first offensive word/phrase found in `text`, or null.
 * @param {string} text
 * @returns {string|null}
 */
export function findOffensiveWord(text) {
  const normalized = normalize(text);
  if (!normalized) return null;
  const padded = ` ${normalized} `;

  for (const word of OFFENSIVE_WORDS) {
    const needle = normalize(word);
    if (needle && padded.includes(` ${needle} `)) return word;
  }
  return null;
}

/**
 * Validate a username. Returns an error message, or null when it is acceptable.
 * @param {string} username
 */
export function usernameProblem(username) {
  const value = String(username ?? "").trim();
  if (!value) return "Enter a username.";
  if (value.length > 100) return "Username must be 100 characters or fewer.";
  if (findOffensiveWord(value)) {
    return "That username contains a word that isn't allowed. Please choose another.";
  }
  return null;
}
