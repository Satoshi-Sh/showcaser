import express, { Request, Response } from "express";
import getData, { pool } from "./database";
const path = require("path");
import { shortenText, hashPassword, comparePassword } from "./utils";
import multer from "multer";
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const {
  configurePassport,
  generateToken,
  authenticateToken,
} = require("./auth");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.json());
app.use(cookieParser());

// for header
const checkLoginStatus = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  let decoded;
  if (token) {
    try {
      // Verify and decode the token
      decoded = jwt.verify(token, process.env["SECRET"]) as {
        id: number;
        displayname: string;
        description: string;
        username: string;
        avatar_path: string;
      };
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }
  res.locals.isLoggedIn = decoded ? true : false;
  if (decoded) {
    res.locals.user = decoded;
  }
  next();
};
app.use(checkLoginStatus);

configurePassport();
// Configure multer
const uploadDirectory = "src/public/images";

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + "-" + uniqueSuffix + fileExtension;
    cb(null, fileName);
  },
});
const upload = multer({ storage: storage });

app.set("views", path.join(__dirname, "views"));
app.use(express.static("src/public"));

app.get("/login", (req, res) => {
  const message = req.query.message;
  if (message) {
    res.render("login", { errorMessage: message });
  }
  res.render("login", { errorMessage: null });
});

app.post("/login", (req, res) => {
  // Access form data
  const { username, password } = req.body;
  pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username],
    (error: any, results: any) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).send("Internal server error");
        return;
      }
      // Check if a user record was found
      if (results.rows.length > 0) {
        // check password is correct or not
        const pass = results.rows[0]["password"];
        const { id, displayname, description, username, avatar_path } =
          results.rows[0];
        comparePassword(password, pass)
          .then((result: boolean) => {
            if (result) {
              const payload = {
                id,
                username,
                description,
                avatar_path,
                displayname,
              };
              const token = generateToken(payload);
              const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
              res.cookie("token", token, { expires: expirationTime });
              res.redirect("/users");
              console.log("User Logged in");
            } else {
              res.render("login", {
                errorMessage: "Invalid username or password",
              });
            }
          })
          .catch((err: any) => {
            console.error(err);
            res.render("login", {
              errorMessage: "Invalid username or password",
            });
          });
      } else {
        res.render("login", { errorMessage: "Invalid username or password" });
      }
    }
  );
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    errorMessage: null,
    displayname: null,
    username: null,
    description: null,
  });
});

app.post("/signup", upload.single("imageUpload"), async (req: Request, res) => {
  // Access form data
  const displayname = req.body.displayname;
  const username = req.body.username;
  const password = await hashPassword(req.body.password);
  const description = req.body.description;

  try {
    // Insert user data into the database
    const query =
      "INSERT INTO users (displayname, username, password, description, avatar_path) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const avatar_path = req.file
      ? `/images/${req.file.filename}`
      : "/images/default.png";
    const values = [displayname, username, password, description, avatar_path]; // Assuming the file path is stored in the 'path' property of the 'file' object
    const result = await pool.query(query, values);
    console.log(result);
    const insertedData = result.rows[0];
    const { id } = insertedData;

    const payload = {
      id,
      username,
      description,
      avatar_path,
      displayname,
    };
    const token = generateToken(payload);
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
    res.cookie("token", token, { expires: expirationTime });
    res.redirect("/users");
    console.log("User Logged in");
  } catch (error) {
    console.error("Error during signup:", error);
    res.render("signup", {
      errorMessage: "Duplicate username..",
      displayname,
      username,
      description,
    });
  }
});

app.get("/users", (req, res) => {
  getData("SELECT * FROM users;")
    .then((data: any[]) => {
      // add shortened user description
      for (let i = 0; i < data.length; i++) {
        data[i].shortendDesc = shortenText(data[i].description, 100);
      }
      res.render("index", { users: data });
    })
    .catch((err: Error) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.get("/user/:id", (req, res) => {
  const id = req.params.id;
  // validate number
  if (!/^\d+$/.test(id)) {
    res.status(400).send("Invalid ID");
    return;
  }
  const query = `select *  from users
    inner join posts on users.id=posts.user_id
    inner join images on posts.id=images.post_id
    where users.id=${id};`;
  getData(query)
    .then((data: any[]) => {
      // when user don't have a post yet
      res.render("user", { projects: data });
    })
    .catch((err: Error) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
