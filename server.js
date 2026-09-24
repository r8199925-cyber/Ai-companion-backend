const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

const POLLINATIONS =
    "https://gen.pollinations.ai";

const API_KEY =
    process.env.POLLINATIONS_KEY;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));


/* =========================
   KEY CHECK
========================= */

function hasKey(res) {

    if (!API_KEY) {

        res.status(500).json({
            error: "POLLINATIONS_KEY missing"
        });

        return false;
    }

    return true;
}


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

    res.json({
        status: "AI Companion Backend",
        online: true
    });

});


/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

    res.json({
        ok: true,
        key: API_KEY ? "FOUND" : "MISSING"
    });

});


/* =========================
   MODELS
========================= */

app.get("/api/models", async (req, res) => {

    try {

        const response = await fetch(
            `${POLLINATIONS}/v1/models`
        );

        const data =
            await response.json();

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Models request failed"
        });

    }

});


/* =========================
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        if (!hasKey(res)) return;


        const message =
            String(
                req.body.message || ""
            ).trim();


        if (!message) {

            return res.status(400).json({
                error: "Message required"
            });

        }


        /*
          Current Pollinations default
          text model.
        */

        const response =
            await fetch(
                `${POLLINATIONS}/v1/chat/completions`,
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${API_KEY}`,

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        model:
                            "openai/gpt-5.4-nano",

                        messages: [

                            {
                                role: "system",

                                content:
                                    "You are a friendly AI companion. Reply naturally in Hindi, Hinglish or English according to the user's language."
                            },

                            {
                                role: "user",

                                content:
                                    message
                            }

                        ]

                    })

                }
            );


        const text =
            await response.text();


        if (!response.ok) {

            console.error(
                "CHAT ERROR:",
                response.status,
                text
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Chat API failed",

                details:
                    text

            });

        }


        const data =
            JSON.parse(text);


        const reply =
            data?.choices?.[0]?.message?.content ||
            "AI ne reply nahi diya.";


        res.json({

            reply: reply

        });


    } catch (error) {

        console.error(
            "CHAT SERVER ERROR:",
            error
        );


        res.status(500).json({

            error:
                "Chat generation failed",

            details:
                error.message

        });

    }

});


/* =========================
   IMAGE
========================= */

app.get("/api/image", async (req, res) => {

    try {

        if (!hasKey(res)) return;


        const prompt =
            String(
                req.query.prompt || ""
            ).trim();


        if (!prompt) {

            return res.status(400).json({

                error:
                    "Image prompt required"

            });

        }


        console.log(
            "IMAGE:",
            prompt
        );


        /*
          OpenAI-compatible image API.
          We ask Pollinations for a URL
          because frontend expects JSON.
        */

        const response =
            await fetch(
                `${POLLINATIONS}/v1/images/generations`,
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${API_KEY}`,

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        model:
                            "google/gemini-3.1-flash-image",

                        prompt:
                            prompt,

                        n: 1,

                        size:
                            "1024x1024",

                        response_format:
                            "url"

                    })

                }
            );


        const text =
            await response.text();


        if (!response.ok) {

            console.error(
                "IMAGE ERROR:",
                response.status,
                text
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Image API failed",

                status:
                    response.status,

                details:
                    text

            });

        }


        const data =
            JSON.parse(text);


        const imageUrl =
            data?.data?.[0]?.url;


        if (!imageUrl) {

            console.error(
                "IMAGE URL MISSING:",
                data
            );


            return res.status(500).json({

                error:
                    "Image URL missing",

                details:
                    JSON.stringify(data)

            });

        }


        console.log(
            "IMAGE URL CREATED"
        );


        res.json({

            imageUrl:
                imageUrl

        });


    } catch (error) {

        console.error(
            "IMAGE SERVER ERROR:",
            error
        );


        res.status(500).json({

            error:
                "Image generation failed",

            details:
                error.message

        });

    }

});


/* =========================
   VIDEO
========================= */

app.get("/api/video", async (req, res) => {

    try {

        if (!hasKey(res)) return;


        const prompt =
            String(
                req.query.prompt || ""
            ).trim();


        if (!prompt) {

            return res.status(400).json({

                error:
                    "Video prompt required"

            });

        }


        console.log(
            "VIDEO:",
            prompt
        );


        /*
          Current Pollinations video API.
        */

        const url =
            `${POLLINATIONS}/video/` +
            encodeURIComponent(prompt) +

            `?model=google%2Fveo-3.1-fast` +

            `&duration=4` +

            `&aspectRatio=16%3A9`;


        console.log(
            "VIDEO URL:",
            url
        );


        const response =
            await fetch(
                url,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${API_KEY}`

                    }

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "VIDEO ERROR:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Video API failed",

                status:
                    response.status,

                details:
                    errorText

            });

        }


        const contentType =
            response.headers.get(
                "content-type"
            ) || "video/mp4";


        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );


        console.log(
            "VIDEO GENERATED:",
            buffer.length,
            "bytes"
        );


        res.setHeader(
            "Content-Type",
            contentType
        );


        res.setHeader(
            "Content-Length",
            buffer.length
        );


        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        res.send(buffer);


    } catch (error) {

        console.error(
            "VIDEO SERVER ERROR:",
            error
        );


        res.status(500).json({

            error:
                "Video generation failed",

            details:
                error.message

        });

    }

});


/* =========================
   START
========================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "AI Companion Backend running on port",
            PORT
        );

        console.log(
            "Pollinations key:",
            API_KEY
                ? "FOUND"
                : "MISSING"
        );

    }
);
