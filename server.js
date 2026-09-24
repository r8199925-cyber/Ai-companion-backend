const express = require("express");
const cors = require("cors");

const app = express();

const PORT =
    process.env.PORT || 10000;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));


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
        message: "AI Companion Backend is running"
    });

});


/* =========================
   NORMAL CHAT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        const message =
            String(req.body.message || "").trim();


        if (!message) {

            return res.status(400).json({
                error: "Message required"
            });

        }


        const apiKey =
            process.env.POLLINATIONS_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "POLLINATIONS_KEY missing in Render"
            });

        }


        const response =
            await fetch(
                "https://gen.pollinations.ai/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + apiKey,

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        model:
                            "openai/gpt-5.6-luna",

                        messages: [

                            {
                                role: "system",

                                content:
                                    "You are a friendly AI companion. Reply naturally and helpfully. Use simple language when possible."
                            },

                            {
                                role: "user",

                                content:
                                    message
                            }

                        ],

                        temperature:
                            0.8

                    })
                }
            );


        const raw =
            await response.text();


        if (!response.ok) {

            console.error(
                "CHAT API ERROR:",
                raw
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Pollinations chat failed",

                details:
                    raw

            });

        }


        const data =
            JSON.parse(raw);


        const reply =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.text ||
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

        const prompt =
            String(req.query.prompt || "").trim();


        if (!prompt) {

            return res.status(400).json({
                error: "Image prompt required"
            });

        }


        const apiKey =
            process.env.POLLINATIONS_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "POLLINATIONS_KEY missing in Render"
            });

        }


        const url =
            "https://gen.pollinations.ai/image/" +
            encodeURIComponent(prompt) +
            "?model=google%2Fgemini-3.1-flash-image" +
            "&width=1024" +
            "&height=1024";


        /*
          Pollinations image endpoint
          returns actual image bytes.
        */

        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + apiKey
                    }
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "IMAGE API ERROR:",
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Pollinations image failed",

                details:
                    errorText

            });

        }


        const contentType =
            response.headers.get(
                "content-type"
            ) || "image/jpeg";


        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );


        res.setHeader(
            "Content-Type",
            contentType
        );


        res.send(buffer);


    } catch (error) {

        console.error(
            "IMAGE ERROR:",
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
   IMAGE JSON VERSION
========================= */

app.get("/api/image-url", async (req, res) => {

    try {

        const prompt =
            String(req.query.prompt || "").trim();


        if (!prompt) {

            return res.status(400).json({
                error: "Image prompt required"
            });

        }


        const apiKey =
            process.env.POLLINATIONS_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "POLLINATIONS_KEY missing in Render"
            });

        }


        const url =
            "https://gen.pollinations.ai/image/" +
            encodeURIComponent(prompt) +
            "?model=google%2Fgemini-3.1-flash-image" +
            "&width=1024" +
            "&height=1024";


        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + apiKey
                    }
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            return res.status(
                response.status
            ).json({

                error:
                    "Image generation failed",

                details:
                    errorText

            });

        }


        /*
          We proxy the generated image
          through our backend.
        */

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );


        const base64 =
            buffer.toString("base64");


        const contentType =
            response.headers.get(
                "content-type"
            ) || "image/jpeg";


        const imageUrl =
            "data:" +
            contentType +
            ";base64," +
            base64;


        res.json({
            imageUrl
        });


    } catch (error) {

        console.error(error);


        res.status(500).json({

            error:
                "Image generation failed"

        });

    }

});


/* =========================
   VIDEO
========================= */

app.get("/api/video", async (req, res) => {

    try {

        const prompt =
            String(req.query.prompt || "").trim();


        if (!prompt) {

            return res.status(400).json({

                error:
                    "Video prompt required"

            });

        }


        const apiKey =
            process.env.POLLINATIONS_KEY;


        if (!apiKey) {

            return res.status(500).json({

                error:
                    "POLLINATIONS_KEY missing in Render"

            });

        }


        /*
          Current Pollinations video API
        */

        const videoUrl =
            "https://gen.pollinations.ai/video/" +
            encodeURIComponent(prompt) +

            "?model=google%2Fveo-3.1-fast" +

            "&duration=4" +

            "&aspectRatio=16%3A9";


        console.log(
            "VIDEO REQUEST:",
            prompt
        );


        const response =
            await fetch(
                videoUrl,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + apiKey
                    }
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "VIDEO API ERROR:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Pollinations video failed",

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
            "VIDEO SIZE:",
            buffer.length
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
   START SERVER
========================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "AI Companion server running on port " +
            PORT
        );

    }
);
