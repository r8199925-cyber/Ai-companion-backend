const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Current text model
const CHAT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Current Gemini image model
const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

// --------------------------------------------------
// HOME / HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "AI Companion Backend",
    chat: "/api/chat",
    image: "/api/image"
  });
});

// --------------------------------------------------
// GEMINI HELPER
// --------------------------------------------------

async function geminiRequest(model, contents, generationConfig = {}) {

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents,
      generationConfig
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      "Gemini API request failed"
    );
  }

  return data;
}

// --------------------------------------------------
// CHAT
// POST /api/chat
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {

  try {

    const {
      message,
      history = [],
      image = null
    } = req.body;

    if (!message && !image) {
      return res.status(400).json({
        error: "Message or image is required"
      });
    }

    const contents = [];

    // Previous conversation = memory
    if (Array.isArray(history)) {

      for (const item of history) {

        if (!item?.text) continue;

        contents.push({
          role: item.role === "user"
            ? "user"
            : "model",

          parts: [
            {
              text: item.text
            }
          ]
        });
      }
    }

    // Current message
    const parts = [];

    if (message) {
      parts.push({
        text: `
You are a friendly AI Companion.

Personality:
- Warm
- Helpful
- Natural
- Friendly
- Can speak Hindi, Hinglish and English
- Keep replies conversational
- Do not claim you generated an image unless an image was actually generated.

User message:
${message}
`
      });
    }

    // Optional uploaded image
    if (image && image.data && image.mimeType) {

      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    contents.push({
      role: "user",
      parts
    });

    const data = await geminiRequest(
      CHAT_MODEL,
      contents,
      {
        temperature: 0.8,
        maxOutputTokens: 1024
      }
    );

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("")
        .trim();

    if (!reply) {
      throw new Error("Gemini returned an empty response");
    }

    res.json({
      success: true,
      reply
    });

  } catch (error) {

    console.error("CHAT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// IMAGE GENERATION
// POST /api/image
// --------------------------------------------------

app.post("/api/image", async (req, res) => {

  try {

    const {
      prompt,
      aspectRatio = "1:1"
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Image prompt is required"
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        contents: [
          {
            role: "user",

            parts: [
              {
                text:
                  `Create a high quality realistic image based on this request: ${prompt}`
              }
            ]
          }
        ],

        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio
          }
        }

      })
    });

    const data = await response.json();

    if (!response.ok) {

      console.error("IMAGE API ERROR:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Image generation failed"
      });
    }

    let imageBase64 = null;
    let mimeType = "image/png";
    let text = "";

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {

      if (part.text) {
        text += part.text;
      }

      if (part.inlineData) {

        imageBase64 =
          part.inlineData.data;

        mimeType =
          part.inlineData.mimeType ||
          "image/png";
      }
    }

    if (!imageBase64) {

      return res.status(500).json({
        error: "Gemini did not return an image",
        details: text
      });
    }

    res.json({
      success: true,

      image: {
        mimeType,
        base64: imageBase64,

        dataUrl:
          `data:${mimeType};base64,${imageBase64}`
      },

      text
    });

  } catch (error) {

    console.error("IMAGE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `AI Companion backend running on port ${PORT}`
  );

});
