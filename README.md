# Egglist

Egglist adds visible scam-check status to Craigslist search listings. It runs local checks for several common scam signals and can optionally ask a Gemini-backed service for a second opinion.

## What the status means

- **Potential scam indicators found** means local checks or the AI service noticed a warning sign. It is not proof that the listing is fraudulent.
- **No known scam indicators found** means the local checks and configured AI service found no obvious warning signs. It is not a guarantee that the listing is safe.
- **Local check only** means local checks ran, but AI analysis was unavailable or has not been configured.
- **Scan could not be completed** means Egglist encountered an error. It does not mean the listing is safe.

Egglist currently highlights listings; it does not hide them or prevent opening them. Use normal caution, especially around payments and requests for verification codes.

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose this project directory.
3. Visit a Craigslist search results page on `craigslist.com` or `craigslist.org`. Egglist checks listings when they become visible.

## Optional Gemini analysis

Local checks work without an AI service. To enable Gemini:

1. Deploy `cloudfunction.js` as a Google Cloud Function using the Functions Framework, with `GEMINI_API_KEY` set as a server-side environment variable. Do not put the API key in the extension.
2. Set `AI_ENDPOINT` in `background.js` to the deployed HTTPS function URL.
3. Add that function's HTTPS origin to `host_permissions` in `manifest.json`.
4. Reload Egglist at `chrome://extensions`.

The function accepts listing text, limited to 8,000 characters, and returns `{ "isScam": boolean, "reason": string }`. The extension sends the public text of visible listings for analysis when the service is configured. AI output can be wrong and should be treated as advisory.

## Development

The extension uses Manifest V3 and has no local build step. After changing files, reload it from `chrome://extensions` and refresh the Craigslist tab.
