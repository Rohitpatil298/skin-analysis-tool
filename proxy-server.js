// ============================================
// CORS PROXY SERVER FOR FACE ANALYSIS API
// ============================================
// This simple Node.js server acts as a proxy to bypass CORS restrictions
//
// HOW TO USE:
// 1. Install Node.js from https://nodejs.org
// 2. Create a folder and save this file as 'proxy-server.js'
// 3. Open terminal in that folder and run:
//    npm install express cors multer node-fetch
// 4. Run the server:
//    node proxy-server.js
// 5. Update the HTML file to use http://localhost:3000/api instead of the direct API URL

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const https = require("https");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per image
  }
});


// Create custom HTTPS agent to bypass SSL certificate validation
// This is needed because the API hostname doesn't match the certificate
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Bypass SSL certificate validation
});

// Enable CORS for all origins
app.use(cors());

// Proxy endpoint
app.post(
  "/api",
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("=== Proxy Request Received ===");
      console.log("Files:", Object.keys(req.files));
      console.log("Body:", req.body);

      // Create FormData for the actual API
      const formData = new FormData();

      // Append images
      if (req.files.image1) {
        formData.append("image1", req.files.image1[0].buffer, {
          filename: "image1.jpg",
          contentType: "image/jpeg",
        });
      }
      if (req.files.image2) {
        formData.append("image2", req.files.image2[0].buffer, {
          filename: "image2.jpg",
          contentType: "image/jpeg",
        });
      }
      if (req.files.image3) {
        formData.append("image3", req.files.image3[0].buffer, {
          filename: "image3.jpg",
          contentType: "image/jpeg",
        });
      }

      // Append other fields
      formData.append("v", req.body.v || "1.1");
      formData.append("t", req.body.t || "imhla10");

      console.log("Forwarding request to actual API...");
      if (!req.files?.image1 || !req.files?.image2 || !req.files?.image3) {
  return res.status(400).json({
    status: 'error',
    message: 'image1, image2, image3 are required'
  });
}


      // Forward to actual API with custom HTTPS agent
      const apiResponse = await fetch(
        "https://artifutech-face-ai-api-n.as.r.appspot.com/api",
        {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
          agent: httpsAgent, // Use custom agent to bypass SSL verification
        },
      );

      const text = await apiResponse.text();

      let responseData;
      try {
        responseData = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from API:", text.slice(0, 300));
        return res.status(502).json({
          status: "error",
          message: "Upstream API did not return JSON",
          raw: text.slice(0, 300),
        });
      }

      console.log("API Response Status:", apiResponse.status);
      console.log("API Response OK:", apiResponse.ok);
      console.log("API Response Data:", responseData);

      // Check if response is successful
      if (!apiResponse.ok) {
        console.error("API returned error status:", apiResponse.status);
        return res.status(apiResponse.status).json({
          status: "error",
          message: `API error: ${apiResponse.status}`,
          details: responseData,
        });
      }

      // Send back to client
      res.json(responseData);
    } catch (error) {
      console.error("=== PROXY ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Full error:", error);

      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        type: error.constructor.name,
      });
    }
  },
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   CORS Proxy Server Running              ║
║   Port: ${PORT}                             ║
║   Endpoint: http://localhost:${PORT}/api   ║
╚══════════════════════════════════════════╝

Update your HTML file to use:
http://localhost:${PORT}/api

Press Ctrl+C to stop
    `);
});
