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
  [
    "astronaut.png",
    "Astro",
    "astro_boy",
    "Welcome to my user account! I'm a passionate individual with a diverse range of interests. I enjoy exploring the world through travel, immersing myself in different cultures, and capturing beautiful moments through photography. Additionally, I have a keen interest in technology and love keeping up with the latest advancements in the field. I'm excited to connect with like-minded individuals, share experiences, and learn from the vibrant community here. Let's embark on this journey together and make meaningful connections!",
    "1234",
  ],
  [
    "download.png",
    "Spot",
    "spot_logo",
    "Hello there! Welcome to my profile! I'm an avid reader, always seeking new adventures within the pages of a book. Whether it's diving into gripping mysteries or exploring fantastical realms, I'm constantly on the lookout for captivating stories. In my free time, I enjoy honing my culinary skills, experimenting with flavors and creating delicious dishes. I'm also a fitness enthusiast, passionate about maintaining an active lifestyle through various activities like hiking, yoga, and dance. I'm thrilled to connect with fellow bookworms, food enthusiasts, and fitness aficionados here. Let's share recommendations, recipes, and fitness tips as we embark on this exciting journey together!",
    "1234",
  ],
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
  [
    "Event Announcement",
    ["attendees", "venue"],
    "Exciting news! We're hosting a grand event to celebrate our company's achievements. The event will take place at a stunning venue and promises to be a night filled with entertainment and networking opportunities. Help us make it a memorable affair by inviting influential attendees who can contribute to the success of our event.",
    4,
  ],
  [
    "Product Launch",
    ["customers", "promotion"],
    "Attention all tech enthusiasts! We're thrilled to announce the launch of our latest innovation. Our groundbreaking product combines cutting-edge technology with sleek design, offering an unparalleled user experience. Spread the word and let your network know about this game-changing release. Together, we can create a buzz and ensure our product reaches the hands of eager customers.",
    4,
  ],
  [
    "Volunteer Drive",
    ["volunteers", "community"],
    "Calling all compassionate souls! We're organizing a volunteer drive to support our local community. By donating your time and skills, you can make a significant impact in the lives of those in need. Help us spread the message and encourage more volunteers to join our cause. Together, we can create a ripple effect of positive change.",
    5,
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
  ["cat", "cat.png", 5],
  ["Woods in sundown", "woods.jpg", 6],
  ["download logl", "download.png", 7],
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
