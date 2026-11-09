# Egglist

Egglist is a Chrome extension that adds scam-warning signals to Craigslist search results. It checks visible listings for a few common red flags and can optionally use a Gemini-backed service for an additional opinion.

> **Important:** Egglist highlights suspicious signals; it does not block listings or prove that a listing is a scam. A clean result is not a guarantee of safety. Always use caution, especially with payments, shipping, and requests for verification codes.

## What it checks

- Mentions of Google Voice or other verification codes
- Mentions of hard-to-reverse payment methods, including gift cards, wire transfers, and cryptocurrency
- Payment requests involving person-to-person payment services
- Shipping or delivery paired with an upfront payment request
- Some claims of urgency or inability to meet in person

Egglist displays a status on each listing it scans. A warning can be dismissed for that listing, and the dismissal is saved in extension storage.

## Install from source

1. Download or clone this repository.
2. In Chrome, open [`chrome://extensions`](chrome://extensions) and enable **Developer mode**.
3. Choose **Load unpacked** and select the Egglist project folder.
4. Open a Craigslist search results page on `craigslist.com` or `craigslist.org`. Egglist checks listings as they become visible.

After changing the extension files, reload Egglist from `chrome://extensions` and refresh the Craigslist tab.

## Optional Gemini analysis

Local checks work without an AI service. The included Google Cloud Function can provide a second opinion:

1. Deploy `cloudfunction.js` as an HTTPS Google Cloud Function using the Functions Framework dependencies in `package.json`.
2. Configure `GEMINI_API_KEY` as a server-side secret or environment variable. **Never put the Gemini API key in the extension.**
3. Set `AI_ENDPOINT` in `background.js` to the function's HTTPS URL.
4. Add the function URL's origin to `host_permissions` in `manifest.json`.
5. Reload the extension and the Craigslist tab.

The function accepts a JSON request with a `content` string of up to 8,000 characters and returns `{ "isScam": boolean, "reason": string }`. The service is not configured in the extension by default. Until it is configured, Egglist reports **Local check only**.

Only the public text extracted from visible listings is sent to the configured endpoint. Requests are spaced out and time out after 15 seconds. Before making a function publicly accessible, configure appropriate authentication, quotas, and rate limits for your deployment.

## Status meanings

| Status | Meaning |
| --- | --- |
| **Potential scam indicators found** | A local rule or AI analysis found a warning sign. It is not proof of fraud. |
| **No known scam indicators found** | Local checks and the configured AI service found no obvious warning signs. This does not mean the listing is safe. |
| **Local check only** | Local checks ran, but AI analysis is not configured or could not be completed. |
| **Scan could not be completed** | Egglist encountered an error. It does not mean the listing is safe. |

## Privacy

Local checks run in your browser. When Gemini analysis is configured, Egglist sends listing text to the endpoint you configure for analysis. Do not configure a service you do not trust. Egglist does not need access to your Craigslist account or private messages.

## Limitations

- Scam signals are heuristic and may produce false positives or miss scams.
- Results depend on the listing text available on the search results page.
- Egglist highlights listings but does not hide them or prevent you from opening them.
- Gemini output is advisory and may be incorrect.

## Development

The Chrome extension has no build step. The optional Cloud Function uses Node.js; install its dependencies with `npm install` before running or deploying the function.

## License

Egglist is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE).
