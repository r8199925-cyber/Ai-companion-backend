const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const POLLINATIONS = "https://gen.pollinations.ai";
const API_KEY = process.env.POLLINATIONS_KEY;

app.use(cors());
app.use(express.json({ limit: "10mb" }));


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

        const response =
            await fetch(
                `${POLLINATIONS}/v1/models`
            );

        const text =
            await response.text();

        if (!response.ok) {

            return res.status(
                response.status
            ).json({

                error:
                    "Models request failed",

                details:
                    text
            });
        }

        res.json(
            JSON.parse(text)
        );

    } catch (error) {

        console.error(
            "MODELS ERROR:",
            error
        );

        res.status(500).json({

            error:
                "Models request failed",

            details:
                error.message
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

        console.log(
            "CHAT:",
            message
        );


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
                            "openai",

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
            "IMAGE REQUEST:",
            prompt
        );


        /*
          Current Pollinations image API.

          nanobanana-2 is a current
          Pollinations image model.
        */

        const imageURL =
            `${POLLINATIONS}/image/` +
            encodeURIComponent(prompt) +
            `?model=nanobanana-2` +
            `&width=1024` +
            `&height=1024`;


        console.log(
            "IMAGE URL:",
            imageURL
        );


        /*
          Test generation request.
        */

        const response =
            await fetch(
                imageURL,
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
                "IMAGE ERROR:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Image API failed",

                status:
                    response.status,

                details:
                    errorText
            });
        }


        /*
          Return URL to frontend.
        */

        res.json({

            imageUrl:
                imageURL

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
            "VIDEO REQUEST:",
            prompt
        );


        /*
          Current Pollinations
          video endpoint.

          veo = current video model.
        */

        const videoURL =
            `${POLLINATIONS}/video/` +
            encodeURIComponent(prompt) +
            `?model=veo` +
            `&duration=4` +
            `&aspectRatio=16:9`;


        console.log(
            "VIDEO URL:",
            videoURL
        );


        const response =
            await fetch(
                videoURL,
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


        if (!buffer.length) {

            return res.status(500).json({

                error:
                    "Empty video received"
            });
        }


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
            "================================="
        );

        console.log(
            "AI Companion Backend ONLINE"
        );

        console.log(
            "PORT:",
            PORT
        );

        console.log(
            "Pollinations Key:",
            API_KEY
                ? "FOUND"
                : "MISSING"
        );

        console.log(
            "================================="
        );
    }
);
