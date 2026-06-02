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
  
  // Scopes you need (add more if required)
  const scopes = "read_content,write_content";
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&response_type=code`;
  
  console.log("🔐 Redirecting to Shopify for authorization...");
  res.redirect(authUrl);
});

// ============================================================
// ROUTE 2: Callback - Shopify redirects here after installation
// ============================================================
app.get("/auth/callback", async (req, res) => {
  const { code, shop } = req.query;
  
  if (!code || !shop) {
    return res.status(400).send("Missing code or shop parameter");
  }
  
  console.log("📥 Received authorization code:", code.substring(0, 20) + "...");
  console.log("🏪 Shop:", shop);
  
  try {
    // Exchange the code for a permanent token
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code: code
      // IMPORTANT: NO "expiring=1" parameter = PERMANENT TOKEN
    });
    
    const PERMANENT_TOKEN = response.data.access_token;
    
    console.log("\n✅✅✅ PERMANENT TOKEN GENERATED ✅✅✅");
    console.log("TOKEN:", PERMANENT_TOKEN);
    console.log("This token will NEVER expire!\n");
    
    // Display the token in a clean HTML page
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
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          hr { margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ Permanent Token Generated Successfully!</h1>
          
          <div class="token-box">
            <strong style="color: #9cdcfe;">🔑 YOUR PERMANENT API TOKEN:</strong><br><br>
            <span style="color: #ce9178;">${PERMANENT_TOKEN}</span>
          </div>
          
          <div class="warning">
            <strong>⚠️ IMPORTANT - READ CAREFULLY:</strong>
            <ul>
              <li>This token will <strong>NEVER EXPIRE</strong></li>
              <li><strong>Copy it RIGHT NOW</strong> - you will never see it again</li>
              <li>Add this to your Zoho Flow Shopify connection as the Access Token</li>
              <li>Store it securely in your Render environment as <code>SHOPIFY_ADMIN_TOKEN</code></li>
            </ul>
          </div>
          
          <button onclick="navigator.clipboard.writeText('${PERMANENT_TOKEN}')">📋 Copy Token to Clipboard</button>
          
          <hr>
          
          <p><strong>Next Steps for Zoho Flow:</strong></p>
          <ol style="text-align: left;">
            <li>Copy the token above</li>
            <li>Go to your Zoho Flow Shopify connector</li>
            <li>Paste this token as the <strong>Access Token</strong></li>
            <li>Save and test the connection</li>
          </ol>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This token is permanent. You can now stop this server or keep it running for other tasks.
          </p>
        </div>
        <script>
          console.log("Permanent Token:", "${PERMANENT_TOKEN}");
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("❌ Error getting token:", error.response?.data || error.message);
    res.status(500).send(`
      <h1>Error Getting Token</h1>
      <p>Error: ${error.response?.data?.error || error.message}</p>
      <p>Check that your CLIENT_ID and CLIENT_SECRET are correct in environment variables.</p>
    `);
  }
});

// ============================================================
// Health check endpoint
// ============================================================
app.get("/", (req, res) => {
  res.json({
    status: "Running ✅",
    message: "Visit /auth to start the OAuth flow and get your permanent token",
    endpoints: {
      start: "/auth",
      callback: "/auth/callback"
    }
  });
});

// ============================================================
// Start the server
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Visit:https://preordersync.onrender.com/auth to get your token\n`);
});