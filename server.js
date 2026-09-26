const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const POLLINATIONS = "https://gen.pollinations.ai";
const API_KEY = process.env.POLLINATIONS_KEY;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.send("AI Companion Backend");
});

// =========================
// HEALTH
// =========================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AI Companion Backend",
    pollinationsKey: !!API_KEY
  });
});

// =========================
// MODEL CHECK
// =========================
app.get("/api/models", async (req, res) => {
  try {
    const response = await fetch(`${POLLINATIONS}/v1/models`);

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// =========================
// CHAT
// =========================
app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "POLLINATIONS_KEY is missing on Render"
      });
    }

    const messages = req.body.messages || [
      {
        role: "user",
        content: req.body.message || ""
      }
    ];

    const response = await fetch(
      `${POLLINATIONS}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-5.4-nano",
          messages: messages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("CHAT ERROR:", data);

      return res.status(response.status).json({
        error: data
      });
    }

    res.json(data);

  } catch (error) {
    console.error("CHAT SERVER ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// =========================
// IMAGE
// =========================
// Current simple Pollinations image endpoint.
// Flux worked in your previous version.
app.get("/api/image", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "POLLINATIONS_KEY is missing on Render"
      });
    }

    const prompt = req.query.prompt;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt missing"
      });
    }

    const imageUrl =
      `${POLLINATIONS}/image/${encodeURIComponent(prompt)}` +
      `?model=flux&width=1024&height=1024`;

    console.log("IMAGE URL:", imageUrl);

    res.json({
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error("IMAGE ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// =========================
// IMAGE PROXY
// =========================
// This route actually downloads the image using
// your secret API key and sends the image to frontend.
app.get("/api/image-proxy", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "POLLINATIONS_KEY is missing on Render"
      });
    }

    const prompt = req.query.prompt;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt missing"
      });
    }

    const imageUrl =
      `${POLLINATIONS}/image/${encodeURIComponent(prompt)}` +
      `?model=flux&width=1024&height=1024`;

    console.log("Generating image:", prompt);

    const response = await fetch(imageUrl, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "POLLINATIONS IMAGE ERROR:",
        response.status,
        errorText
      );

      return res.status(response.status).json({
        error: errorText || "Pollinations image generation failed"
      });
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    res.send(buffer);

  } catch (error) {
    console.error("IMAGE PROXY ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// =========================
// VIDEO
// =========================
app.get("/api/video", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "POLLINATIONS_KEY is missing on Render"
      });
    }

    const prompt = req.query.prompt;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt missing"
      });
    }

    const videoUrl =
      `${POLLINATIONS}/video/${encodeURIComponent(prompt)}` +
      `?model=veo&duration=4&aspectRatio=16:9`;

    console.log("VIDEO REQUEST:", prompt);

    const response = await fetch(videoUrl, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "POLLINATIONS VIDEO ERROR:",
        response.status,
        errorText
      );

      return res.status(response.status).json({
        error: errorText || "Video generation failed"
      });
    }

    const contentType =
      response.headers.get("content-type") || "video/mp4";

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    res.send(buffer);

  } catch (error) {
    console.error("VIDEO SERVER ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// =========================
// START SERVER
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Companion running on port ${PORT}`);
});
