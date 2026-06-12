const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ============================================================
// ROUTE 1: Start the OAuth process (get permanent token)
// ============================================================
app.get("/auth", (req, res) => {
  const shop = process.env.SHOPIFY_STORE;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;
  
  const scopes = "read_product_feeds,write_product_feeds,read_product_listings,write_product_listings,read_products,write_products";
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&response_type=code`;
  
  console.log("🔐 Redirecting to Shopify for authorization...");
  console.log("Auth URL:", authUrl);
  res.redirect(authUrl);
});

// ============================================================
// ROUTE 2: Callback - Shopify redirects here after installation
// ============================================================
app.get("/auth/callback", async (req, res) => {
  console.log("📥 Callback received!");
  console.log("Query parameters:", req.query);
  
  const { code, shop, host } = req.query;
  
  // More flexible validation - shop can come from env or query
  if (!code) {
    console.error("❌ Missing code parameter");
    return res.status(400).send("Missing authorization code");
  }
  
  // Use shop from query param, or fall back to env variable
  const targetShop = shop || process.env.SHOPIFY_STORE;
  
  if (!targetShop) {
    console.error("❌ No shop specified");
    return res.status(400).send("Missing shop parameter");
  }
  
  console.log(`📥 Received authorization code for shop: ${targetShop}`);
  
  try {
    const response = await axios.post(`https://${targetShop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code: code
    });
    
    const PERMANENT_TOKEN = response.data.access_token;
    
    console.log("✅ Token generated successfully");
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>✅ Permanent Token Generated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; padding: 40px 20px; background: #f5f5f5; text-align: center; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .token-box { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; word-break: break-all; font-family: monospace; font-size: 14px; }
          .success { color: #28a745; font-size: 24px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; text-align: left; margin: 20px 0; border-radius: 4px; }
          button { background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; }
          button:hover { background: #218838; }
          hr { margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ Permanent Token Generated!</h1>
          
          <div class="token-box">
            <strong style="color: #9cdcfe;">🔑 YOUR PERMANENT API TOKEN:</strong><br><br>
            <span style="color: #ce9178;">${PERMANENT_TOKEN}</span>
          </div>
          
          <div class="warning">
            <strong>⚠️ SAVE THIS TOKEN NOW:</strong>
            <ul>
              <li>This token will <strong>NEVER EXPIRE</strong></li>
              <li><strong>Copy it NOW</strong> - you won't see it again</li>
              <li>Add to Zoho Flow as your Access Token</li>
            </ul>
          </div>
          
          <button onclick="navigator.clipboard.writeText('${PERMANENT_TOKEN}')">📋 Copy Token</button>
          
          <hr>
          
          <p><strong>Next Steps:</strong></p>
          <ol style="text-align: left;">
            <li>Copy the token above</li>
            <li>Go to your Zoho Flow Shopify connector</li>
            <li>Paste this token as the <strong>Access Token</strong></li>
            <li>Save and test the connection</li>
          </ol>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("❌ Error exchanging code for token:", error.response?.data || error.message);
    res.status(500).send(`
      <h1>Error Getting Token</h1>
      <p>Error: ${error.response?.data?.error || error.message}</p>
      <p>Check that your CLIENT_ID and CLIENT_SECRET are correct in environment variables.</p>
      <pre>${JSON.stringify(error.response?.data, null, 2)}</pre>
    `);
  }
});

// Debug endpoint
app.get("/debug-env", (req, res) => {
  res.json({
    has_store: !!process.env.SHOPIFY_STORE,
    has_client_id: !!process.env.SHOPIFY_CLIENT_ID,
    has_secret: !!process.env.SHOPIFY_CLIENT_SECRET,
    has_redirect: !!process.env.REDIRECT_URI,
    store_value: process.env.SHOPIFY_STORE || "MISSING",
    redirect_value: process.env.REDIRECT_URI || "MISSING"
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "Running ✅",
    message: "Visit /auth to get your permanent token",
    auth_url: `https://e22-agent-api.onrender.com/auth`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});