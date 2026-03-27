// 1. Initialize ExtPay with your unique ID
const extpay = ExtPay('your-ext-pay-id'); 

// 2. Configuration & State
const scanDelay = 1500; 
const pendingScans = new Map();

// 3. The Paywall UI
function showPaywall(el) {
  if (el.querySelector('.extpay-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'extpay-banner';
  banner.style.cssText = "background: #333; color: #fff; padding: 12px; text-align: center; cursor: pointer; border-radius: 4px; margin-bottom: 10px; font-weight: bold;";
  banner.innerHTML = "🥚 Egglist: Limit Reached. <span style='text-decoration: underline;'>Upgrade for $5.99/mo</span> to keep cracking scams.";
  
  banner.onclick = (e) => {
    e.stopPropagation();
    extpay.openPaymentPage();
  };
  
  el.prepend(banner);
  el.style.filter = 'grayscale(1) opacity(0.5)';
}

// 4. The UI Injection (What happens when a scam is found)
function injectScamWarning(el, reason, postId) {
  if (el.querySelector('.egglist-banner')) return;

  const box = document.createElement('div');
  box.className = 'egglist-banner';
  box.style.cssText = `
    background: #fff0f0; border-left: 5px solid #ff4444;
    padding: 10px; margin: 5px 0; font-family: sans-serif;
    font-size: 13px; color: #333; cursor: pointer; border-radius: 4px;
  `;

  box.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span><strong>🚩 Probable Scam Detected</strong></span>
      <span class="toggle-text" style="text-decoration: underline; font-size: 11px;">View Details</span>
    </div>
    <div class="scam-details" style="display: none; margin-top: 8px; font-style: italic; border-top: 1px solid #ddd; padding-top: 5px;">
      <p>AI Analysis: ${reason}</p>
      <button class="not-a-scam" style="margin-top: 5px; background: #eee; border: 1px solid #ccc; padding: 2px 5px; cursor: pointer; font-size: 10px;">Not a scam? Clear.</button>
    </div>
  `;

  // Toggle Details
  box.onclick = () => {
    const details = box.querySelector('.scam-details');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
  };

  // "Not a Scam" Logic
  box.querySelector('.not-a-scam').onclick = (e) => {
    e.stopPropagation();
    chrome.storage.local.get(['allowlist'], (res) => {
      const list = res.allowlist || [];
      list.push(postId);
      chrome.storage.local.set({ allowlist: list }, () => {
        box.remove();
        el.style.filter = 'none';
      });
    });
  };

  el.prepend(box);
  el.style.filter = 'grayscale(0.8) opacity(0.6)';
}

async function processListing(el) {
  const user = await extpay.getUser();
  
  chrome.storage.local.get(['scanCount'], (data) => {
    const count = data.scanCount || 0;

    if (!user.paid && count >= 3) {
      // IMPORTANT: Show the paywall even if we haven't scanned this ad.
      // This gives the user a way to click "Upgrade" on any listing.
      showPaywall(el); 
      return; 
    }

    // Otherwise, proceed with the scan as normal...
    runActualScan(el, el.getAttribute('data-pid'), !user.paid);
  });
}


function runActualScan(el, postId, incrementCount = false) {
  el.classList.add('scanned'); // Mark so we don't scan twice
  const text = el.innerText;

  chrome.runtime.sendMessage({ type: 'CHECK_SCAM', text }, (response) => {
    if (response?.isScam) {
      injectScamWarning(el, response.reason, postId);
    }
    
    if (incrementCount) {
      chrome.storage.local.get(['scanCount'], (res) => {
        chrome.storage.local.set({ scanCount: (res.scanCount || 0) + 1 });
      });
    }
  });
}

// 6. The Observer (Efficiency)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    const listingId = el.getAttribute('data-pid');

    if (entry.isIntersecting && !el.classList.contains('scanned')) {
      const timer = setTimeout(() => {
        processListing(el);
      }, scanDelay);
      pendingScans.set(listingId, timer);
    } else {
      clearTimeout(pendingScans.get(listingId));
      pendingScans.delete(listingId);
    }
  });
}, { threshold: 0.5 });

// 7. Initialization
const init = () => {
  // Craigslist uses '.cl-static-search-result' or '.gallery-card' depending on view
  const selector = '.cl-static-search-result, .gallery-card, .result-row';
  document.querySelectorAll(selector).forEach(el => observer.observe(el));
};

// Run on load and whenever Craigslist loads more (infinite scroll)
init();
const scrollObserver = new MutationObserver(init);
scrollObserver.observe(document.body, { childList: true, subtree: true });


