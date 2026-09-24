const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

const POLLINATIONS_BASE = "https://gen.pollinations.ai";
const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY;


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));


/* =========================================
   CHECK API KEY
========================================= */

function checkApiKey(res) {

    if (!POLLINATIONS_KEY) {

        res.status(500).json({
            error: "POLLINATIONS_KEY missing in Render"
        });

        return false;
    }

    return true;
}


/* =========================================
   HOME
========================================= */

app.get("/", (req, res) => {

    res.json({
        status: "AI Companion Backend",
        online: true
    });

});


/* =========================================
   HEALTH
========================================= */

app.get("/health", (req, res) => {

    res.json({
        ok: true,
        server: "AI Companion Backend",
        pollinationsKey:
            !!POLLINATIONS_KEY
    });

});


/* =========================================
   GET AVAILABLE MODELS
========================================= */

async function getModels() {

    const response = await fetch(
        `${POLLINATIONS_BASE}/v1/models`
    );

    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `Models API ${response.status}: ${text}`
        );
    }

    return await response.json();
}


/* =========================================
   FIND TEXT MODEL AUTOMATICALLY
========================================= */

async function getTextModel() {

    const data =
        await getModels();

    const models =
        Array.isArray(data.data)
            ? data.data
            : [];


    /*
      First look for a model that supports
      text input/output.
    */

    let model =
        models.find((m) => {

            const input =
                m.input_modalities ||
                m.inputModality ||
                [];

            const output =
                m.output_modalities ||
                m.outputModality ||
                [];

            return (
                input.includes("text") &&
                output.includes("text")
            );

        });


    /*
      If metadata format is different,
      use known text model IDs.
    */

    if (!model) {

        const preferred = [

            "openai/gpt-5.4-nano",
            "openai/gpt-5.4",
            "anthropic/claude-sonnet-4.6",
            "deepseek/deepseek-v4-flash"

        ];


        for (const id of preferred) {

            const found =
                models.find(
                    (m) => m.id === id
                );

            if (found) {

                model = found;

                break;
            }
        }
    }


    /*
      Last fallback:
      choose a model whose category
      looks like text.
    */

    if (!model) {

        model =
            models.find(
                (m) =>
                    m.category === "text"
            );
    }


    if (!model) {

        throw new Error(
            "No text model available from /v1/models"
        );
    }


    console.log(
        "Selected text model:",
        model.id
    );


    return model.id;
}


/* =========================================
   DEBUG MODELS
========================================= */

app.get("/api/models", async (req, res) => {

    try {

        const data =
            await getModels();


        const models =
            Array.isArray(data.data)
                ? data.data
                : [];


        res.json({

            count:
                models.length,

            models:
                models.map(
                    (m) => ({
                        id: m.id,
                        category: m.category,
                        owned_by: m.owned_by,
                        input_modalities:
                            m.input_modalities,
                        output_modalities:
                            m.output_modalities
                    })
                )

        });


    } catch (error) {

        console.error(
            "MODELS ERROR:",
            error
        );


        res.status(500).json({

            error:
                "Could not load models",

            details:
                error.message

        });

    }

});


/* =========================================
   NORMAL CHAT
========================================= */

app.post("/api/chat", async (req, res) => {

    try {

        if (!checkApiKey(res)) {
            return;
        }


        const message =
            String(
                req.body.message || ""
            ).trim();


        if (!message) {

            return res.status(400).json({

                error:
                    "Message required"

            });

        }


        /*
          Automatically find a working
          text model from /v1/models.
        */

        const model =
            await getTextModel();


        console.log(
            "CHAT MODEL:",
            model
        );


        const response =
            await fetch(
                `${POLLINATIONS_BASE}/v1/chat/completions`,
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${POLLINATIONS_KEY}`,

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        model: model,

                        messages: [

                            {
                                role: "system",

                                content:
                                    "You are a friendly AI Companion. Reply naturally, helpfully and clearly. The user may speak Hindi, Hinglish or English. Reply in the same language when appropriate."
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


        const raw =
            await response.text();


        if (!response.ok) {

            console.error(
                "CHAT API ERROR:",
                response.status,
                raw
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Pollinations chat failed",

                status:
                    response.status,

                details:
                    raw

            });

        }


        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (e) {

            console.error(
                "INVALID CHAT JSON:",
                raw
            );

            return res.status(500).json({

                error:
                    "Invalid response from AI",

                details:
                    raw

            });

        }


        const reply =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.text ||
            "AI ne reply nahi diya.";


        res.json({

            reply: reply,

            model: model

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


/* =========================================
   IMAGE GENERATION
========================================= */

app.get("/api/image", async (req, res) => {

    try {

        if (!checkApiKey(res)) {
            return;
        }


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


        const imageUrl =
            `${POLLINATIONS_BASE}/image/` +
            encodeURIComponent(prompt) +
            `?width=1024` +
            `&height=1024`;


        console.log(
            "IMAGE REQUEST:",
            prompt
        );


        const response =
            await fetch(
                imageUrl,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${POLLINATIONS_KEY}`

                    }

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "IMAGE API ERROR:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Pollinations image failed",

                status:
                    response.status,

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


        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        res.send(buffer);


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


/* =========================================
   VIDEO GENERATION
========================================= */

app.get("/api/video", async (req, res) => {

    try {

        if (!checkApiKey(res)) {
            return;
        }


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


        /*
          Current Pollinations video endpoint.
        */

        const videoUrl =
            `${POLLINATIONS_BASE}/video/` +
            encodeURIComponent(prompt) +

            `?duration=4` +

            `&aspectRatio=16%3A9`;


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
                            `Bearer ${POLLINATIONS_KEY}`

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


/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `AI Companion Backend running on port ${PORT}`
        );

        console.log(
            "Pollinations key:",
            POLLINATIONS_KEY
                ? "FOUND"
                : "MISSING"
        );

    }
);
