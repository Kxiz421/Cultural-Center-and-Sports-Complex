# Setting up phone password recovery (Firebase)

This guide turns on the option to receive a password-reset code by **text message**, using Google's
Firebase service. Nothing here is billed while you stay under 10 texts a day.

If you skip this guide, nothing breaks: the app keeps working, email recovery keeps working, and the
text-message option simply stays hidden.

---

## What your users will see

On the sign-in page, **Forgot password?** now works like this:

1. They type **any one** of: their email, their username, or their mobile number.
2. The app finds the account and shows the recovery options saved on it — for example:
   - **Email** — `ma••••••@gmail.com`
   - **Text message (SMS)** — `09•••4567`
3. If they pick **Email**, nothing changed — a code is emailed.
4. If they pick **Text message**, they type the mobile number saved on their account, tap **Send
   code**, and Google texts them a 6-digit code. They enter it and set a new password.

They are asked to type their own number (rather than the app showing it) on purpose: the app never
reveals a full phone number to anyone who hasn't proven they own it.

---

## What you need

- A **Google account** (any Gmail works).
- A **credit or debit card**. Firebase requires one to send real texts, even though you won't be
  charged while under 10 texts a day. This is a hard requirement — there is no card-free option.
- Access to your **Vercel** project.

---

## Part A — Set up Firebase (do this in the browser)

1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project**. Name it something like `csasc`. Google Analytics: you can turn it
   **off**. Wait for it to finish, then click **Continue**.
3. **Upgrade to the paid-with-a-card plan** (you still pay $0 under 10 texts/day):
   - Click the **⚙️ gear icon** (bottom of the left menu) → **Usage and billing** → **Details & settings**.
   - Click **Modify plan** and choose **Blaze (pay as you go)**.
   - Add your card and confirm. Ignore the suggested budget — set it to something small like $1 if it
     asks, as a safety net.
4. **Turn on phone sign-in:**
   - Left menu → **Build** → **Authentication** → **Get started**.
   - Open the **Sign-in method** tab → click **Phone** → toggle **Enable** → **Save**.
5. **Allow texts to the Philippines — this is the one people miss.** New projects are set to send to
   **no countries at all**, so nothing is delivered until you allow it:
   - Still in **Authentication**, open the **Settings** tab → **SMS region policy**.
   - Add / allow **Philippines**.
6. **Authorize your website:**
   - **Authentication** → **Settings** tab → **Authorized domains** → **Add domain**.
   - Add your live site's address (the `...vercel.app` one and your custom domain if you have one).
   - Note: you cannot use this from your own computer (`localhost`) — testing happens on the live site.
7. **Add a free test number** (strongly recommended — it costs nothing and sends no real text):
   - **Authentication** → **Sign-in method** tab → expand **Phone numbers for testing**.
   - Add your own mobile in full international form, e.g. `+639171234567`, with a code you choose,
     e.g. `123456` → **Add**.
   - When you test with that number, no text is sent and no credit is used — just type the code.
8. **Get your website settings:**
   - Click the **⚙️ gear** → **Project settings** → **General** → scroll to **Your apps**.
   - Click the **web** icon (`</>`) → give it a nickname → **Register app**.
   - It shows a block called `firebaseConfig`. Keep this page open — you need four values from it.
9. **Get your server key:**
   - **Project settings** → **Service accounts** tab → **Generate new private key** → **Generate key**.
   - A `.json` file downloads. Open it in Notepad — you need `project_id`, `client_email` and
     `private_key` from it.

---

## Part B — Add the settings to Vercel

1. Open **vercel.com**, sign in, and open your **CSASC** project.
2. Go to **Settings** → **Environment Variables**.
3. Add these seven, one at a time (leave **Production** and **Preview** ticked):

| Name | Where it comes from |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` from step 8 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` from step 8 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` from step 8 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` from step 8 |
| `FIREBASE_PROJECT_ID` | `project_id` from the downloaded file |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the downloaded file |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the downloaded file |

> `FIREBASE_PRIVATE_KEY` is the long one that starts with `-----BEGIN PRIVATE KEY-----`. Copy the
> **entire** value including the quotes' insides and the `\n` sequences, exactly as it appears in the
> file. Do not shorten it or press Enter inside it.

SMS stays switched off, and the app answers "not available", until the three `FIREBASE_...` values
(without `NEXT_PUBLIC_`) are set. So it is safe to add these one at a time.

---

## Part C — Turn it on and test

1. In Vercel open the **Deployments** tab and **Redeploy** the newest deployment. (Environment
   variables only take effect after a new deployment — pushing a commit does the same thing.)
2. When it finishes, open your live site and click **Forgot password?**
3. Type the email of an account that has a mobile number saved and continue. You should now see
   **two** options — Email and Text message (SMS).
4. Pick **Text message**, type the mobile number **you added as the test number in Part A step 7**,
   and tap **Send code**.
5. Enter the test code you chose (e.g. `123456`), then set a new password and sign in.
   Nothing was billed and no real text was sent.
6. Once that works, you can repeat it with a real number to confirm a real text arrives — that uses
   one of your 10 free daily texts.

**If the SMS option does not appear at all**, the three `FIREBASE_...` values are missing or
misspelled, or the deployment hasn't been redeployed yet.

---

## What it costs

- **The first 10 texts every day are free.** So roughly 300 free texts a month, resetting daily.
- After that, a text to a Philippine number costs **$0.16 (about ₱9)**.
- You are charged for texts *attempted*, so failed or retried attempts count too.
- With a government system's volume — a handful of password resets a month — you will realistically
  stay at **₱0**.

## Things worth knowing

- **A card must stay on the Firebase account.** If the card expires or is removed, texts stop.
- **The Philippines must stay in the SMS region policy.** If someone resets it, texts silently stop
  being sent and nothing else changes — this is the single most common cause of "it stopped working".
- **The text comes from Google**, not from "CSASC", so the sender name won't say CSASC.
- **Google limits texts to a single number**, so don't hammer the same number while testing; use the
  test numbers from Part A step 7 instead.
- **Google stores the phone number** and creates a Google-side account record for it as part of
  verifying it.
- **Email recovery always remains available**, so someone with no mobile number on file (or whose
  number isn't working) is never locked out.

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| No SMS option on the reset screen | The three `FIREBASE_...` values are missing, or not redeployed | Redo Part B, then Part C step 1 |
| "Phone recovery is not available right now" | Same as above | Same as above |
| Code never arrives | Philippines not allowed in the SMS region policy, or no card on file | Redo Part A steps 3 and 5 |
| "That mobile number is not the one saved on this account" | The number typed doesn't match the account | Use the number on the account, or recover by email |
| "Too many attempts on this number" | Google's per-number limit | Wait, or use a different/test number |
| "The SMS limit has been reached" | You've used the free daily texts and billing isn't set up | Check the card in Firebase, or use email |
| Works on the test number but not a real one | Real sending needs the Blaze plan with a card | Redo Part A step 3 |
