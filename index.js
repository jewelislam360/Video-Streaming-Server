const express = require("express");
require("dotenv").config();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nn2sj3o.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db("videoStreamingDB");
    const allMovieCollection = db.collection("allMovies");

    app.get("/allMovies", async (req, res) => {
      const result = await allMovieCollection.find().toArray();
      res.send(result);
    });

    app.get("/allMovies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allMovieCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    //  search by text ---
    app.get("/searchName/:text", async (req, res) => {
      const indexKeys = { title: 1 };
      const indexOptions = { title: "title" };
      const result2 = await allMovieCollection.createIndex(
        indexKeys,
        indexOptions
      );
      const text = req.params.text;
      const result = await allMovieCollection
        .find({
          $or: [{ title: { $regex: text, $options: "i" } }],
        })
        .toArray();
      res.send(result);
    });

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
