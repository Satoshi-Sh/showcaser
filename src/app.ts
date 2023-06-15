import express from "express";
import getData from "./database";
const path = require("path");

const app = express();
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));
app.use(express.static("src/public"));

app.get("/", (req, res) => {
  getData("SELECT * FROM users;")
    .then((data: any[]) => {
      res.render("index", { users: data });
    })
    .catch((err: Error) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
