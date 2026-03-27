Egglist: AI-Powered Craigslist Scam Protection
Egglist is a lightweight Chrome extension designed to make local browsing safer. It uses advanced AI to analyze Craigslist listings in real-time, flagging suspicious patterns and potential fraud before you even click.

🚀 Purpose
Craigslist is a goldmine for deals, but it's also a playground for scammers. Egglist acts as an automated second set of eyes, specifically looking for:

Too-good-to-be-true pricing (e.g., luxury rentals for pennies).

Suspicious payment requests (Zelle, wire transfers, or gift cards).

Urgency & Pressure tactics ("I'm moving tomorrow," "out of town").

Identity theft traps (Google Voice verification code scams).

🛠️ How It Works
Seamless Integration: Once installed, Egglist sits quietly in your browser.

Live Analysis: As you scroll through Craigslist listings, the extension's IntersectionObserver detects visible ads and sends a snippet of the text to a secure, private analysis engine.

Visual Indicators: If a listing is flagged as a likely scam, Egglist injects a clear visual warning directly onto the Craigslist page, saving you from wasting time or risking your money.

Privacy-First: The extension only processes the public text of the ads you view. It does not access your personal Craigslist account or private messages.

📦 Installation & Setup
Download: Clone the repository or download the packed extension file.

Developer Mode: Open chrome://extensions, toggle Developer mode on, and click Load unpacked.

Browse: Navigate to any Craigslist search results page and look for the Egglist status indicators.

⚙️ Technical Overview
Frontend: JavaScript (ES6), CSS3, Chrome Extensions API (Manifest V3).

Backend: Node.js Cloud Functions.

AI Engine: Powered by Google Gemini.
