const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ObjectID,
} = require("mongodb");
const stripe = require("stripe")(
  "sk_test_51M8SDWAdpdqyZqEI8qp8BeNGgnNjw53ozYEq95sRoZGRlB37xbeBKfcrAPoMO19kdR82ryYjyFC8MS65mEHafQtd00TN7zMGd8"
);
require("dotenv").config();
const cookieParser = require("cookie-parser");
// middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.e40en03.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function jwtVerify(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ messege: "unvalid token" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) return res.status(403).send({ messege: "forbidden token" });
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const bikesCollection = client.db("bikeInsight").collection("bikes");
    const userCollection = client.db("bikeInsight").collection("users");
    const bookinsCollection = client.db("bikeInsight").collection("bookings");
    const productsCollection = client.db("bikeInsight").collection("products");
    const bikesCategoryCollection = client
      .db("bikeInsight")
      .collection("bikesCategory");
    const paymentsCollection = client.db("bikeInsight").collection("payments");
    // all get routes

    app.get("/", (req, res) => {
      res.send("query server is running");
    });
    app.get("/bikes", async (req, res) => {
      const query = {};
      const cursor = bikesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/bikescategory", async (req, res) => {
      const query = {};
      const result = await bikesCategoryCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/products/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const product = await productsCollection.find(query).toArray();
      res.send(product);
    });

    app.get("/bookings/", jwtVerify, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookinsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_SECRET_EXPIRE,
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ token: "unAuthorize" });
    });

    // category post
    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await bookinsCollection.insertOne(bookings);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const products = req.body;
      console.log(products.body);
      const result = await productsCollection.insertOne(products);
      res.send(result);
    });
    // login and register with jwt token
    app.post("/users", async (req, res) => {
      const user = req.body;
      const setUser = await userCollection.insertOne(user);
      res.send(setUser);
    });
    // products get
    app.get("/products", async (req, res) => {
      const query = {};
      const product = await productsCollection.find(query).toArray();
      res.send(product);
    });
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await productsCollection.find(query).toArray();
      res.send(bookings);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const bookings = await productsCollection.findOne(query);
      res.send(bookings);
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const newProduct = await productsCollection.deleteOne(query);
      res.send(newProduct);
    });

    // all users
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({
        isAdmin: user?.role === "admin",
        isSeller: user?.role === "seller",
        email: user?.email,
      });
    });

    // stripe

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.sellprice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookinsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result, updatedResult);
    });

    // adviertise route

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const advertiseItem = req.body;
      const updateAdvertiseItem = {
        $set: {
          advertise: advertiseItem.advertise,
        },
      };
      const result = await productsCollection.updateOne(
        query,
        updateAdvertiseItem
      );
      res.send(result);
      console.log(advertiseItem);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const bookings = await bookinsCollection.findOne(query);
      res.send(bookings);
    });
    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const newReview = await userCollection.deleteOne(query);
      res.send(newReview);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const newBookings = await bookinsCollection.deleteOne(query);
      res.send(newBookings);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));
app.listen(port, console.log("listing on port " + port));
