const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json());

/* =========================
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {

  try {

    const message =
      req.body.message;

    if(!message) {

      return res.status(400).json({
        error: "Message required"
      });

    }


    /*
      Yahan apna AI API call lagao.
      Example ke liye temporary reply.
    */

    const reply =
      "Tumne kaha: " + message;


    res.json({
      reply: reply
    });

  }

  catch(error) {

    console.error(error);

    res.status(500).json({
      error: "Chat failed"
    });

  }

});


/* =========================
   IMAGE
========================= */

app.post("/api/image", async (req, res) => {

  try {

    const prompt =
      req.body.prompt;

    if(!prompt) {

      return res.status(400).json({
        error: "Prompt required"
      });

    }


    /*
      YAHAN IMAGE API CONNECT KARNI HAI.

      API se image URL milne ke baad:

      res.json({
        imageUrl: imageUrl
      });
    */


    res.status(501).json({

      error:
        "Image API not connected yet",

      prompt:
        prompt

    });

  }

  catch(error) {

    console.error(error);

    res.status(500).json({

      error:
        "Image generation failed"

    });

  }

});


/* =========================
   HEALTH
========================= */

app.get("/", (req, res) => {

  res.send(
    "AI Companion Backend Online"
  );

});


/* =========================
   SERVER
========================= */

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "Server running on port " +
      PORT
    );

  }
);
