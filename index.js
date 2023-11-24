const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Custom Middleware
const VerifyToken = (req, res, next) => {
  const CookieToken = req.cookie?.token;
  console.log("token in the verify token", CookieToken);
  if (!CookieToken) {
    res.status(401).send({ message: "unauthorized access!" });
  }
  jwt.verify(CookieToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("error", err);
      return res.status(401).send({ message: "unauthorized access!!" });
    }
    console.log("decoded data: ", decoded);
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jmuxmrg.mongodb.net/?retryWrites=true&w=majority`;

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
    const foodsCollection = client.db("RestoraDB").collection("foods");

    // Auth API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // Store Foods to the database
    app.post("/foods", async (req, res) => {
      const newFood = req.body;
      console.log(newFood);
      const result = await foodsCollection.insertOne(newFood);
      console.log(result);
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      const cursor = foodsCollection.find();
      // const token = req.cookies?.token;
      // const user = req.query?.email;
      console.log("email: ", user);
      console.log("token: ", token);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
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
  res.send("server is running");
});
app.get("/test", (req, res) => {
  res.send("server testing");
  console.log("testing successfully");
});

app.listen(port, () => console.log(`server is running on port: ${port}`));
