/**
 * Regression check for lib/password-reset-scope.js and the password-reset route.
 *
 * Guards the bug where "Password reset successful" was shown but the new
 * password never worked: the reset endpoints resolved the account Client-first
 * while the login provider (auth.js) resolves Staff-first, so an email present
 * in BOTH the Staff and Client tables had its new password written to the row
 * login never authenticates.
 *
 * It needs no database: `@/lib/prisma` is replaced with an in-memory fake of
 * the two tables, and the Next.js-only imports are stubbed the same way. The
 * last scenario drives the real route handlers with POST -> PATCH -> PUT.
 *
 * Run: npm run verify:password-reset
 */

import { register } from "node:module";
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";

process.env.AUTH_SECRET ||= "verify-password-reset-secret";

/* -------------------------------------------------------------------------
 * Module stubs.
 *
 * `@/lib/prisma` becomes an in-memory fake of the Staff / Client tables so
 * both the helper and the real route handlers can run without a database.
 * The Next.js-only imports the route pulls in are stubbed the same way.
 * Must be registered before anything under test is imported.
 * ---------------------------------------------------------------------- */

const PRISMA_STUB = [
  "const store = { staff: [], client: [] };",
  "function findUnique(rows, where) {",
  "  const row = rows.find((r) =>",
  "    (where.email !== undefined && r.email === where.email) ||",
  "    (where.username !== undefined && r.username === where.username)",
  "  );",
  "  return row ? { ...row } : null;",
  "}",
  "function findManyByContact(rows, forms, take) {",
  "  const wanted = forms || [];",
  "  return rows",
  "    .filter((r) => wanted.includes(r.contactNumber))",
  "    .slice(0, take || 2)",
  "    .map((r) => ({ ...r }));",
  "}",
  "function update(rows, idKey, where, data) {",
  "  const row = rows.find((r) => r[idKey] === where[idKey]);",
  "  if (!row) throw new Error('missing ' + idKey);",
  "  Object.assign(row, data);",
  "  return row;",
  "}",
  "const prisma = {",
  "  staff: {",
  "    findUnique: async ({ where }) => findUnique(store.staff, where),",
  "    findMany: async ({ where, take }) => findManyByContact(store.staff, where?.contactNumber?.in, take),",
  "    update: async ({ where, data }) => update(store.staff, 'staffId', where, data),",
  "  },",
  "  client: {",
  "    findUnique: async ({ where }) => findUnique(store.client, where),",
  "    findMany: async ({ where, take }) => findManyByContact(store.client, where?.contactNumber?.in, take),",
  "    update: async ({ where, data }) => update(store.client, 'clientId', where, data),",
  "  },",
  "};",
  "export const __store = store;",
  "export default prisma;",
].join("\n");

const MODULE_STUBS = {
  "@/lib/prisma": PRISMA_STUB,
  "@/lib/email": [
    "globalThis.__otpSends = [];",
    "export const sendOtpEmail = async (to, otp) => {",
    "  globalThis.__otpSends.push({ to, otp });",
    "  return true;",
    "};",
    "export const maskEmail = (value) => {",
    "  const email = String(value ?? '').trim();",
    "  const at = email.indexOf('@');",
    "  if (at <= 0) return '';",
    "  const local = email.slice(0, at);",
    "  const domain = email.slice(at);",
    "  const visible = local.slice(0, 2);",
    "  return visible + String.fromCharCode(8226).repeat(Math.max(local.length - visible.length, 1)) + domain;",
    "};",
  ].join("\n"),
  "@/lib/firebase-admin": [
    "globalThis.__firebaseConfigured = true;",
    "globalThis.__firebaseTokens = new Map();",
    "export const isFirebaseConfigured = () => globalThis.__firebaseConfigured === true;",
    "export const verifyFirebaseIdToken = async (idToken) => {",
    "  const phoneNumber = globalThis.__firebaseTokens.get(idToken);",
    "  return phoneNumber ? { phoneNumber } : null;",
    "};",
  ].join("\n"),
  "@/lib/rate-limit": [
    "export const checkOtpSendCooldown = () => ({ allowed: true });",
    "export const checkOtpVerifyRateLimit = () => ({ allowed: true });",
    "export const checkPasswordResetRateLimit = () => ({ allowed: true });",
    "export const clearOtpSend = () => {};",
    "export const clearOtpVerifyAttempts = () => {};",
    "export const getClientIP = () => '127.0.0.1';",
    "export const recordOtpSend = () => {};",
    "export const recordOtpVerifyFailure = () => {};",
    "export const recordPasswordReset = () => {};",
  ].join("\n"),
  "next/server": [
    "export const NextResponse = {",
    "  json: (body, init) => ({ body, status: (init && init.status) || 200 }),",
    "};",
  ].join("\n"),
};

const stubUrls = Object.fromEntries(
  Object.entries(MODULE_STUBS).map(([specifier, source]) => [
    specifier,
    `data:text/javascript,${encodeURIComponent(source)}`,
  ]),
);

// Project root, used to honour the `@/*` path alias from jsconfig.json for any
// import that is NOT stubbed (e.g. `@/lib/password-reset-scope`).
const projectRootUrl = new URL("../", import.meta.url).href;

const hooksSource = [
  'import { existsSync } from "node:fs";',
  `const stubs = ${JSON.stringify(stubUrls)};`,
  `const root = ${JSON.stringify(projectRootUrl)};`,
  "export async function resolve(specifier, context, next) {",
  "  if (Object.prototype.hasOwnProperty.call(stubs, specifier)) {",
  "    return { url: stubs[specifier], shortCircuit: true };",
  "  }",
  '  if (specifier.startsWith("@/")) {',
  '    const base = new URL(specifier.slice(2), root);',
  "    for (const candidate of [",
  "      base,",
  '      new URL(base.href + ".js"),',
  '      new URL(base.href + "/index.js"),',
  "    ]) {",
  '      if (candidate.protocol === "file:" && existsSync(candidate)) {',
  '        return { url: candidate.href, format: "module", shortCircuit: true };',
  "      }",
  "    }",
  "  }",
  "  return next(specifier, context);",
  "}",
].join("\n");

register(`data:text/javascript,${encodeURIComponent(hooksSource)}`);

const { resolvePasswordResetAccount, updatePasswordResetAccount } = await import(
  new URL("../lib/password-reset-scope.js", import.meta.url).href
);

// The same stub instance the helper and the route handlers see.
const { __store: prismaStore } = await import("@/lib/prisma");

/** Point the stub database at a fresh set of rows before each scenario. */
function seed({ staff = [], client = [] } = {}) {
  prismaStore.staff = staff;
  prismaStore.client = client;
  (globalThis.__otpSends ||= []).length = 0;
  globalThis.__firebaseConfigured = true;
  (globalThis.__firebaseTokens ||= new Map()).clear();
  return { staff: prismaStore.staff, client: prismaStore.client };
}

/**
 * Login precedence exactly as auth.js implements it: Staff is looked up before
 * Client. Returns the row login would authenticate for this email.
 */
function loginRowFor(tables, email) {
  return (
    tables.staff.find((r) => r.email === email) ??
    tables.client.find((r) => r.email === email) ??
    null
  );
}

let failures = 0;
function check(label, ok, detail) {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` - ${detail}` : ""}`);
  }
}

const SHARED = "kxiz21@example.com";
const NEW_PASSWORD = "BrandNew1!";

/** PUT-style flow: resolve the account, then write the new password to it. */
async function runResetFlow({ email, newPassword }) {
  const account = await resolvePasswordResetAccount(email);
  await updatePasswordResetAccount(account, {
    password: await bcrypt.hash(newPassword, 10),
    otp: null,
    otpExpiration: null,
  });
  return { account };
}

/* -------------------------------------------------------------------------
 * Checks
 * ---------------------------------------------------------------------- */

/* 1. The reported bug: one email, two accounts -------------------------- */
async function scenarioBothTables() {
  console.log("\n1. Email present in BOTH Staff and Client (the reported bug)");

  const tables = seed({
    staff: [
      {
        staffId: 11,
        email: SHARED,
        password: await bcrypt.hash("OldStaff1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
    client: [
      {
        clientId: 6,
        email: SHARED,
        password: await bcrypt.hash("OldClient1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const { result, warnings } = await mutedWarnings(() =>
    runResetFlow({ email: SHARED, newPassword: NEW_PASSWORD }),
  );
  const account = result.account;

  check(
    "resolves the Staff account, matching auth.js precedence",
    account?.userType === "staff",
    `got ${account?.userType}`,
  );
  check("resolves Staff row #11", account?.id === 11, `got #${account?.id}`);
  check(
    "login (auth.js order) accepts the new password",
    await bcrypt.compare(NEW_PASSWORD, loginRowFor(tables, SHARED).password),
  );
  check(
    "the shadowed Client row was left untouched",
    await bcrypt.compare("OldClient1!", tables.client[0].password),
  );
  check(
    "a duplicate-email warning was emitted for cleanup",
    warnings.some((w) => w.includes("exists in both Staff")),
  );
}

/* 2. Regression proof: the old Client-first order left login broken ----- */
async function scenarioClientFirstIsBroken() {
  console.log("\n2. Regression proof: Client-first order leaves login broken");

  const tables = seed({
    staff: [
      {
        staffId: 11,
        email: SHARED,
        password: await bcrypt.hash("OldStaff1!", 10),
      },
    ],
    client: [
      {
        clientId: 6,
        email: SHARED,
        password: await bcrypt.hash("OldClient1!", 10),
      },
    ],
  });

  // Reproduce the pre-fix behaviour: the reset wrote to the Client row.
  tables.client[0].password = await bcrypt.hash(NEW_PASSWORD, 10);

  check(
    "login still rejects the new password when the Client row is written",
    (await bcrypt.compare(NEW_PASSWORD, loginRowFor(tables, SHARED).password)) ===
      false,
  );
  check(
    "the Client row did receive it (which made the reset report success)",
    await bcrypt.compare(NEW_PASSWORD, tables.client[0].password),
  );
}

/* 3. Single-account emails still work ----------------------------------- */
async function scenarioClientOnly() {
  console.log("\n3. Single-account emails are unaffected");

  const email = "keypii123@gmail.com";
  const tables = seed({
    staff: [],
    client: [
      {
        clientId: 27,
        email,
        password: await bcrypt.hash("OldClient1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const { account } = await runResetFlow({ email, newPassword: NEW_PASSWORD });
  check(
    "client-only email resolves the Client row",
    account?.userType === "client" && account?.id === 27,
  );
  check(
    "login accepts the new password",
    await bcrypt.compare(NEW_PASSWORD, loginRowFor(tables, email).password),
  );
}

async function scenarioStaffOnly() {
  const email = "pcsc@gmail.com";
  const tables = seed({
    staff: [
      {
        staffId: 19,
        email,
        password: await bcrypt.hash("OldStaff1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
    client: [],
  });

  const { account } = await runResetFlow({ email, newPassword: NEW_PASSWORD });
  check(
    "staff-only email resolves the Staff row",
    account?.userType === "staff" && account?.id === 19,
  );
  check(
    "login accepts the new password",
    await bcrypt.compare(NEW_PASSWORD, loginRowFor(tables, email).password),
  );
}

/** Run `fn` with console.warn captured, so duplicate-email noise is asserted. */
async function mutedWarnings(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    const result = await fn();
    return { result, warnings };
  } finally {
    console.warn = original;
  }
}

/* 4. POST / PATCH / PUT must agree on the row --------------------------- */
async function scenarioHandlersAgree() {
  console.log("\n4. POST, PATCH and PUT resolve the same account");

  const tables = seed({
    staff: [
      { staffId: 11, email: SHARED, password: "hash", otp: null, otpExpiration: null },
    ],
    client: [
      { clientId: 6, email: SHARED, password: "hash", otp: null, otpExpiration: null },
    ],
  });
  const sentOtp = "123456";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await mutedWarnings(async () => {
    // POST stores the code...
    const posted = await resolvePasswordResetAccount(SHARED);
    await updatePasswordResetAccount(posted, {
      otp: sentOtp,
      otpExpiration: expiresAt,
    });

    // ...PATCH and PUT read it back through the same resolver.
    const patched = await resolvePasswordResetAccount(SHARED);
    const put = await resolvePasswordResetAccount(SHARED);

    check(
      "PATCH sees the code POST stored",
      patched?.otp === sentOtp,
      `got ${patched?.otp}`,
    );
    check(
      "PUT sees the same account as PATCH",
      put?.userType === patched?.userType && put?.id === patched?.id,
    );
  });

  check("the code landed on the Staff row", tables.staff[0].otp === sentOtp);
  check("the Client row keeps no code", tables.client[0].otp === null);
}

/* 5. Unknown email ------------------------------------------------------ */
async function scenarioUnknownEmail() {
  console.log("\n5. Unknown email resolves to null");

  seed({ staff: [], client: [] });
  const account = await resolvePasswordResetAccount("nobody@example.com");
  check("returns null so the route can answer 404", account === null);
}

/* -------------------------------------------------------------------------
 * 6. End-to-end through the REAL route handlers.
 *
 * `app/api/auth/password-reset/route.js` is imported directly and driven with
 * real POST -> PATCH -> PUT requests, so this exercises the shipped code path
 * (NextResponse and the Next.js-only imports are stubbed above) and proves the
 * new password ends up on the row auth.js authenticates.
 * ---------------------------------------------------------------------- */

const { POST, PATCH, PUT } = await import(
  new URL("../app/api/auth/password-reset/route.js", import.meta.url).href
);

const request = (body) => ({ json: async () => body });
const status = (response) => response.status;

async function scenarioRouteEndToEnd() {
  console.log("\n6. Real POST -> PATCH -> PUT against the route handlers");

  const tables = seed({
    staff: [
      {
        staffId: 11,
        email: SHARED,
        password: await bcrypt.hash("OldStaff1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
    client: [
      {
        clientId: 6,
        email: SHARED,
        password: await bcrypt.hash("OldClient1!", 10),
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const { result: posted, warnings } = await mutedWarnings(() =>
    POST(request({ identifier: SHARED })),
  );

  check("POST answers 200", status(posted) === 200, `got ${status(posted)}`);
  check(
    "POST sent exactly one code, to the requesting address",
    globalThis.__otpSends.length === 1 && globalThis.__otpSends[0].to === SHARED,
    `got ${JSON.stringify(globalThis.__otpSends)}`,
  );
  check(
    "the duplicate-email warning reaches the server log",
    warnings.some((w) => w.includes("exists in both Staff")),
  );

  // POST generated the code server-side; read it off the row the reset targets.
  const codeOnTargetRow = tables.staff[0].otp;
  check(
    "POST wrote the recovery code to the Staff row",
    /^\d{6}$/.test(String(codeOnTargetRow)),
    `got ${codeOnTargetRow}`,
  );
  check("POST left the shadowed Client row alone", tables.client[0].otp === null);

  const wrong = await mutedWarnings(() =>
    PATCH(request({ identifier: SHARED, otp: "000001" })),
  );
  check(
    "PATCH rejects a wrong code with 400",
    status(wrong.result) === 400,
    `got ${status(wrong.result)}`,
  );

  const patched = await mutedWarnings(() =>
    PATCH(request({ identifier: SHARED, otp: codeOnTargetRow })),
  );
  check(
    "PATCH accepts the emailed code",
    status(patched.result) === 200,
    `got ${status(patched.result)}`,
  );

  const put = await mutedWarnings(() =>
    PUT(request({ identifier: SHARED, otp: codeOnTargetRow, newPassword: NEW_PASSWORD })),
  );
  check("PUT succeeds and reports success", status(put.result) === 200, `got ${status(put.result)}`);
  check(
    "PUT answered with the success message the UI toasts",
    put.result.body?.message === "Password reset successful",
    `got ${JSON.stringify(put.result.body)}`,
  );
  check(
    "PUT cleared the OTP fields on the Staff row",
    tables.staff[0].otp === null && tables.staff[0].otpExpiration === null,
  );

  const authenticated = loginRowFor(tables, SHARED);
  check(
    "login (auth.js order) now accepts the new password",
    await bcrypt.compare(NEW_PASSWORD, authenticated.password),
  );
  check(
    "the shadowed Client row keeps its old password",
    await bcrypt.compare("OldClient1!", tables.client[0].password),
  );


  // The old password must be gone from the row that changed.
  check(
    "the old Staff password no longer works",
    (await bcrypt.compare("OldStaff1!", tables.staff[0].password)) === false,
  );
}

/* -------------------------------------------------------------------------
 * 7. Unknown email is rejected BEFORE a code is generated or sent.
 *
 * This is the "check for an existing email before sending a code" guarantee:
 * the route must answer 404 and must not call sendOtpEmail, so the UI never
 * advances to the OTP input for an address that has no account.
 * ---------------------------------------------------------------------- */
async function scenarioUnknownEmailSendsNoCode() {
  console.log("\n7. POST for an unknown email sends no code (404)");

  const tables = seed({ staff: [], client: [] });

  const padded = await POST(request({ identifier: "  nobody@example.com  " }));
  check(
    "POST answers 404 for an unknown email (even padded)",
    status(padded) === 404,
    `got ${status(padded)}`,
  );
  check(
    "no OTP email was sent for an unknown email",
    globalThis.__otpSends.length === 0,
    `got ${globalThis.__otpSends.length}`,
  );
  check(
    "no account row was written",
    tables.staff.length === 0 && tables.client.length === 0,
  );
}

/* -------------------------------------------------------------------------
 * 8. Every user type completes the reset and can then sign in.
 *
 * The reset resolves by TABLE (staff vs client), so every staff role takes the
 * same path and both client roles take the same path. This drives the real
 * route handlers once per type to prove that still holds for all of them:
 *   - Staff: Admin, Accounting Clerk, Program Coordinator (x2), LTOO
 *   - Client: Public Client, Provincial Government
 * ---------------------------------------------------------------------- */
async function scenarioAllUserTypes() {
  console.log("\n8. Every user type completes POST -> PATCH -> PUT and signs in");

  const cases = [
    { label: "Staff / Admin", kind: "staff", id: 1, email: "admin@scgcc.gov.ph" },
    { label: "Staff / Accounting Clerk", kind: "staff", id: 3, email: "clerk@scgcc.gov.ph" },
    { label: "Staff / Program Coordinator (Sports)", kind: "staff", id: 2, email: "coordinator@scgcc.gov.ph" },
    { label: "Staff / Program Coordinator (Cultural)", kind: "staff", id: 5, email: "ana.gonzales@scgcc.gov.ph" },
    { label: "Staff / Local Treasury Operations Officer", kind: "staff", id: 4, email: "ltoo@scgcc.gov.ph" },
    { label: "Client / Public Client", kind: "client", id: 2, email: "beatriz@email.com" },
    { label: "Client / Provincial Government", kind: "client", id: 1, email: "carlo@email.com" },
  ];

  for (const c of cases) {
    const base = { email: c.email, password: "old-hash", otp: null, otpExpiration: null };
    const tables =
      c.kind === "staff"
        ? seed({ staff: [{ ...base, staffId: c.id }], client: [] })
        : seed({ staff: [], client: [{ ...base, clientId: c.id }] });

    const newPassword = `New${c.kind}${c.id}Pw1!`;

    const posted = await POST(request({ identifier: c.email }));
    const codeOnRow =
      c.kind === "staff" ? tables.staff[0].otp : tables.client[0].otp;

    const patched = await PATCH(request({ identifier: c.email, otp: codeOnRow }));
    const put = await PUT(
      request({ identifier: c.email, otp: codeOnRow, newPassword }),
    );

    const loginRow = loginRowFor(tables, c.email);

    check(
      `${c.label}: POST/PATCH/PUT all 200 and one code emailed`,
      status(posted) === 200 &&
        status(patched) === 200 &&
        status(put) === 200 &&
        globalThis.__otpSends.length === 1,
      `POST ${status(posted)}, PATCH ${status(patched)}, PUT ${status(put)}, sends ${globalThis.__otpSends.length}`,
    );
    check(
      `${c.label}: signs in with the new password`,
      await bcrypt.compare(newPassword, loginRow.password),
    );
  }
}

/* -------------------------------------------------------------------------
 * 9-15. Single identifier (email / username / mobile) + Firebase phone reset.
 *
 * Resolution mirrors login (email, then username, Staff before Client) and
 * falls back to the mobile number, which login does not accept. The lookup
 * must only ever reveal masked channels, and Firebase only proves control of a
 * phone number - so `firebase-verify` must refuse a verified number that is
 * not the one stored on the identified account, and the ticket it returns must
 * be signed, account-bound and short-lived.
 * ---------------------------------------------------------------------- */

const SMS_PHONE = "09171234567";
const SMS_E164 = "+639171234567";
const SMS_MASKED = "09•••4567";
const CLIENT_EMAIL = "keypii123@gmail.com";

const { toE164Ph } = await import(
  new URL("../lib/phone.js", import.meta.url).href
);

const lookup = (identifier) => POST(request({ action: "lookup", identifier }));
const sendEmail = (identifier) =>
  POST(request({ action: "send", identifier, channel: "email" }));
const firebaseVerify = (identifier, idToken) =>
  POST(request({ action: "firebase-verify", identifier, idToken }));

/** Register an ID token that the stubbed admin SDK resolves to this phone. */
function tokenFor(idToken, phoneNumber) {
  globalThis.__firebaseTokens.set(idToken, phoneNumber);
  return idToken;
}

async function scenarioLookup() {
  console.log("\n9. Lookup finds the account by email, username or mobile");

  seed({
    staff: [],
    client: [
      {
        clientId: 27,
        username: "keisha",
        email: CLIENT_EMAIL,
        contactNumber: SMS_PHONE,
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const byEmail = await lookup(CLIENT_EMAIL);
  check("lookup by email answers 200", status(byEmail) === 200, `got ${status(byEmail)}`);
  check(
    "lookup sends no email",
    globalThis.__otpSends.length === 0,
    `emails ${globalThis.__otpSends.length}`,
  );

  const channels = byEmail.body?.channels ?? [];
  const emailCh = channels.find((c) => c.type === "email");
  const smsCh = channels.find((c) => c.type === "sms");
  check(
    "email channel is masked, never the raw address",
    !!emailCh &&
      emailCh.target !== CLIENT_EMAIL &&
      emailCh.target.startsWith("ke") &&
      emailCh.target.endsWith("@gmail.com"),
    `got ${emailCh?.target}`,
  );
  check("sms channel is masked", smsCh?.target === SMS_MASKED, `got ${smsCh?.target}`);

  const byUsername = await lookup("keisha");
  check(
    "lookup by username finds the same account",
    status(byUsername) === 200 &&
      (byUsername.body?.channels?.length ?? 0) === channels.length,
    `got ${status(byUsername)}`,
  );

  const byPhone = await lookup(SMS_PHONE);
  check("lookup by mobile number answers 200", status(byPhone) === 200, `got ${status(byPhone)}`);

  const unknown = await lookup("nobody@example.com");
  check("lookup for unknown details answers 404", status(unknown) === 404, `got ${status(unknown)}`);
}

async function scenarioFirebaseReset() {
  console.log("\n10. Firebase phone verification resets the password (Staff and Client)");

  const cases = [
    { kind: "staff", id: 19, email: "pcsc@gmail.com" },
    { kind: "client", id: 27, email: CLIENT_EMAIL },
  ];

  for (const c of cases) {
    const row = {
      username: `${c.kind}${c.id}`,
      email: c.email,
      contactNumber: SMS_PHONE,
      password: "old-hash",
      otp: null,
      otpExpiration: null,
    };
    const tables =
      c.kind === "staff"
        ? seed({ staff: [{ ...row, staffId: c.id }], client: [] })
        : seed({ staff: [], client: [{ ...row, clientId: c.id }] });

    const verified = await firebaseVerify(
      c.email,
      tokenFor(`token-${c.kind}-${c.id}`, SMS_E164),
    );
    check(
      `${c.kind}: firebase-verify answers 200 with a ticket`,
      status(verified) === 200 && typeof verified.body?.ticket === "string",
      `got ${status(verified)} ${JSON.stringify(verified.body)}`,
    );

    const newPassword = `Phone${c.kind}1!`;
    const put = await PUT(
      request({
        identifier: c.email,
        ticket: verified.body?.ticket,
        newPassword,
      }),
    );
    check(
      `${c.kind}: PUT with the ticket succeeds`,
      status(put) === 200,
      `got ${status(put)}`,
    );

    const updated = c.kind === "staff" ? tables.staff[0] : tables.client[0];
    check(
      `${c.kind}: login accepts the new password`,
      await bcrypt.compare(newPassword, updated.password),
    );
    check(
      `${c.kind}: PUT cleared the OTP fields`,
      updated.otp === null && updated.otpExpiration === null,
    );
  }
}

async function scenarioFirebaseRejections() {
  console.log("\n11. Wrong numbers, bad tokens and unknown details are refused");

  seed({
    staff: [],
    client: [
      {
        clientId: 9,
        email: "nophone@email.com",
        contactNumber: "N/A",
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const noPhoneLookup = await lookup("nophone@email.com");
  check(
    "an account with no mobile on file lists email only",
    status(noPhoneLookup) === 200 &&
      noPhoneLookup.body?.channels?.length === 1 &&
      noPhoneLookup.body.channels[0].type === "email",
    JSON.stringify(noPhoneLookup.body?.channels),
  );

  seed({
    staff: [],
    client: [
      {
        clientId: 27,
        email: CLIENT_EMAIL,
        contactNumber: SMS_PHONE,
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const otherNumber = await firebaseVerify(
    CLIENT_EMAIL,
    tokenFor("token-other-number", "+639998887777"),
  );
  check(
    "a verified number that is not on the account answers 403",
    status(otherNumber) === 403,
    `got ${status(otherNumber)}`,
  );

  const badToken = await firebaseVerify(CLIENT_EMAIL, "not-a-real-token");
  check(
    "an unknown token answers 401",
    status(badToken) === 401,
    `got ${status(badToken)}`,
  );

  const missingToken = await firebaseVerify(CLIENT_EMAIL, "");
  check(
    "a missing token answers 400",
    status(missingToken) === 400,
    `got ${status(missingToken)}`,
  );

  const unknownAccount = await firebaseVerify(
    "nobody@example.com",
    tokenFor("token-unknown-account", SMS_E164),
  );
  check(
    "unknown details still answer 404",
    status(unknownAccount) === 404,
    `got ${status(unknownAccount)}`,
  );
}

async function scenarioAmbiguousPhone() {
  console.log("\n12. A mobile number shared by two accounts is refused");

  seed({
    staff: [
      {
        staffId: 3,
        email: "clerk@scgcc.gov.ph",
        contactNumber: SMS_PHONE,
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
    client: [
      {
        clientId: 4,
        email: "shared@email.com",
        contactNumber: SMS_PHONE,
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const res = await firebaseVerify(
    SMS_PHONE,
    tokenFor("token-ambiguous", SMS_E164),
  );
  check("answers 409", status(res) === 409, `got ${status(res)}`);
}

async function scenarioFirebaseDisabled() {
  console.log("\n13. Without Firebase config the channel hides and the API answers 503");

  seed({
    staff: [],
    client: [
      {
        clientId: 5,
        email: "x@email.com",
        contactNumber: SMS_PHONE,
        password: "h",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  globalThis.__firebaseConfigured = false;
  try {
    const hidden = await lookup("x@email.com");
    check(
      "lookup lists email only while Firebase is off",
      status(hidden) === 200 &&
        hidden.body?.channels?.length === 1 &&
        hidden.body.channels[0].type === "email",
      JSON.stringify(hidden.body?.channels),
    );

    const res = await firebaseVerify("x@email.com", "any-token");
    check(
      "firebase-verify answers 503",
      status(res) === 503,
      `got ${status(res)}`,
    );

    const emailStillWorks = await sendEmail("x@email.com");
    check(
      "email reset is unaffected by the Firebase flag",
      status(emailStillWorks) === 200,
      `got ${status(emailStillWorks)}`,
    );
  } finally {
    globalThis.__firebaseConfigured = true;
  }
}

async function scenarioTicketGuards() {
  console.log("\n14. Tickets are signed, account-bound and short-lived");

  const tables = seed({
    staff: [],
    client: [
      {
        clientId: 27,
        email: CLIENT_EMAIL,
        contactNumber: SMS_PHONE,
        password: "old-hash",
        otp: null,
        otpExpiration: null,
      },
      {
        clientId: 28,
        email: "someone.else@email.com",
        contactNumber: "09170000099",
        password: "old-hash",
        otp: null,
        otpExpiration: null,
      },
    ],
  });

  const issued = await firebaseVerify(
    CLIENT_EMAIL,
    tokenFor("token-guards", SMS_E164),
  );
  const ticket = issued.body?.ticket;
  check("a ticket was issued for the right number", typeof ticket === "string");

  const otherAccount = await PUT(
    request({
      identifier: "someone.else@email.com",
      ticket,
      newPassword: "NopeNope1!",
    }),
  );
  check(
    "a ticket for one account cannot reset another",
    status(otherAccount) === 400,
    `got ${status(otherAccount)}`,
  );
  check(
    "the other account's password is untouched",
    tables.client[1].password === "old-hash",
  );

  const tampered = await PUT(
    request({
      identifier: CLIENT_EMAIL,
      ticket: `${String(ticket).slice(0, -2)}xy`,
      newPassword: "NopeNope1!",
    }),
  );
  check(
    "a tampered ticket is rejected",
    status(tampered) === 400,
    `got ${status(tampered)}`,
  );

  const expiredPayload = Buffer.from(
    JSON.stringify({ u: "client", i: 27, exp: Date.now() - 1000 }),
  ).toString("base64url");
  const expiredSignature = createHmac("sha256", process.env.AUTH_SECRET)
    .update(expiredPayload)
    .digest("base64url");
  const expired = await PUT(
    request({
      identifier: CLIENT_EMAIL,
      ticket: `${expiredPayload}.${expiredSignature}`,
      newPassword: "NopeNope1!",
    }),
  );
  check(
    "an expired ticket is rejected",
    status(expired) === 400,
    `got ${status(expired)}`,
  );

  const noProof = await PUT(
    request({ identifier: CLIENT_EMAIL, newPassword: "NopeNope1!" }),
  );
  check(
    "a reset with neither code nor ticket is rejected",
    status(noProof) === 400,
    `got ${status(noProof)}`,
  );

  check(
    "no rejected attempt changed the password",
    tables.client[0].password === "old-hash",
  );

  const good = await PUT(
    request({ identifier: CLIENT_EMAIL, ticket, newPassword: "TicketOk1!" }),
  );
  check(
    "the untouched ticket still works",
    status(good) === 200,
    `got ${status(good)}`,
  );
  check(
    "and the new password is live",
    await bcrypt.compare("TicketOk1!", tables.client[0].password),
  );
}

async function scenarioAllUserTypesPhone() {
  console.log("\n15. Every user type completes the Firebase phone reset");

  const cases = [
    { label: "Staff / Admin", kind: "staff", id: 1, phone: "09170000001" },
    { label: "Staff / Accounting Clerk", kind: "staff", id: 3, phone: "09170000002" },
    { label: "Staff / Program Coordinator (Sports)", kind: "staff", id: 2, phone: "09170000003" },
    { label: "Staff / Program Coordinator (Cultural)", kind: "staff", id: 5, phone: "09170000004" },
    { label: "Staff / Local Treasury Operations Officer", kind: "staff", id: 4, phone: "09170000005" },
    { label: "Client / Public Client", kind: "client", id: 2, phone: "09170000006" },
    { label: "Client / Provincial Government", kind: "client", id: 1, phone: "09170000007" },
  ];

  for (const c of cases) {
    const email = `${c.id}@${c.kind === "staff" ? "scgcc.gov.ph" : "email.com"}`;
    const username = `${c.kind}${c.id}`;
    const base = {
      username,
      email,
      contactNumber: c.phone,
      password: "old-hash",
      otp: null,
      otpExpiration: null,
    };
    const tables =
      c.kind === "staff"
        ? seed({ staff: [{ ...base, staffId: c.id }], client: [] })
        : seed({ staff: [], client: [{ ...base, clientId: c.id }] });

    const newPassword = `Sms${c.kind}${c.id}Pw1!`;

    const byUsername = await lookup(username);
    check(
      `${c.label}: lookup by username offers email + SMS`,
      status(byUsername) === 200 && byUsername.body?.channels?.length === 2,
      JSON.stringify(byUsername.body?.channels),
    );

    const verified = await firebaseVerify(
      username,
      tokenFor(`tok-${username}`, toE164Ph(c.phone)),
    );
    const put = await PUT(
      request({
        identifier: username,
        ticket: verified.body?.ticket,
        newPassword,
      }),
    );

    const loginRow = loginRowFor(tables, email);

    check(
      `${c.label}: verify + PUT both 200`,
      status(verified) === 200 && status(put) === 200,
      `verify ${status(verified)}, PUT ${status(put)}`,
    );
    check(
      `${c.label}: signs in with the new password`,
      await bcrypt.compare(newPassword, loginRow.password),
    );
  }
}

/* -------------------------------------------------------------------------
 * Runner
 * ---------------------------------------------------------------------- */

await scenarioBothTables();
await scenarioClientFirstIsBroken();
await scenarioClientOnly();
await scenarioStaffOnly();
await scenarioHandlersAgree();
await scenarioUnknownEmail();
await scenarioRouteEndToEnd();
await scenarioUnknownEmailSendsNoCode();
await scenarioAllUserTypes();
await scenarioLookup();
await scenarioFirebaseReset();
await scenarioFirebaseRejections();
await scenarioAmbiguousPhone();
await scenarioFirebaseDisabled();
await scenarioTicketGuards();
await scenarioAllUserTypesPhone();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");