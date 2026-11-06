const SCAN_DELAY = 1200;
const MAX_LISTING_LENGTH = 8000;
const pendingScans = new WeakMap();
const generatedIds = new WeakMap();
let nextGeneratedId = 1;

const localRules = [
  {
    pattern: /\b(?:google voice|verification code|verify(?:ing)? code|security code)\b/i,
    reason: 'Mentions a verification code, a common account-takeover tactic.'
  },
  {
    pattern: /\b(?:gift cards?|wire transfer|western union|moneygram|crypto(?:currency)?)\b/i,
    reason: 'Requests a payment method that is difficult to reverse.'
  },
  {
    pattern: /\b(?:zelle|cash ?app|venmo|paypal)\b.{0,80}\b(?:deposit|payment|send|pay|transfer)\b|\b(?:deposit|payment|send|pay|transfer)\b.{0,80}\b(?:zelle|cash ?app|venmo|paypal)\b/i,
    reason: 'Requests payment through a person-to-person payment service.'
  },
  {
    pattern: /\b(?:ship(?:ping)?|deliver(?:y|ed)?)\b.{0,100}\b(?:deposit|payment|fee|money)\b|\b(?:deposit|payment|fee|money)\b.{0,100}\b(?:ship(?:ping)?|deliver(?:y|ed)?)\b/i,
    reason: 'Combines shipping or delivery with an upfront payment request.'
  },
  {
    pattern: /\b(?:out of town|moving (?:out|tomorrow)|can't meet|cannot meet|won't be able to meet)\b/i,
    reason: 'Uses an availability or urgency claim that can be used to avoid an in-person meeting.'
  }
];

function getListingId(el) {
  const id = el.getAttribute('data-pid') || el.getAttribute('data-id') || el.id;
  if (id) return id;
  if (!generatedIds.has(el)) generatedIds.set(el, `egglist-${nextGeneratedId++}`);
  return generatedIds.get(el);
}

function getAllowlist() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get({ allowlist: [] }, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result.allowlist);
    });
  });
}

function setStatus(panel, title, detail, state) {
  panel.dataset.state = state;
  panel.replaceChildren();

  const heading = document.createElement('strong');
  heading.className = 'egglist-status-title';
  heading.textContent = title;
  panel.append(heading);

  if (detail) {
    const description = document.createElement('span');
    description.className = 'egglist-status-detail';
    description.textContent = detail;
    panel.append(description);
  }
}

function makePanel(el) {
  let panel = el.querySelector(':scope > .egglist-status');
  if (panel) return panel;

  panel = document.createElement('div');
  panel.className = 'egglist-status';
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  panel.addEventListener('click', (event) => {
    const dismissButton = event.target.closest('.egglist-dismiss');
    if (!dismissButton) return;
    event.stopPropagation();

    const id = getListingId(el);
    chrome.storage.local.get({ allowlist: [] }, (result) => {
      if (chrome.runtime.lastError) {
        setStatus(panel, 'Egglist could not save this choice', chrome.runtime.lastError.message, 'error');
        return;
      }
      const allowlist = new Set(result.allowlist);
      allowlist.add(id);
      chrome.storage.local.set({ allowlist: [...allowlist] }, () => {
        if (chrome.runtime.lastError) {
          setStatus(panel, 'Egglist could not save this choice', chrome.runtime.lastError.message, 'error');
          return;
        }
        setStatus(panel, 'Warning dismissed', 'This listing will not be flagged again.', 'clear');
        el.classList.remove('egglist-flagged');
      });
    });
  });

  el.prepend(panel);
  return panel;
}

function setFlaggedStatus(panel, reasons) {
  setStatus(panel, 'Potential scam indicators found', reasons.join(' '), 'warning');
  const dismiss = document.createElement('button');
  dismiss.className = 'egglist-dismiss';
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss warning';
  panel.append(dismiss);
}

function checkLocally(text) {
  return localRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.reason);
}

function requestAiCheck(text) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CHECK_SCAM', text }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unavailable', error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { status: 'unavailable', error: 'The extension received no response.' });
    });
  });
}

async function scanListing(el) {
  if (!el.isConnected || el.classList.contains('egglist-scanned')) return;
  el.classList.add('egglist-scanned');
  const panel = makePanel(el);
  setStatus(panel, 'Checking this listing…', 'Local checks and optional AI analysis are running.', 'checking');

  try {
    const id = getListingId(el);
    if ((await getAllowlist()).includes(id)) {
      setStatus(panel, 'Warning dismissed', 'This listing is on your allowlist.', 'clear');
      return;
    }

    const text = (el.innerText || '').slice(0, MAX_LISTING_LENGTH);
    const localFindings = checkLocally(text);
    const ai = await requestAiCheck(text);
    const findings = [...localFindings];

    if (ai.status === 'ok' && ai.isScam === true && typeof ai.reason === 'string') {
      findings.push(`AI analysis: ${ai.reason}`);
    }

    if (findings.length) {
      el.classList.add('egglist-flagged');
      setFlaggedStatus(panel, findings);
    } else if (ai.status === 'ok' && ai.isScam === false) {
      setStatus(panel, 'No known scam indicators found', 'Local checks and AI analysis found no obvious warning signs.', 'clear');
    } else {
      const detail = ai.error || (ai.status === 'not-configured'
        ? 'AI analysis is not configured.'
        : 'AI analysis could not be completed.');
      setStatus(panel, 'Local check only', `No local warning signs found. ${detail} This is not a guarantee that the listing is safe.`, 'unavailable');
    }
  } catch (error) {
    setStatus(panel, 'Scan could not be completed', error.message || 'An unexpected error occurred.', 'error');
  }
}

function addStyles() {
  if (document.getElementById('egglist-styles')) return;
  const style = document.createElement('style');
  style.id = 'egglist-styles';
  style.textContent = `
    .egglist-status {
      box-sizing: border-box; display: flex; flex-direction: column; gap: 4px;
      margin: 6px 0; padding: 9px 11px; border-left: 4px solid #687386;
      border-radius: 3px; background: #f2f4f7; color: #202124;
      font: 13px/1.4 Arial, sans-serif;
    }
    .egglist-status[data-state="checking"] { border-color: #4285f4; }
    .egglist-status[data-state="clear"] { border-color: #188038; }
    .egglist-status[data-state="warning"] { border-color: #d93025; background: #fff3f2; }
    .egglist-status[data-state="unavailable"],
    .egglist-status[data-state="error"] { border-color: #e37400; background: #fff8e1; }
    .egglist-status-detail { overflow-wrap: anywhere; }
    .egglist-dismiss {
      align-self: flex-start; margin-top: 3px; padding: 3px 7px;
      border: 1px solid #777; border-radius: 3px; background: #fff; cursor: pointer;
    }
    .egglist-flagged { outline: 2px solid #d93025; outline-offset: 1px; }
  `;
  document.documentElement.append(style);
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const el = entry.target;
    if (entry.isIntersecting && !el.classList.contains('egglist-scanned')) {
      if (pendingScans.has(el)) clearTimeout(pendingScans.get(el));
      pendingScans.set(el, setTimeout(() => {
        pendingScans.delete(el);
        scanListing(el);
      }, SCAN_DELAY));
    } else if (!entry.isIntersecting && pendingScans.has(el)) {
      clearTimeout(pendingScans.get(el));
      pendingScans.delete(el);
    }
  }
}, { threshold: 0.25 });

function init() {
  addStyles();
  document.querySelectorAll('.cl-static-search-result, .gallery-card, .result-row')
    .forEach((el) => observer.observe(el));
}

init();
new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
