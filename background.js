const AI_ENDPOINT = '';
const MIN_GAP = 2000;
let lastCallTime = 0;
let requestQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'CHECK_SCAM') return false;

  if (!AI_ENDPOINT) {
    sendResponse({ status: 'not-configured' });
    return false;
  }

  let endpoint;
  try {
    endpoint = new URL(AI_ENDPOINT);
  } catch {
    sendResponse({ status: 'unavailable', error: 'The AI endpoint URL is invalid.' });
    return false;
  }

  if (endpoint.protocol !== 'https:') {
    sendResponse({ status: 'unavailable', error: 'The AI endpoint must use HTTPS.' });
    return false;
  }

  if (typeof request.text !== 'string' || !request.text.trim()) {
    sendResponse({ status: 'unavailable', error: 'There was no listing text to analyze.' });
    return false;
  }

  const analysis = requestQueue.then(async () => {
    const wait = Math.max(0, MIN_GAP - (Date.now() - lastCallTime));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallTime = Date.now();

    const response = await fetch(endpoint.href, {
      method: 'POST',
      body: JSON.stringify({ content: request.text }),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`AI service returned HTTP ${response.status}.`);
    return response.json();
  });
  requestQueue = analysis.then(() => undefined, () => undefined);

  analysis
    .then((data) => {
      if (typeof data.isScam !== 'boolean' || typeof data.reason !== 'string') {
        throw new Error('AI service returned an invalid response.');
      }
      sendResponse({ status: 'ok', isScam: data.isScam, reason: data.reason });
    })
    .catch((error) => {
      sendResponse({ status: 'unavailable', error: error.message || 'AI analysis failed.' });
    });

  return true;
});
