import express, { Request, Response } from "express";
import getData from "./database";
const path = require("path");
import { shortenText } from "./utils";
import multer from "multer";
import { Express } from "express";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");

// Configure multer
const uploadDirectory = path.join(__dirname, "/public/images");

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
  res.render("login", { errorMessage: null });
});

app.post("/login", (req, res) => {
  // Access form data
  const name = req.body.username;
  const password = req.body.password;
  console.log(name, password);
  // if log in sccesfully
  //res.redirect("/users");
  // failed to login, showing an error message
  res.render("login", { errorMessage: "Invalid username or password" });
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null });
});

app.post("/signup", upload.single("imageUpload"), async (req: Request, res) => {
  // Access form data
  const name = req.body.username;
  const password = req.body.password;
  const description = req.body.description;
  console.log(req.file);
  console.log(name, password, description);
  // if log in sccesfully
  //res.redirect("/users");
  // failed to login, showing an error message
  res.render("signup", { errorMessage: "Invalid username or password" });
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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
