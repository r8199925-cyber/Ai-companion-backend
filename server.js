const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 10000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

const CHAT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

const IMAGE_MODEL =
  process.env.POLLINATIONS_IMAGE_MODEL || "flux";

const VIDEO_MODEL =
  process.env.POLLINATIONS_VIDEO_MODEL || "veo";

// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "AI Companion Backend",
    status: "online",

    endpoints: {
      chat: "/api/chat",
      image: "/api/image",
      video: "/api/video"
    },

    services: {
      chat: !!GEMINI_API_KEY,
      image: !!POLLINATIONS_API_KEY,
      video: !!POLLINATIONS_API_KEY
    }
  });
});

// ==================================================
// GEMINI CHAT
// ==================================================

async function geminiChat(contents) {

  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      contents,

      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024
      }

    })

  });

  const data = await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      "Gemini request failed"
    );

  }

  return data;
}

// ==================================================
// POLLINATIONS IMAGE
// ==================================================

async function generateImage(prompt) {

  if (!POLLINATIONS_API_KEY) {

    throw new Error(
      "POLLINATIONS_API_KEY is not configured"
    );

  }

  const encodedPrompt =
    encodeURIComponent(prompt);

  const url =
    `https://gen.pollinations.ai/image/${encodedPrompt}?model=${encodeURIComponent(IMAGE_MODEL)}&width=1024&height=1024&nologo=true`;

  console.log(
    "Generating image with Pollinations..."
  );

  const response = await fetch(url, {

    method: "GET",

    headers: {
      "Authorization":
        `Bearer ${POLLINATIONS_API_KEY}`
    }

  });

  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      "POLLINATIONS IMAGE ERROR:",
      errorText
    );

    throw new Error(
      `Image generation failed: ${response.status} ${errorText}`
    );

  }

  const contentType =
    response.headers.get("content-type") ||
    "image/png";

  const arrayBuffer =
    await response.arrayBuffer();

  const base64 =
    Buffer
      .from(arrayBuffer)
      .toString("base64");

  return {

    mimeType: contentType,

    base64,

    dataUrl:
      `data:${contentType};base64,${base64}`

  };

}

// ==================================================
// POLLINATIONS VIDEO
// ==================================================

async function generateVideo(prompt) {

  if (!POLLINATIONS_API_KEY) {

    throw new Error(
      "POLLINATIONS_API_KEY is not configured"
    );

  }

  const encodedPrompt =
    encodeURIComponent(prompt);

  const url =
    `https://gen.pollinations.ai/video/${encodedPrompt}?model=${encodeURIComponent(VIDEO_MODEL)}&duration=4`;

  console.log(
    "Generating video with Pollinations..."
  );

  const response = await fetch(url, {

    method: "GET",

    headers: {
      "Authorization":
        `Bearer ${POLLINATIONS_API_KEY}`
    }

  });

  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      "POLLINATIONS VIDEO ERROR:",
      errorText
    );

    throw new Error(
      `Video generation failed: ${response.status} ${errorText}`
    );

  }

  const contentType =
    response.headers.get("content-type") ||
    "video/mp4";

  const arrayBuffer =
    await response.arrayBuffer();

  const base64 =
    Buffer
      .from(arrayBuffer)
      .toString("base64");

  return {

    mimeType: contentType,

    base64,

    dataUrl:
      `data:${contentType};base64,${base64}`

  };

}

// ==================================================
// IMAGE REQUEST DETECTOR
// ==================================================

function isImageRequest(message) {

  if (!message) return false;

  const text =
    message.toLowerCase();

  const keywords = [

    "photo banao",
    "pic banao",
    "image banao",
    "photo bana",
    "pic bana",
    "image bana",

    "photo bana do",
    "pic bana do",
    "image bana do",

    "photo generate",
    "pic generate",
    "image generate",

    "generate image",
    "generate photo",

    "create image",
    "create photo",

    "make image",
    "make photo",

    "picture of",
    "image of",
    "photo of",

    "tasveer banao",
    "tasvir banao",
    "tasveer bana",
    "tasvir bana"

  ];

  return keywords.some(
    keyword => text.includes(keyword)
  );
}

// ==================================================
// VIDEO REQUEST DETECTOR
// ==================================================

function isVideoRequest(message) {

  if (!message) return false;

  const text =
    message.toLowerCase();

  const keywords = [

    "video banao",
    "video bana",
    "video bana do",
    "video generate",
    "video generate karo",

    "create video",
    "create a video",

    "make video",
    "make a video",

    "generate video",

    "animation banao",
    "animated video",

    "clip banao",
    "reel banao"

  ];

  return keywords.some(
    keyword => text.includes(keyword)
  );
}

// ==================================================
// CHAT
// ==================================================

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

    // ==================================================
    // VIDEO REQUEST
    // ==================================================

    if (
      message &&
      isVideoRequest(message)
    ) {

      console.log(
        "VIDEO REQUEST:",
        message
      );

      const video =
        await generateVideo(message);

      return res.json({

        success: true,

        type: "video",

        reply:
          "Ye rahi aapki video 🎬",

        video

      });

    }

    // ==================================================
    // IMAGE REQUEST
    // ==================================================

    if (
      message &&
      isImageRequest(message)
    ) {

      console.log(
        "IMAGE REQUEST:",
        message
      );

      const generatedImage =
        await generateImage(message);

      return res.json({

        success: true,

        type: "image",

        reply:
          "Ye rahi aapki image 😊",

        image:
          generatedImage

      });

    }

    // ==================================================
    // NORMAL CHAT
    // ==================================================

    const contents = [];

    // Conversation memory
    if (Array.isArray(history)) {

      for (const item of history) {

        if (!item?.text) continue;

        contents.push({

          role:
            item.role === "user"
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

    const parts = [];

    if (message) {

      parts.push({

        text: `
You are a friendly AI Companion.

Personality:
- Warm
- Friendly
- Natural
- Helpful
- Hindi, Hinglish and English
- Conversational
- Do not falsely claim that you generated an image or video.

User message:
${message}
`

      });

    }

    // Uploaded image
    if (
      image &&
      image.data &&
      image.mimeType
    ) {

      parts.push({

        inline_data: {

          mime_type:
            image.mimeType,

          data:
            image.data

        }

      });

    }

    contents.push({

      role: "user",

      parts

    });

    const data =
      await geminiChat(contents);

    const reply =
      data?.candidates?.[0]
        ?.content?.parts
        ?.map(
          part => part.text || ""
        )
        .join("")
        .trim();

    if (!reply) {

      throw new Error(
        "Gemini returned empty response"
      );

    }

    return res.json({

      success: true,

      type: "text",

      reply

    });

  }

  catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Server error"

    });

  }

});

// ==================================================
// DIRECT IMAGE ENDPOINT
// ==================================================

app.post("/api/image", async (req, res) => {

  try {

    const {
      prompt
    } = req.body;

    if (!prompt) {

      return res.status(400).json({

        success: false,

        error:
          "Image prompt is required"

      });

    }

    const image =
      await generateImage(prompt);

    return res.json({

      success: true,

      type: "image",

      image

    });

  }

  catch (error) {

    console.error(
      "IMAGE ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error.message

    });

  }

});

// ==================================================
// DIRECT VIDEO ENDPOINT
// ==================================================

app.post("/api/video", async (req, res) => {

  try {

    const {
      prompt
    } = req.body;

    if (!prompt) {

      return res.status(400).json({

        success: false,

        error:
          "Video prompt is required"

      });

    }

    const video =
      await generateVideo(prompt);

    return res.json({

      success: true,

      type: "video",

      video

    });

  }

  catch (error) {

    console.error(
      "VIDEO ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error.message

    });

  }

});

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `AI Companion Backend running on port ${PORT}`
    );

  }
);
