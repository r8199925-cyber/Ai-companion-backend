const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;

const CHAT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.7-flash";

const IMAGE_MODEL =
  "gemini-3.1-flash-image";

const VIDEO_MODEL =
  "veo-3.1-generate-preview";


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "AI Companion Backend",
    chat: true,
    photo: true,
    imageGeneration: true,
    videoGeneration: true
  });
});


/* =========================
   CHAT + PHOTO
========================= */

app.post("/api/chat", async (req, res) => {

  try {

    if (!API_KEY) {
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


    /* Previous conversation */

    history.slice(-20).forEach(item => {

      if (!item.text) return;

      contents.push({
        role:
          item.role === "model"
            ? "model"
            : "user",

        parts: [
          {
            text: String(item.text)
          }
        ]
      });

    });


    /* Current message */

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

Talk naturally.

If the user speaks Hindi, reply in Hindi.
If the user speaks English, reply in English.

Remember useful information from the conversation.

User message:
${message || "Please analyze the uploaded image."}
`
      }

    ];


    /* Photo */

    if (image && image.data) {

      parts.push({

        inline_data: {

          mime_type:
            image.mimeType || "image/jpeg",

          data:
            image.data

        }

      });

    }


    contents.push({

      role: "user",

      parts: parts

    });


    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent`;


    const response =
      await fetch(url, {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            API_KEY

        },

        body: JSON.stringify({

          contents: contents

        })

      });


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "CHAT ERROR:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          "Gemini chat error"

      });

    }


    const reply =
      data?.candidates?.[0]
        ?.content?.parts
        ?.map(
          p => p.text || ""
        )
        .join("")
        .trim();


    if (!reply) {

      return res.status(500).json({

        error:
          "Gemini returned empty response"

      });

    }


    res.json({

      reply: reply

    });

  }

  catch (error) {

    console.error(
      "CHAT SERVER ERROR:",
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


/* =========================
   TEXT → IMAGE
========================= */

app.post("/api/image", async (req, res) => {

  try {

    if (!API_KEY) {

      return res.status(500).json({

        error:
          "GEMINI_API_KEY is not configured"

      });

    }


    const prompt =
      String(
        req.body.prompt || ""
      ).trim();


    if (!prompt) {

      return res.status(400).json({

        error:
          "Image prompt is required"

      });

    }


    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;


    const response =
      await fetch(url, {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            API_KEY

        },

        body: JSON.stringify({

          contents: [

            {

              role: "user",

              parts: [

                {
                  text: prompt
                }

              ]

            }

          ],

          generationConfig: {

            responseModalities: [
              "TEXT",
              "IMAGE"
            ]

          }

        })

      });


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "IMAGE ERROR:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          "Image generation failed"

      });

    }


    const parts =
      data?.candidates?.[0]
        ?.content?.parts || [];


    let image = null;
    let text = "";


    for (const part of parts) {

      if (part.text) {

        text += part.text;

      }


      if (
        part.inlineData &&
        part.inlineData.data
      ) {

        image =
          part.inlineData.data;

      }

    }


    if (!image) {

      return res.status(500).json({

        error:
          "No image returned by Gemini"

      });

    }


    res.json({

      image:
        `data:image/png;base64,${image}`,

      text: text

    });

  }

  catch (error) {

    console.error(
      "IMAGE SERVER ERROR:",
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


/* =========================
   TEXT → VIDEO
========================= */

app.post("/api/video", async (req, res) => {

  try {

    if (!API_KEY) {

      return res.status(500).json({

        error:
          "GEMINI_API_KEY is not configured"

      });

    }


    const prompt =
      String(
        req.body.prompt || ""
      ).trim();


    if (!prompt) {

      return res.status(400).json({

        error:
          "Video prompt is required"

      });

    }


    /* Start Veo operation */

    const startURL =
      `https://generativelanguage.googleapis.com/v1beta/models/${VIDEO_MODEL}:predictLongRunning`;


    const startResponse =
      await fetch(startURL, {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            API_KEY

        },

        body: JSON.stringify({

          instances: [

            {

              prompt: prompt

            }

          ],

          parameters: {

            aspectRatio: "9:16",

            resolution: "720p",

            numberOfVideos: 1

          }

        })

      });


    const startData =
      await startResponse.json();


    if (!startResponse.ok) {

      console.error(
        "VIDEO START ERROR:",
        startData
      );

      return res.status(
        startResponse.status
      ).json({

        error:
          startData?.error?.message ||
          "Could not start video generation"

      });

    }


    const operationName =
      startData.name;


    if (!operationName) {

      return res.status(500).json({

        error:
          "Video operation ID was not returned"

      });

    }


    /* Poll */

    let operation = null;


    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {

      await new Promise(
        resolve =>
          setTimeout(resolve, 10000)
      );


      const statusURL =
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`;


      const statusResponse =
        await fetch(statusURL, {

          headers: {

            "x-goog-api-key":
              API_KEY

          }

        });


      operation =
        await statusResponse.json();


      if (operation.done) {

        break;

      }

    }


    if (
      !operation ||
      !operation.done
    ) {

      return res.status(202).json({

        status:
          "processing",

        message:
          "Video is still generating. Please try again shortly."

      });

    }


    if (operation.error) {

      return res.status(500).json({

        error:
          operation.error.message ||
          "Video generation failed"

      });

    }


    const video =
      operation
        ?.response
        ?.generateVideoResponse
        ?.generatedSamples?.[0]
        ?.video;


    if (!video || !video.uri) {

      return res.status(500).json({

        error:
          "Video generated but video URL was not returned"

      });

    }


    /*
      Return Google's video URI.
      The frontend can request it with the API key
      only if the backend proxies the file.
    */

    const videoResponse =
      await fetch(
        video.uri,
        {

          headers: {

            "x-goog-api-key":
              API_KEY

          }

        }
      );


    if (!videoResponse.ok) {

      return res.status(500).json({

        error:
          "Could not download generated video"

      });

    }


    const videoBuffer =
      Buffer.from(
        await videoResponse.arrayBuffer()
      );


    res.json({

      video:
        `data:video/mp4;base64,${videoBuffer.toString("base64")}`

    });

  }

  catch (error) {

    console.error(
      "VIDEO SERVER ERROR:",
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `AI Companion backend running on port ${PORT}`
    );

  }
);
