const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("server is running");
});
app.get("/test", (req, res) => {
  res.send("server testing");
});

app.listen(port, () => console.log(`server is running on port: ${port}`));
