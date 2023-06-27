import express, { Request, Response } from "express";
import getData, { pool } from "./database";
const path = require("path");
import {
  uploadImage,
  deleteImage,
  hashPassword,
  comparePassword,
} from "./utils";
import multer from "multer";
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");

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
const checkLoginStatus = async (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  let decoded;
  if (token) {
    try {
      // Verify and decode the token
      decoded = jwt.verify(token, process.env["SECRET"]);
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }
  res.locals.isLoggedIn = decoded ? true : false;
  if (decoded) {
    // get mime and content
    try {
      const result = await pool.query("select * from images where id = $1", [
        decoded.image_id,
      ]);
      console.log(result.rows[0]);
      const { mime, content } = result.rows[0];
      res.locals.mime = mime;
      res.locals.content = content;
      res.locals.user = decoded;
    } catch (err) {
      console.error(err);
    }
  } else {
    res.locals.user = null;
  }
  next();
};
app.use(checkLoginStatus);

// for update project check owner of the project
const checkOwner = async (req: any, res: any, next: any) => {
  const project_id = req.params.project_id;
  if (!/^\d+$/.test(project_id)) {
    res.status(400).send("Invalid ID");
    return;
  }
  try {
    const query = "select * from projects where id= $1;";
    const values = [project_id];
    const result = await pool.query(query, values);
    const { user_id } = result.rows[0];
    console.log(result.rows[0], res.locals.user);
    if (user_id == res.locals.user.id) {
      res.locals.project = result.rows[0];
      next();
    } else {
      res.render("login", { errorMessage: "Wrong account." });
    }
  } catch (err) {
    console.error(err);
  }
};

configurePassport();
// Configure multer

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.set("views", path.join(__dirname, "views"));
app.use(express.static("src/public"));

app.get("/", async (req, res) => {
  const getCityQuery = `
  SELECT users.city, COUNT(*) FROM projects INNER JOIN users on projects.user_id = users.id GROUP BY users.city
  `;
  const getCourseQuery = `
  SELECT users.course, COUNT(*) FROM projects INNER JOIN users on projects.user_id = users.id GROUP BY users.course
  `;

  try {
    const cities = await getData(getCityQuery);
    const courses = await getData(getCourseQuery);
    res.render("index.ejs", {
      cities,
      courses,
    });
  } catch (err) {
    console.error(err);
  }
});

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
    "SELECT users.id as user_id,images.id as image_id, * FROM users join images on images.id = users.image_id  WHERE username = $1;",
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
        const { user_id, displayname, course, city, image_id, username } =
          results.rows[0];
        comparePassword(password, pass)
          .then((result: boolean) => {
            if (result) {
              const payload = {
                id: user_id,
                username,
                image_id,
                course,
                city,
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

app.get("/projects", async (req, res) => {
  const { city, course } = req.query;
  const getProjectsQuery = city
    ? `SELECT 
    project_images.content AS project_content, 
    project_images.mime AS project_mime, 
    user_images.content AS avatar_content, 
    user_images.mime AS avatar_mime, 
    projects.*, 
    users.*
  FROM projects
  JOIN users ON users.id = projects.user_id
  LEFT JOIN (
    SELECT id, content, mime
    FROM images
  ) AS project_images ON project_images.id = projects.image_id
  LEFT JOIN (
    SELECT id, content, mime
    FROM images
  ) AS user_images ON user_images.id = users.image_id
  WHERE users.city = '${city}';`
    : `SELECT 
    project_images.content AS project_content, 
    project_images.mime AS project_mime, 
    user_images.content AS avatar_content, 
    user_images.mime AS avatar_mime, 
    projects.*, 
    users.*
  FROM projects
  JOIN users ON users.id = projects.user_id
  LEFT JOIN (
    SELECT id, content, mime
    FROM images
  ) AS project_images ON project_images.id = projects.image_id
  LEFT JOIN (
    SELECT id, content, mime
    FROM images
  ) AS user_images ON user_images.id = users.image_id
  WHERE users.course = '${course}';`;
  try {
    const projects = await getData(getProjectsQuery);
    res.render("projects", { projects, city, course });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    errorMessage: null,
    displayname: null,
    username: null,
  });
});

app.post("/signup", upload.single("imageUpload"), async (req: Request, res) => {
  // Access form data
  const { displayname, username, password, city, course } = req.body;
  const hashedpassword = await hashPassword(password);

  try {
    //
    // Insert user data into the database
    let image_id;
    // need to implement when user didn't choose any avatar
    image_id = await uploadImage(req.file);

    const userQuery =
      "INSERT INTO users (displayname, username, password, city, course, image_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const values = [
      displayname,
      username,
      hashedpassword,
      city,
      course,
      image_id,
    ];
    const result = await pool.query(userQuery, values);
    const insertedData = result.rows[0];

    const { id } = insertedData;

    const payload = {
      id,
      username,
      image_id,
      course,
      city,
      displayname,
    };
    const token = generateToken(payload);
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
    res.cookie("token", token, { expires: expirationTime });
    console.log("User Logged in");
    res.redirect("/users");
  } catch (error) {
    console.error("Error during signup:", error);
    res.render("signup", {
      errorMessage: "Duplicate username..",
      displayname,
      username,
      city,
      course,
    });
  }
});

app.get("/users", (req, res) => {
  getData(
    "SELECT users.id AS user_id, images.id AS image_id, * FROM users INNER JOIN images on images.id=users.image_id;"
  )
    .then((data: any[]) => {
      res.render("users", { users: data });
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
  const getUserQuery = `SELECT * FROM users INNER JOIN images on images.id=users.image_id WHERE users.id = ${id};`;
  const getProjectsQuery = `SELECT projects.id as project_id, images.id AS image_id, * FROM projects INNER JOIN images on images.id=projects.image_id  WHERE user_id = ${id};`;
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
    //TO Do delete old image from images table
    const { title, repo, pageUrl, description } = req.body;
    const user_id = res.locals.user.id;
    try {
      const image_id = await uploadImage(req.file);
      // Insert user data into the database
      const query =
        "INSERT INTO projects (title, repos, page_url, description, user_id, image_id) VALUES ($1, $2, $3, $4, $5, $6)";
      const values = [title, repo, pageUrl, description, user_id, image_id];
      await pool.query(query, values);
      console.log(title, " posted successfully");
      res.redirect(`/user/${user_id}`);
    } catch (error) {
      console.error("Error during uploading project:", error);
    }
  }
);

app.get("/update/:project_id", checkOwner, (req, res) => {
  res.render("project-update", { project: res.locals.project });
});

app.post(
  "/update/:project_id",
  checkOwner,
  upload.single("imageUpload"),
  async (req, res) => {
    const id = req.params.project_id;
    const { title, repos, page_url, description } = req.body;
    try {
      // upload project image
      let image_id;
      let values;
      if (req.file) {
        image_id = await uploadImage(req.file);
        values = [title, repos, page_url, description, image_id, id];
      } else {
        values = [title, repos, page_url, description, id];
      }
      const query = image_id
        ? "update projects SET title = $1, repos = $2, page_url = $3, description = $4, image_id= $5 where id= $6"
        : "update projects SET title = $1, repos = $2, page_url = $3, description = $4 where id= $5";
      console.log(values);
      pool.query(query, values, (err: any, result: any) => {
        if (err) {
          console.error("Error executing query", err);
          res.render("project-update", { project: res.locals.project });
        } else {
          console.log("Row updated successfully");
          res.redirect(`/user/${res.locals.user.id}`);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
);

app.get("/account/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  console.log(res.locals.user);
  if (res.locals.user && res.locals.user.id != Number(user_id)) {
    res.redirect("/logout");
  } else {
    res.render("user-update", { errorMessage: "" });
  }
});

app.post(
  "/account/:user_id",
  upload.single("imageUpload"),
  async (req, res) => {
    const { displayname, username, city, course } = req.body;
    console.log(res.locals.user);
    const user_id = res.locals.user.id;
    let image_id: any;
    let values;
    if (req.file) {
      try {
        image_id = await uploadImage(req.file);
        values = [displayname, username, city, course, image_id, user_id];
      } catch (err) {
        console.error(err);
      }
    } else {
      values = [displayname, username, city, course, user_id];
    }
    console.log(values);
    const query = image_id
      ? "update users SET displayname = $1, username = $2, city = $3, course = $4, image_id= $5 where id= $6"
      : "update users SET displayname = $1, username = $2, city = $3, course = $4 where id= $5";

    pool.query(query, values, (err: any, result: any) => {
      if (err) {
        console.error("Error executing query", err);
        res.render(`usre-update`, {
          errorMessage: "Failed to inster update data",
        });
      } else {
        // delete old image
        const old_image_id = res.locals.user["image_id"];
        let payload;
        if (req.file) {
          try {
            deleteImage(Number(old_image_id));
            payload = {
              id: user_id,
              username,
              image_id,
              course,
              city,
              displayname,
            };
          } catch (err) {
            console.error(err);
          }
        } else {
          payload = {
            id: user_id,
            username,
            image_id: old_image_id,
            course,
            city,
            displayname,
          };
        }
        // need to update cookies from the new information
        res.clearCookie("token");
        console.log(payload);
        const token = generateToken(payload);
        const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
        res.cookie("token", token, { expires: expirationTime });
        console.log("Row updated successfully");
        res.redirect(`/users`);
      }
    });
  }
);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
