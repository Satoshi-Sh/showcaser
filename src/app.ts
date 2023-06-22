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

// for update project check owner of the project
const checkOwner = async (req: any, res: any, next: any) => {
  const project_id = req.params.project_id;
  console.log(project_id);
  if (!/^\d+$/.test(project_id)) {
    res.status(400).send("Invalid ID");
    return;
  }
  try {
    const query = "select user_id from posts where id= $1;";
    const values = [project_id];
    const result = await pool.query(query, values);
    if (result.rows[0].user_id == res.locals.user.id) {
      console.log("working?");
      next();
    }
  } catch (err) {
    console.error(err);
  }
  res.render("login", { errorMessage: "Wrong account." });
};

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

app.get("/user/:id", async (req, res) => {
  const id = req.params.id;
  // validate number
  if (!/^\d+$/.test(id)) {
    res.status(400).send("Invalid ID");
    return;
  }

  const getUserQuery = `SELECT * FROM users WHERE id = ${id};`;
  const getProjectsQuery = `SELECT * FROM posts WHERE user_id = ${id};`;
  try {
    const owner = await getData(getUserQuery);
    const projects = await getData(getProjectsQuery);
    res.render("user", { projects, owner: owner[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/upload", authenticateToken, (req, res) => {
  res.render("upload");
});

app.post(
  "/upload",
  authenticateToken,
  upload.single("imageUpload"),
  async (req: any, res) => {
    const image_path = `/images/${req.file.filename}`;
    const user_id = res.locals.user.id;
    const { title, categories, description } = req.body;
    try {
      // Insert user data into the database
      const query =
        "INSERT INTO posts (title, categories, content, user_id,image_path) VALUES ($1, $2, $3, $4, $5)";
      const values = [title, [categories], description, user_id, image_path];
      await pool.query(query, values);
      console.log(title, " posted successfully");
      res.redirect(`/user/${user_id}`);
    } catch (error) {
      console.error("Error during uploading project:", error);
    }
  }
);

app.get("/update/:project_id", checkOwner, (req, res) => {
  res.render("project-update");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
