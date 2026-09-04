const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "30mb" }));

const PORT = process.env.PORT || 10000;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

// ================================
// MODELS
// ================================

// Free chat + vision router
const CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL ||
  "openrouter/free";

// Image generation
const IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL ||
  "google/gemini-3.1-flash-image-preview";

// Video generation
const VIDEO_MODEL =
  process.env.OPENROUTER_VIDEO_MODEL ||
  "google/veo-3.1-lite:free";

// Text to speech
const TTS_MODEL =
  process.env.OPENROUTER_TTS_MODEL ||
  "fish-audio/s2.1-pro:free";

// Speech to text
const STT_MODEL =
  process.env.OPENROUTER_STT_MODEL ||
  "openai/whisper-large-v3-turbo";

const BASE_URL =
  "https://openrouter.ai/api/v1";

// ================================
// BASIC HELPERS
// ================================

function checkKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured"
    );
  }
}

async function openRouterRequest(
  path,
  options = {}
) {
  checkKey();

  const response = await fetch(
    `${BASE_URL}${path}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${OPENROUTER_API_KEY}`,

        "Content-Type":
          "application/json",

        "HTTP-Referer":
          process.env.APP_URL ||
          "https://ai-companion-backend-2.onrender.com",

        "X-Title":
          "AI Companion",

        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.message ||
      data?.raw ||
      `OpenRouter error ${response.status}`
    );
  }

  return {
    response,
    data
  };
}

// ================================
// HOME
// ================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "AI Companion Backend",

    endpoints: {
      health: "/health",
      chat: "POST /api/chat",
      image: "POST /api/image",
      video: "POST /api/video",
      videoStatus: "GET /api/video/status/:id",
      videoContent: "GET /api/video/content/:id",
      tts: "POST /api/tts",
      stt: "POST /api/stt"
    },

    openrouter: !!OPENROUTER_API_KEY
  });
});

// ================================
// HEALTH
// ================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    backend: "online",
    openrouter:
      !!OPENROUTER_API_KEY
  });
});

// ================================
// CHAT
// ================================

app.post("/api/chat", async (req, res) => {
  try {

    const {
      message,
      history = [],
      image = null
    } = req.body;

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error:
          "Message or image is required"
      });
    }

    const messages = [];

    // SYSTEM
    messages.push({
      role: "system",

      content: `
You are My AI Companion.

Personality:
- Friendly
- Warm
- Natural
- Helpful
- Conversational
- Can understand Hindi
- Can understand Hinglish
- Can understand English
- Reply naturally in the language used by the user.

IMPORTANT:
If the user asks to create an image, do not pretend an image was created.
The application has a separate image generation endpoint.

If the user asks for a video, do not pretend a video was created.
The application has a separate video generation endpoint.

Never claim that you generated a real image or video unless the application actually generated it.

Keep normal replies reasonably concise.
`
    });

    // MEMORY / HISTORY
    if (Array.isArray(history)) {

      for (const item of history) {

        if (!item) continue;

        const text =
          item.text ||
          item.content ||
          "";

        if (!text) continue;

        messages.push({
          role:
            item.role === "user"
              ? "user"
              : "assistant",

          content: text
        });
      }
    }

    // CURRENT MESSAGE
    const content = [];

    if (message) {

      content.push({
        type: "text",
        text: message
      });

    }

    // IMAGE UNDERSTANDING
    if (
      image &&
      image.data &&
      image.mimeType
    ) {

      const dataUrl =
        `data:${image.mimeType};base64,${image.data}`;

      content.push({
        type: "image_url",

        image_url: {
          url: dataUrl
        }
      });
    }

    messages.push({
      role: "user",
      content
    });

    const result =
      await openRouterRequest(
        "/chat/completions",
        {
          method: "POST",

          body: JSON.stringify({
            model: CHAT_MODEL,

            messages,

            temperature: 0.8,

            max_tokens: 1000
          })
        }
      );

    const reply =
      result.data
        ?.choices?.[0]
        ?.message?.content;

    if (!reply) {
      throw new Error(
        "AI returned an empty response"
      );
    }

    res.json({
      success: true,
      reply,
      model:
        result.data?.model ||
        CHAT_MODEL
    });

  } catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// TEXT → IMAGE
// ================================

app.post("/api/image", async (req, res) => {

  try {

    const {
      prompt,
      aspectRatio = "1:1",
      resolution = "1K",
      quality = "auto"
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error:
          "Image prompt is required"
      });
    }

    const result =
      await openRouterRequest(
        "/images",
        {
          method: "POST",

          body: JSON.stringify({

            model: IMAGE_MODEL,

            prompt:
              `Create a high-quality realistic image based on this request:

${prompt}`,

            aspect_ratio:
              aspectRatio,

            resolution,

            quality,

            n: 1
          })
        }
      );

    const images =
      result.data?.data || [];

    if (!images.length) {
      throw new Error(
        "Image API returned no image"
      );
    }

    const first =
      images[0];

    const base64 =
      first.b64_json;

    const mimeType =
      first.media_type ||
      "image/png";

    if (!base64) {
      throw new Error(
        "Image API did not return base64 image data"
      );
    }

    res.json({

      success: true,

      image: {

        mimeType,

        base64,

        dataUrl:
          `data:${mimeType};base64,${base64}`
      },

      model: IMAGE_MODEL
    });

  } catch (error) {

    console.error(
      "IMAGE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// TEXT → VIDEO
// ================================

app.post("/api/video", async (req, res) => {

  try {

    const {
      prompt,

      duration = 4,

      resolution = "720p",

      aspectRatio = "16:9",

      generateAudio = true,

      imageUrl = null
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error:
          "Video prompt is required"
      });
    }

    const body = {

      model: VIDEO_MODEL,

      prompt,

      duration,

      resolution,

      aspect_ratio:
        aspectRatio,

      generate_audio:
        generateAudio
    };

    // Optional image → video
    if (imageUrl) {

      body.frame_images = [
        {
          type: "image_url",

          image_url: {
            url: imageUrl
          },

          frame_type:
            "first_frame"
        }
      ];
    }

    const result =
      await openRouterRequest(
        "/videos",
        {
          method: "POST",

          body:
            JSON.stringify(body)
        }
      );

    const job =
      result.data;

    res.json({

      success: true,

      video: {

        id: job.id,

        status:
          job.status,

        pollingUrl:
          job.polling_url ||
          `/api/video/status/${job.id}`
      },

      model: VIDEO_MODEL
    });

  } catch (error) {

    console.error(
      "VIDEO ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// VIDEO STATUS
// ================================

app.get(
  "/api/video/status/:id",
  async (req, res) => {

    try {

      const id =
        req.params.id;

      const result =
        await openRouterRequest(
          `/videos/${encodeURIComponent(id)}`,
          {
            method: "GET",

            headers: {
              "Content-Type":
                undefined
            }
          }
        );

      const job =
        result.data;

      res.json({

        success: true,

        id: job.id,

        status:
          job.status,

        error:
          job.error || null,

        progress:
          job.progress ?? null,

        pollingUrl:
          job.polling_url ||
          `/api/video/status/${id}`,

        contentUrl:
          job.status === "completed"
            ? `/api/video/content/${id}`
            : null
      });

    } catch (error) {

      console.error(
        "VIDEO STATUS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ================================
// VIDEO CONTENT
// ================================

app.get(
  "/api/video/content/:id",
  async (req, res) => {

    try {

      checkKey();

      const id =
        req.params.id;

      const response =
        await fetch(
          `${BASE_URL}/videos/${encodeURIComponent(id)}/content`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${OPENROUTER_API_KEY}`
            }
          }
        );

      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          errorText ||
          "Video download failed"
        );
      }

      res.setHeader(
        "Content-Type",
        response.headers.get(
          "content-type"
        ) ||
        "video/mp4"
      );

      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );

      res.send(buffer);

    } catch (error) {

      console.error(
        "VIDEO CONTENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ================================
// TEXT → SPEECH
// ================================

app.post("/api/tts", async (req, res) => {

  try {

    const {
      text,

      voice = "alloy",

      responseFormat = "mp3"
    } = req.body;

    if (!text) {

      return res.status(400).json({
        success: false,
        error:
          "Text is required"
      });

    }

    checkKey();

    const response =
      await fetch(
        `${BASE_URL}/audio/speech`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              model: TTS_MODEL,

              input: text,

              voice,

              response_format:
                responseFormat
            })
        }
      );

    if (!response.ok) {

      const error =
        await response.text();

      throw new Error(
        error ||
        "TTS failed"
      );
    }

    const audio =
      Buffer.from(
        await response.arrayBuffer()
      );

    const mime =
      responseFormat === "wav"
        ? "audio/wav"
        : "audio/mpeg";

    res.setHeader(
      "Content-Type",
      mime
    );

    res.send(audio);

  } catch (error) {

    console.error(
      "TTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// SPEECH → TEXT
// ================================

app.post("/api/stt", async (req, res) => {

  try {

    const {
      audio,
      format = "wav"
    } = req.body;

    if (!audio) {

      return res.status(400).json({
        success: false,
        error:
          "Audio base64 is required"
      });

    }

    const result =
      await openRouterRequest(
        "/audio/transcriptions",
        {
          method: "POST",

          body:
            JSON.stringify({

              model: STT_MODEL,

              input_audio: {

                data: audio,

                format
              }
            })
        }
      );

    res.json({

      success: true,

      text:
        result.data?.text ||
        ""
    });

  } catch (error) {

    console.error(
      "STT ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// ERROR HANDLER
// ================================

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      error:
        err.message ||
        "Internal server error"
    });
  }
);

// ================================
// START
// ================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "================================"
    );

    console.log(
      "AI Companion Backend ONLINE"
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Chat: ${CHAT_MODEL}`
    );

    console.log(
      `Image: ${IMAGE_MODEL}`
    );

    console.log(
      `Video: ${VIDEO_MODEL}`
    );

    console.log(
      `TTS: ${TTS_MODEL}`
    );

    console.log(
      `STT: ${STT_MODEL}`
    );

    console.log(
      "OpenRouter key:",
      OPENROUTER_API_KEY
        ? "CONFIGURED"
        : "MISSING"
    );

    console.log(
      "================================"
    );
  }
);
