# Setting up SMS password recovery (SMSGate)

This guide turns on the option to receive a password-reset code by **text message**, sent from a
**spare Android phone** you keep switched on. There is no sender ID to register, no API account and
no card — the root cost is the SIM's normal texting allowance.

If you don't do this, nothing breaks: email recovery keeps working and the text-message option stays
hidden.

---

## What your users will see

On the sign-in page, **Forgot password?** works like this:

1. They type **any one** of: their email, their username, or their mobile number.
2. The app shows the recovery options saved on the account — for example:
   - **Email** — `ma••••••@gmail.com`
   - **Text message (SMS)** — `09•••4567`
3. They pick one and tap **Send recovery code**.
4. A 6-digit code arrives — by email, or by text to the number **already saved on the account**.
5. They enter the code, set a new password, and sign in.

The code is always sent to the number on file; there is nowhere to type an arbitrary number, so a
reset can't be redirected to someone else's phone.

---

## What you need

- A **spare Android phone** (Android 5.0 or newer) that can stay switched on and online.
- A **SIM** in that phone with texting available. Each code is one normal text, so your load or
  text promo covers it.
- Access to your **Vercel** project.

---

## Part A — Set up the phone

1. On the spare phone, open the browser and go to **https://sms-gate.app**.
2. Tap **Download App** and install it (allow installing from the browser if asked).
3. Open the app and give it the permissions it asks for (SMS, notifications).
4. Choose **Cloud** mode and sign in / register. This keeps the phone reachable over the internet.
5. On the app's **Home** screen you'll see a **username** and **password**. Copy both — these are the
   two settings the website needs. Treat them like passwords: anyone with them can send from your SIM.
6. **Stop Android from sleeping the app:** Settings → Apps → SMS Gateway → Battery → set to
   **Unrestricted** (or disable battery optimisation for it). Otherwise the app gets killed and codes
   stop sending.
7. Leave the phone switched on and connected. That's the whole phone side.

---

## Part B — Add the settings to Vercel

1. Open **vercel.com**, sign in, and open your **CSASC** project.
2. **Settings** → **Environment Variables**.
3. Add these (leave **Production** and **Preview** ticked):

| Name | Value | Setting |
|---|---|---|
| `SMSGATE_USERNAME` | from the app's Home screen | secret |
| `SMSGATE_PASSWORD` | from the app's Home screen | secret |
| `SMSGATE_API_URL` | `https://api.sms-gate.app/3rdparty/v1` | config |

4. Save.

> `SMSGATE_USERNAME` and `SMSGATE_PASSWORD` are the on/off switch: the SMS option appears only when
> both are set. Remove them and redeploy to hide it again.

The same three lines are already in `ccasc/.env` for local use — just fill in the username and
password.

---

## Part C — Turn it on and test

1. Vercel → **Deployments** → **Redeploy** the newest deployment. (Environment variables only apply
   to a new deployment; pushing a commit also does it.)
2. Open your live site → **Forgot password?**
3. Enter the email of an account that has a mobile number saved, and continue.
4. Pick **Text message (SMS)** → **Send recovery code**.
5. The text goes out from your spare phone, so it will also appear in that phone's own Messages app.
6. Enter the code, set a new password, and sign in.

---

## What it costs

- **No monthly fee, no per-message software fee, no card.**
- Each code is one ordinary text from your SIM — so it uses your load or text promo, exactly as if
  you sent it by hand. A small top-up lasts a long time at password-reset volumes.
- Receiving texts costs nothing.

## Things worth knowing

- **The sender is your phone's number**, not "CCASC". No sender ID is required or possible this way.
- **The phone must stay on and online.** It is the actual sender; if it's off, codes don't go out.
- **Load:** if the SIM has no load or promo, the send fails — the app shows "Failed to send the
  recovery SMS" and email still works.
- **One code per minute**, and codes expire in **5 minutes**.
- **Accounts without a mobile number** simply see Email only. An admin can add one under
  **User Management → Update**.
- **A number shared by two accounts** is refused rather than guessed.

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| No SMS option on the reset screen | `SMSGATE_USERNAME`/`PASSWORD` missing, or not redeployed | Part B, then Part C step 1 |
| "SMS reset is not available right now" | Same as above | Same as above |
| "Failed to send the recovery SMS" | Phone offline, app killed, no load, or wrong credentials | Check the phone: app open, internet on, battery unrestricted, load available. Vercel logs show `SMSGate rejected the send (HTTP …)` |
| Code never arrives | Same as above | Check the phone's own Messages app — the send appears there if it went out |
| SMS option missing for one person | That account has no mobile number saved | Add it in User Management |
| "That mobile number is not the one saved…" | Should not occur on this path; the code always goes to the saved number | Report it — the lookup should be masking, not asking |
