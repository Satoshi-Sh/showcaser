import express from "express";
import getData from "./database";
const path = require("path");
import { shortenText } from "./utils";

const app = express();
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));
app.use(express.static("src/public"));

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
