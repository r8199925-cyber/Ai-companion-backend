const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "AI Companion Backend is running"
  });
});

app.post("/api/chat", async (req, res) => {

  try {

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const {
      message = "",
      history = [],
      image = null
    } = req.body;

    const contents = [];

    history.slice(-20).forEach(item => {

      contents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [
          {
            text: String(item.text || "")
          }
        ]
      });

    });

    const parts = [
      {
        text: `
You are a friendly AI Companion.

Personality:
- caring
- friendly
- natural
- helpful
- slightly playful

Talk naturally with the user.

If the user speaks Hindi, reply in Hindi.
If the user speaks English, reply in English.

Remember useful information from the conversation.

User message:
${message || "Please analyze the uploaded image."}
`
      }
    ];

    if (image && image.data) {

      parts.push({
        inline_data: {
          mime_type: image.mimeType || "image/jpeg",
          data: image.data
        }
      });

    }

    contents.push({
      role: "user",
      parts
    });

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(url, {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },

      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000
        }
      })

    });

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error"
      });

    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {

      return res.status(500).json({
        error: "Gemini returned an empty response"
      });

    }

    res.json({
      reply
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});

app.listen(PORT, () => {

  console.log(
    `AI Companion backend running on port ${PORT}`
  );

});
