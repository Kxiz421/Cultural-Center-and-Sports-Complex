# Setting up SMS password recovery (PhilSMS)

This guide turns on the option to receive a password-reset code by **text message**, sent through
PhilSMS. It costs about **₱0.35 per message**, with no monthly fee and no minimum top-up.

If you don't do this, nothing breaks: email recovery keeps working and the text-message option
simply stays hidden.

---

## What your users will see

On the sign-in page, **Forgot password?** works like this:

1. They type **any one** of: their email, their username, or their mobile number.
2. The app finds the account and shows the recovery options saved on it — for example:
   - **Email** — `ma••••••@gmail.com`
   - **Text message (SMS)** — `09•••4567`
3. They pick one and tap **Send recovery code**.
4. A 6-digit code arrives (by email, or by text to the number already on their account).
5. They enter the code, set a new password, and sign in.

Only part of the email/phone is shown, and the text always goes to the number **already saved on
the account** — there is nowhere to type an arbitrary number, so the reset can't be redirected.

---

## What you need

- A **PhilSMS account** (free to create).
- A **sender ID** — up to 11 characters, e.g. `CSASC`.
- Access to your **Vercel** project.

---

## Part A — Create the PhilSMS account

1. Go to **https://www.philsms.com** and click **Sign Up**.
2. Register and confirm your email. Every new account gets **5 free SMS credits** to test with.
3. Open the **Developers** section of the dashboard and copy your **API token** — a long string
   starting with a number and a pipe, like `49|LNFe8WJ7...`.
4. **Register your sender ID:** dashboard → Sender IDs → add `CSASC`.
   - It's free, but the telco takes **2–3 days** to approve it. Start this immediately — it's the
     only part of this setup you have to wait for.
   - Until it's approved, sending may use a default sender.
5. **Top up** a small amount (₱50 is plenty) from the dashboard. Payment options are shown at
   checkout — GCash is commonly used, but check what's listed for your account.
6. Optional: note your **credit balance** on the dashboard, so you know when to top up again.

---

## Part B — Add the settings to Vercel

1. Open **vercel.com** and sign in, then open your **CSASC** project.
2. Go to **Settings** → **Environment Variables**.
3. Add these two (leave **Production** and **Preview** ticked):

| Name | Value |
|---|---|
| `PHILSMS_API_TOKEN` | the API token from step A3 |
| `PHILSMS_SENDER_ID` | `CSASC` |

4. Save them.

> `PHILSMS_API_TOKEN` is the on/off switch: the SMS option appears only once it is set. If you ever
> want to turn SMS off again, remove that variable and redeploy.

### For your own computer (optional)

The same two lines are already in `ccasc/.env`. Put the token there if you want to test locally.

---

## Part C — Turn it on and test

1. In Vercel, open **Deployments** and **Redeploy** the newest deployment. (Environment variables
   only take effect after a new deployment; pushing a commit also does it.)
2. Open your live site and press **Forgot password?**
3. Enter the email of an account that has a mobile number saved, and continue.
4. Pick **Text message (SMS)** and tap **Send recovery code**.
5. The code arrives by text. Enter it, set a new password, and sign in.

The first few sends use your 5 free credits, so test sparingly — and don't resend repeatedly to the
same number, because Philippine carriers can flag near-identical messages as spam and temporarily
block that number.

---

## What it costs

- **₱0.35 per message** — a password-reset code is one short plain-text message, so one credit.
- **No monthly fee, no minimum top-up.**
- Credits are valid **1 year**, and the expiry is refreshed by **every** top-up regardless of amount.
- At ~20 resets a month that's roughly **₱7/month**; a ₱50 top-up is about **140 resets**.

## Things worth knowing

- **Philippines only** — PhilSMS sends to PH numbers (which is all you need here).
- **Accounts without a mobile number** simply see Email only; clients can leave the contact number
  blank when they register. An admin can add it under **User Management → Update**.
- **One code per minute**, and codes expire in **5 minutes**.
- **A number shared by two accounts** is refused rather than guessed, with a message asking them to
  use email instead.

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| No SMS option on the reset screen | `PHILSMS_API_TOKEN` is missing, or not redeployed | Redo Part B, then Part C step 1 |
| "SMS reset is not available right now" | Same as above | Same as above |
| SMS option missing for one person only | That account has no mobile number saved | An admin can add it in User Management |
| "Failed to send the recovery SMS" | Bad/expired token, no credits, or sender ID not approved yet | Check the dashboard: token, balance, sender ID status |
| "No account found with those details" | That email/username/number isn't on any account | Try another detail, or check the account exists |
| "Please wait … before requesting another" | The 1-minute limit between codes | Wait a moment and resend |
