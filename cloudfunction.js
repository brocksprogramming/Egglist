// Run this code as a google cloud function
const functions = require('@google-cloud/functions-framework');
const { GoogleGenerativeAI } = require("@google/generative-ai");

functions.http('checkScam', async (req, res) => {
  // CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ isScam: false, reason: "Missing API Key" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ isScam: false, reason: "No content provided" });
    }

    // Initialize with gemini-2.5-flash-lite using the v1beta endpoint
    // This model is optimized for high-volume, low-latency tasks like this
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
    }, { apiVersion: 'v1beta' }); 

    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ 
          text: `Analyze this Craigslist listing for common scams (fake shipping, wire transfers, suspicious pricing). Return ONLY a valid JSON object.
          
          Ad content: ${content}` 
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        // Using responseMimeType to enforce JSON output
        responseMimeType: "application/json"
      }
    });

    const response = await result.response;
    const text = response.text();
    
    if (!text) throw new Error("Empty AI response");

    // Robust parsing in case the model includes markdown backticks
    const cleanText = text.replace(/```json|```/g, "").trim();
    const jsonResponse = JSON.parse(cleanText);
    
    // Ensure standard keys exist in the response
    const finalData = {
      isScam: !!jsonResponse.isScam,
      reason: jsonResponse.reason || "Analysis complete"
    };

    res.status(200).json(finalData);

  } catch (error) {
    console.error("DETAILED_ERROR:", error.message);
    
    res.status(500).json({ 
      isScam: false, 
      reason: "API Logic Error", 
      details: error.message 
    });
  }
});