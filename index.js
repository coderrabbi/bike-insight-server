const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
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

// function jwtVerify(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).send({ messege: "unvalid token" });
//   }
//   const token = authHeader.split(" ")[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//     if (err) return res.status(403).send({ messege: "forbidden token" });
//     req.decoded = decoded;
//     next();
//   });
// }

const getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_SECRET_EXPIRE,
  });
};

async function run() {
  try {
    const bikesCollection = client.db("bikeInsight").collection("bikes");
    const userCollection = client.db("bikeInsight").collection("users");
    const bookinsCollection = client.db("bikeInsight").collection("bookings");
    const bikesCategoryCollection = client
      .db("bikeInsight")
      .collection("bikesCategory");
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
    app.get("/bikes/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const product = await bikesCollection.find(query).toArray();
      res.send(product);
    });

    app.get("/bookings/", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookinsCollection.find(query).toArray();
      res.send(bookings);
    });
    // all post routes
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.send({ token });
      console.log(token);
    });

    // category post
    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await bookinsCollection.insertOne(bookings);
      res.send(result);
    });

    // login and register with jwt token

    // register users
    app.post("/user/register", async (req, res) => {
      const { email, password, userName, role } = req.body;
      const user = {
        email,
        // password: bcrypt.hash(password, 10),
        password,
        userName,
        role: role ? role : "buyer",
        isVarified: false,
      };
      const query = { email };
      const cursor = await userCollection.find(query).toArray();
      const isExist = cursor.find((mail) => mail.email === email);

      if (!isExist) {
        const result = await userCollection.insertOne(user);

        res.send({
          success: true,
          user: result,
          token: getJWTToken(),
        });
      } else {
        res.send("user already exist");
      }
    });

    app.post("/users", async (req, res) => {});

    app.post("/user/login", async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        res.send("please enter email and password");
      }
      const user = await userCollection.findOne({ email });
      if (!user) {
        res.send("Invalid email or password");
      }
      if (password !== user.password) {
        res.send("Invalid email or password");
      }
      const sendToken = (user, statusCode, res) => {
        const token = getJWTToken();
        const options = {
          expiresIn: new Date(
            Date.now + process.env.COOKIE_EXPIRATION * 24 * 60 * 60 * 1000
          ),
          httpOnly: true,
        };
        res.status(statusCode).cookie("token", token, options).json({
          success: true,
          user,
          token,
        });
      };
      sendToken(user, 201, res);
    });

    // logout
    app.get("/user/logout", async (req, res) => {
      res.cookie("token", null, {
        expiresIn: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
    // all users
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const users = await userCollection.findOne(query);
      res.send(users);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // register users
    app.post("/user/register", async (req, res) => {
      const { email, password, userName, role } = req.body;
      const user = {
        email,
        password,
        userName,
        role: role ? role : "buyer",
        isVarified: false,
      };
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));
app.listen(port, console.log("listing on port " + port));
