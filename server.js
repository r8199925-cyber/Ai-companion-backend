const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json());


/* =================================
   HOME
================================= */

app.get("/", (req, res) => {

  res.json({
    status: "online",
    message: "AI Companion Backend"
  });

});


/* =================================
   NORMAL AI CHAT
================================= */

app.post("/api/chat", async (req, res) => {

  try {

    const message =
      req.body.message;

    if(!message){

      return res.status(400).json({
        error:"Message required"
      });

    }


    /*
      Pollinations text API
    */

    const url =
      "https://text.pollinations.ai/" +
      encodeURIComponent(message) +
      "?model=openai";


    const response =
      await fetch(url);


    if(!response.ok){

      throw new Error(
        "AI API error: " +
        response.status
      );

    }


    const reply =
      await response.text();


    res.json({

      reply: reply

    });

  }
  catch(error){

    console.error(error);

    res.status(500).json({

      error:
        "AI chat failed"

    });

  }

});


/* =================================
   IMAGE
================================= */

app.post("/api/image", async (req,res) => {

  try{

    const prompt =
      req.body.prompt;

    if(!prompt){

      return res.status(400).json({

        error:
          "Image prompt required"

      });

    }


    /*
      Current Pollinations
      image endpoint
    */

    const imageUrl =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(prompt) +
      "?width=1024&height=1024&model=flux";


    res.json({

      imageUrl:
        imageUrl

    });

  }
  catch(error){

    console.error(error);

    res.status(500).json({

      error:
        "Image generation failed"

    });

  }

});


/* =================================
   PORT
================================= */

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "AI Companion running on port " +
      PORT
    );

  }
);
