const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwtCheck = require("./middleware/middleware");
const jwtSign = require("./middleware/jwtImplement");

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nn2sj3o.mongodb.net/?retryWrites=true&w=majority`;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.mongodb_uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// const token = jwtSign({ user: "emon", email: "emon@gmail.com" });
// console.log(token);

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //Database
    const db = client.db("videoStreamingDB");

    //videos collection
    const allMovieCollection = db.collection("allMovies");

    //users collection
    const userCollection = db.collection("users");

    //message collection
    const messageCollection = db.collection("messages");

    //--------------------//

    //payment routes

    app.get("/config", (req, res) => {
      res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    });

    app.post("/payment-success", async (req, res) => {
      console.log(req.body, "payment -success line 59");
    });

    app.post("/create-payment-intent", async (req, res) => {
      // Create a PaymentIntent with the amount, currency, and a payment method type.
      //
      // See the documentation [0] for the full list of supported parameters.
      //
      // [0] https://stripe.com/docs/api/payment_intents/create
      try {
        // const amount = req.body.price * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: 1500,
          automatic_payment_methods: { enabled: true },
        });

        // Send publishable key and PaymentIntent details to client
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (e) {
        console.log(e, "line 77");
        return res.status(400).send({
          error: {
            message: e.message,
          },
        });
      }
    });
    //--------------------//

    //users route start

    //signUp
    app.post("/signUp", async (req, res) => {
      try {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        const token = jwtSign(result);
        res.status(201).json({ user: result, token });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    //login user
    app.post("/login", async (req, res) => {
      try {
        const user = req.body;
        const result = await userCollection.findOne({ email: user?.email });
        if (result) {
          const token = jwtSign(result);
          res.status(200).json({ user: result, token });
        } else {
          res.status(404).json({ message: "User not found !" });
        }
      } catch (error) {
        res.status(error.statusCode).json({ message: error.message });
      }
    });

    //edit user
    app.patch("/userEdit/:email", jwtCheck, async (req, res) => {
      try {
        const email = req.params.email;
        const updateUser = req.body;
        const result = await userCollection.updateOne({ email }, updateUser);
        res.status(204).json(result);
      } catch (error) {
        res.status(error.statusCode).json({ message: error.message });
      }
    });

    //users route end

    //--------------------//

    //videos route start
    //get all movies
    app.get("/allMovies", async (req, res) => {
      const result = await allMovieCollection.find().toArray();
      res.send(result);
    });

    //post a new movie
    app.post("/allMovies", async (req, res) => {
      const video = req.body;
      try {
        console.log(video, "video");
        const result = await allMovieCollection.insertOne({
          ...video,
          createdAt: new Date(),
        });
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    //get a single movie using id
    app.get("/allMovies/:id", async (req, res) => {
      try {
        const _id = req.params.id;
        const video = await allMovieCollection.findOne({ _id });
        res.status(200).json(video);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    });

    //get movie with search text
    app.get("/allMovies/search", async (req, res) => {
      try {
        const query = { title: { $regex: req.params, $options: "i" } };
        const result = await allMovieCollection.findOne(query);
        res.status(200).json(result);
      } catch (error) {
        res.status(404).json({ message: error.message });
      }
    });

    app.get("/aggregation", async (req, res) => {
      try {
        const result = await allMovieCollection
          .aggregate([
            {
              $group: {
                _id: { dayOfWeek: { $dayOfWeek: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray(); // Convert the result to an array

        res.send(result);
      } catch (error) {
        // Handle any errors that may occur during the aggregation
        console.error(error);
        res.status(500).send("An error occurred");
      }
    });

    //videos route end

    //--------------------//

    //messages route start

    //get all for a video messages
    app.get("/messages/:id", async (req, res) => {
      try {
        const videoId = req.params.id;
        const messages = await messageCollection.find({ videoId }).toArray();
        res.status(200).json(messages);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.post("/messages", async (req, res) => {
      try {
        const newMessages = req.body;
        const result = await messageCollection.insertOne({
          ...newMessages,
          createdAt: Date.now(),
        });
        res.status(201).send({ result });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Video streaming server is running ");
});

app.listen(port, () => {
  console.log(`Video streaming server is running on port: ${port}`);
});
