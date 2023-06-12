const fs = require("fs");
require("dotenv").config();
const { Pool } = require("pg");
// Create a new pool instance
const pool = new Pool({
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
});

// Function to read image data from a file
function readImageData(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

// Function to set up the database and insert sample data
async function insertUsers(users) {
  try {
    for (let user of users) {
      // Read image data from file
      const avatarData = await readImageData(
        `database-setup/images/${user[0]}`
      );

      // Insert sample data
      const insertUserQuery = `
      INSERT INTO users (name, user_name, description, avatar, password)
      VALUES ($1, $2, $3, $4, $5);
    `;
      const insertUserData = [user[1], user[2], user[3], avatarData, user[4]];

      await pool.query(insertUserQuery, insertUserData);

      console.log("User data inserted successfully.");
    }
  } catch (error) {
    console.error("Error inserting userdata:", error);
  }
  //finally {
  // Disconnect from the pool
  //  pool.end();
  //}
}
const users = [
  ["woods.jpg", "Satoshi N.", "satoshi_n", "sample description", "1234"],
  ["avatar.jpg", "MR Relakku", "mr_relakku", "sample description", "1234"],
  ["cat.png", "MR Cat", "mr_cat", "sample description", "1234"],
];

// Function to set up the database and insert sample data
async function insertPosts(posts) {
  try {
    for (let post of posts) {
      // Insert sample data
      const insertPostQuery = `
        INSERT INTO posts (title, categories, content, user_id)
        VALUES ($1, $2, $3, $4);
      `;
      const insertPostData = [post[0], post[1], post[2], post[3]];

      await pool.query(insertPostQuery, insertPostData);

      console.log("Post data inserted successfully.");
    }
  } catch (error) {
    console.error("Error inserting postdata:", error);
  }
}
const posts = [
  [
    "Bitcoin",
    ["money", "invention"],
    "I made bitcoin. My name is Satoshi Nakamoto",
    1,
  ],
  ["Japan", ["country"], "My name is Satoshi Nakamoto. I'm from Japan.", 1],
  [
    "Relax",
    ["life", "relax"],
    "I'm relaxing all the time. Why don't you join our group?",
    2,
  ],
  [
    "Invitation",
    ["customers", "money"],
    "I'm inviting more customer for the business. A cat can bring more people.",
    3,
  ],
];

// Function to set up the database and insert sample data
async function insertImages(images) {
  try {
    for (let image of images) {
      // Read image data from file
      const imageData = await readImageData(
        `database-setup/images/${image[1]}`
      );
      // Insert sample data
      const insertImageQuery = `
          INSERT INTO images (alt,image,post_id)
          VALUES ($1, $2, $3);
        `;
      const insertImageData = [image[0], imageData, image[2]];

      await pool.query(insertImageQuery, insertImageData);

      console.log("Image data inserted successfully.");
    }
  } catch (error) {
    console.error("Error inserting postdata:", error);
  }
}
const images = [
  ["An astronaut on the moon", "astronaut.png", 1],
  ["Download log mark", "download.png", 2],
  ["A hamburger", "fresh-hamburger-with-salad-onion.jpg", 3],
  ["Woods in sundown", "woods.jpg", 4],
];

async function insertSampleData() {
  try {
    await insertUsers(users);
    console.log("users data inserted succesfully");
    await insertPosts(posts);
    console.log("posts data inserted successfully");
    await insertImages(images);
    console.log("images data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data", error);
  } finally {
    pool.end();
  }
}

insertSampleData();
