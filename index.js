const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const corsConfig = {
  origin: ["https://restora-mern.netlify.app", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};
app.use(cors(corsConfig));
app.options("", cors(corsConfig));
app.use(express.json());
app.use(cookieParser());

// Custom Middleware
// const VerifyToken = (req, res, next) => {
//   const CookieToken = req.cookie?.token;
//   console.log("token in the verify token", CookieToken);
//   if (!CookieToken) {
//     res.status(401).send({ message: "unauthorized access!" });
//   }
//   jwt.verify(CookieToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log("error", err);
//       return res.status(401).send({ message: "unauthorized access!!" });
//     }
//     console.log("decoded data: ", decoded);
//     req.user = decoded;
//     next();
//   });
// };

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
    const ordersCollection = client.db("RestoraDB").collection("orders");
    const subscribersCollection = client
      .db("RestoraDB")
      .collection("subscribers");

    // Auth API after login
    app.post("/jwt", async (req, res) => {
      const user = req?.body;
      // console.log(user);
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

    // Clear cookies after logout
    app.post("/jwt/logout", async (req, res) => {
      const user = req?.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 0,
        })
        .send({ logout: true });
    });

    // Store Foods to the database
    app.post("/foods", async (req, res) => {
      const newFood = req.body;
      // console.log(newFood);
      newFood.orderCount = 0;
      const result = await foodsCollection.insertOne(newFood);
      // console.log(result);
      res.send(result);
    });

    // Store subscribers email to the database
    app.post("/subscribe", async (req, res) => {
      const subscriber = req.body;
      const result = await subscribersCollection.insertOne(subscriber);
      res.send(result);
    });

    // Get food Data
    app.get("/foods", async (req, res) => {
      const page = parseInt(req.query?.page);
      const size = parseInt(req.query?.size);
      const result = await foodsCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // user food data
    app.get("/userAddedFoods", async (req, res) => {
      const user = req?.query?.user;
      const query = { "addedBy.email": user };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    // user ordered food data
    app.get("/orderedFood", async (req, res) => {
      const user = req?.query?.user;
      const query = { "orderedBy.buyerEmail": user };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // Get single food data
    app.get(`/foods/:id`, async (req, res) => {
      const foodId = req.params.id;
      const foodQuery = { _id: new ObjectId(foodId) };
      const result = await foodsCollection.findOne(foodQuery);
      res.send(result);
    });

    // Get Top Food data
    app.get("/topFoods", async (req, res) => {
      const sortFood = { orderCount: -1 };
      const topFoods = await foodsCollection
        .find()
        .sort(sortFood)
        .limit(6)
        .toArray();
      res.send(topFoods);
    });

    // Add Ordered Count to every foods [one time]
    app.put(`/orderFood/:id`, async (req, res) => {
      const id = req.params?.id;
      const orderedFood = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const getFoodInfo = await foodsCollection.findOne(filter);
      const { _id, ...foodInfo } = getFoodInfo;
      const updateCount = {
        $set: {
          orderCount: foodInfo.orderCount + 1,
          quantity: orderedFood.remainingQuantity,
        },
      };
      const orderedBy = {
        buyerName: orderedFood.orderedBy.userName,
        buyerEmail: orderedFood.orderedBy.userEmail,
      };

      foodInfo.orderedPrice = orderedFood.orderedPrice;
      foodInfo.orderedQuantity = orderedFood.orderedQuantity;
      foodInfo.purchaseDate = orderedFood.purchaseDate;
      foodInfo.orderedBy = orderedBy;

      const updateCountResult = await foodsCollection.updateOne(
        filter,
        updateCount,
        options
      );
      const addFoodResult = await ordersCollection.insertOne(foodInfo);
      res.send({ updateCountResult, addFoodResult });
    });

    // Update a food data
    app.put(`/foods/update`, async (req, res) => {
      const id = req.query.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFood = req.body;
      const addedBy = {
        name: updatedFood.addedBy.userName,
        email: updatedFood.addedBy.userEmail,
      };

      const UpdatedFoodInfo = {
        $set: {
          foodName: updatedFood.name,
          foodCategory: updatedFood.category,
          foodImage: updatedFood.image,
          quantity: updatedFood.quantity,
          price: updatedFood.price,
          addedBy: addedBy,
          foodOrigin: updatedFood.origin,
          description: updatedFood.description,
        },
      };

      const result = await foodsCollection.updateOne(
        filter,
        UpdatedFoodInfo,
        options
      );
      res.send(result);
    });

    // Delete an order
    app.delete(`/order/delete/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
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
