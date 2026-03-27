let lastCallTime = 0;
const MIN_GAP = 2000; // 2 seconds between API calls

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_SCAM') {
    const now = Date.now();
    
    // 1. Handle Throttling
    if (now - lastCallTime < MIN_GAP) {
      console.warn("Throttling request to save API quota");
      sendResponse({ isScam: false, reason: "Throttled" });
      return false; // No async work happening here, so return false
    }

    lastCallTime = now;

    // 2. Handle the Fetch
    fetch('https://proxy-api-gateway-here', {
      method: 'POST',
      body: JSON.stringify({ content: request.text }),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      // Ensure data matches the format { isScam: true, reason: "..." }
      sendResponse(data); 
    })
    .catch(err => {
      sendResponse({ isScam: false, error: err.message });
    });

    // 3. THE CRITICAL LINE:
    // This tells Chrome: "I'm going to call sendResponse later (asynchronously)."
    // Without this, the content script gets 'undefined' immediately.
    return true; 
  }
});