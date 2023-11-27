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

    const requestCollection = client
      .db("BloodBridgeDB")
      .collection("requestCollection");

    // TOKEN AUTH API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // MIDDLEWARE
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // after token, then verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden acesss" });
      }
      next();
    };

    // ----------------------- USER RELATED APIS -----------------------------
    // ++USER POST API++
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // ++USER PROFILE PATCH API++
    app.put("/users/update/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedUser = req.body;
      const details = {
        $set: {
          name: updatedUser.name,
          image: updatedUser.image,
          blood_group: updatedUser.blood_group,
          district: updatedUser.district,
          upazilla: updatedUser.upazilla,
        },
      };

      const result = await userCollection.updateOne(query, details, options);
      res.send(result);
    });

    // +USER PATCH BLOCK API++
    app.patch(
      "/users/block/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // +USER PATCH UNBLOCK API++
    app.patch(
      "/users/unblock/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // +USER PATCH MAKE VOLUNTEER API++
    app.patch(
      "/users/volunteer/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // +USER PATCH MAKE DONOR API++
    app.patch(
      "/users/donor/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // +USER PATCH ADMIN API++
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // ++USER GET API++
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // ++USER SINGLE GET API++
    app.get("/users/data/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized" });
      }
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // ++USER GET ADMIN API++
    app.get(
      "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let isAdmin = false;
        if (user) {
          isAdmin = user?.role === "admin";
        }
        res.send({ isAdmin });
      }
    );

    // ----------------------- DONATION RELATED APIS -----------------------------
    // ++REQUEST DONATION POST API++
    app.post("/donation-requests", async (req, res) => {
      const requestInfo = req.body;
      const result = await requestCollection.insertOne(requestInfo);
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
