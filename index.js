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

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden acess" });
      }
      next();
    };

    const verifyDonor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDonor = user?.role === "donor";
      if (!isDonor) {
        return res.status(403).send({ message: "forbidden acess" });
      }
      next();
    };

    const verifyDonorOrAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDonorOrAdmin = user.role === "donor" || user.role === "admin";
      if (!isDonorOrAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifyVolunteerOrAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isVolunteerOrAdmin =
        user && (user.role === "volunteer" || user.role === "admin");
      if (!isVolunteerOrAdmin) {
        return res.status(403).send({ message: "forbidden access" });
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

    // ++USER GET DONOR API++
    app.get(
      "/users/donor/:email",
      verifyToken,
      verifyDonor,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let isDonor = false;
        if (user) {
          isDonor = user?.role === "donor";
        }
        res.send({ isDonor });
      }
    );

    // ----------------------- DONATION RELATED APIS -----------------------------
    // ++REQUEST DONATION POST API++
    app.post("/donation-requests", async (req, res) => {
      const requestInfo = req.body;
      const result = await requestCollection.insertOne(requestInfo);
      res.send(result);
    });

    // ++REQUEST DONATION GET ALL API++
    app.get("/donation-requests", async (req, res) => {
      const result = await requestCollection.find().toArray();
      res.send(result);
    });

    // ++REQUEST DONATION GET SINGLE API++
    app.get("/donation-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          res.status(400).send({ error: "Invalid product ID" });
          return;
        }

        const query = { _id: new ObjectId(id) };
        const result = await requestCollection.findOne(query);

        if (!result) {
          res.status(404).send({ error: "Product not found" });
          return;
        }

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // ++REQUEST DONATION STATUS TO INPROGRESS API++
    app.put(
      "/donation-requests/inprogress/:id",
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id),
        };
        const options = { upsert: true };
        const body = req.body;
        const updatedDonation = {
          $set: {
            request_status: "inprogress",
            donor_name: body.donor_name,
            donor_email: body.donor_email,
          },
        };
        const result = await requestCollection.updateOne(
          query,
          updatedDonation,
          options
        );

        res.send(result);
      }
    );

    // ++REQUEST DONATION GET ALL BASED ON EMAIL++
    app.get(
      "/user/donation-requests",
      verifyToken,
      verifyDonor,
      async (req, res) => {
        query = { requester_email: req.query.email };

        if (req.query?.filter) {
          query.request_status = req.query.filter;
        }

        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);

        const result = await requestCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }
    );

    // ++REQUEST DONATION GET ALL FOR ADMIN AND VOLUNTEER ONLY++
    app.get(
      "/admin/donation-requests",
      verifyToken,
      verifyVolunteerOrAdmin,
      async (req, res) => {
        let query = {};
        if (req.query?.filter) {
          query.request_status = req.query.filter;
        }

        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);

        const result = await requestCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }
    );

    // ++REQUEST DONATION GET FIRST THREE LATEST DONATIONS BASED ON EMAIL++
    app.get(
      "/user/donation-requests/recent",
      verifyToken,
      verifyDonor,
      async (req, res) => {
        query = { requester_email: req.query.email };

        const result = await requestCollection
          .find(query)
          .sort({ creation_time: -1 }) // Sort by creation_time in descending order
          .limit(3) // Limit the results to three entries
          .toArray();

        res.send(result);
      }
    );

    // ++REQUEST DONATION GET ALL BASED ON EMAIL++ (COUNT)
    app.get(
      "/user/donation-requests/count",
      verifyToken,
      verifyDonor,
      async (req, res) => {
        let query = {};
        if (req.query?.email) {
          query.requester_email = req.query.email;
        }

        if (req.query?.filter) {
          console.log(req.query.filter);
          query.request_status = req.query.filter;
        }

        const count = await requestCollection.countDocuments(query);
        res.send({ count });
      }
    );

    // ++REQUEST DONATION GET ALL FOR ADMIN AND VOLUNTEER++ (COUNT)
    app.get(
      "/admin/donation-requests/count",
      verifyToken,
      verifyVolunteerOrAdmin,
      async (req, res) => {
        let query = {};

        if (req.query?.filter) {
          console.log(req.query.filter);
          query.request_status = req.query.filter;
        }

        const count = await requestCollection.countDocuments(query);
        res.send({ count });
      }
    );

    // ++REQUEST DONATION PATCH STATUS TO DONE API++
    app.patch(
      "/donation-requests/patch-done/:id",
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedRequest = {
          $set: {
            request_status: "done",
          },
        };
        const result = await requestCollection.updateOne(query, updatedRequest);
        res.send(result);
      }
    );

    // ++REQUEST DONATION PATCH STATUS TO CANCELLED API++
    app.patch(
      "/donation-requests/patch-cancel/:id",
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedRequest = {
          $set: {
            request_status: "cancelled",
          },
        };
        const result = await requestCollection.updateOne(query, updatedRequest);
        res.send(result);
      }
    );

    // ++REQUEST DONATION DELETE API++
    app.delete(
      "/donation-requests/delete/:id",
      verifyToken,
      verifyDonorOrAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await requestCollection.deleteOne(query);
        res.send(result);
      }
    );

    // ++REQUEST DONATION UPDATE API++
    app.put(
      "/donation-requests/update/:id",
      verifyToken,
      verifyDonorOrAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedRequest = req.body;
        const details = {
          $set: {
            requester_message: updatedRequest.requester_message,
            recipient_name: updatedRequest.recipient_name,
            hospital_name: updatedRequest.hospital_name,
            address: updatedRequest.address,
            recipient_district: updatedRequest.recipient_district,
            recipient_upazilla: updatedRequest.recipient_upazilla,
            request_date: updatedRequest.request_date,
            request_time: updatedRequest.request_time,
          },
        };

        const result = await requestCollection.updateOne(
          query,
          details,
          options
        );
        res.send(result);
      }
    );

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
