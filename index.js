const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iixzvov.mongodb.net/?retryWrites=true&w=majority`;

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
    // LOADING COLLECTIONS
    const userCollection = client
      .db("BloodBridgeDB")
      .collection("userCollection");

    // ----------------------- USER RELATED APIS -----------------------------
    // ++USER POST API++
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // +USER PATCH BLOCK API++
    app.patch("/users/block/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedUser = {
        $set: {
          status: "blocked",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // +USER PATCH UNBCLOCK API++
    app.patch("/users/unblock/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedUser = {
        $set: {
          status: "active",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // +USER PATCH MAKE VOLUNTEER API++
    app.patch("/users/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedUser = {
        $set: {
          role: "volunteer",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // +USER PATCH MAKE DONOR API++
    app.patch("/users/donor/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedUser = {
        $set: {
          role: "donor",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // +USER PATCH ADMIN API++
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // ++USER GET API++
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

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
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("Server listening on port", port);
});
