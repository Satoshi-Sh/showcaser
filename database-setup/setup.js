const { Pool } = require("pg");
require("dotenv").config();
const { exec } = require("child_process");

// clear images in public folder except for default images
const command = "rm -r src/public/images/imageUpload*";
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing the command: ${error}`);
    return;
  }

  // The command was executed successfully
  console.log("Command output:", stdout);
});

// Create a new pool instance
const pool = new Pool({
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
});

// Example query to create a table
const createTableQueries = [
  `DROP TABLE IF EXISTS users, posts, projects, images;
  `,
  `CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    content BYTEA NOT NULL,
    mime TEXT not null,
    size INT
  );
`,
  `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    displayname VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    city VARCHAR(50) NOT NULL,
    course VARCHAR(255) NOT NULL,
    image_id INTEGER REFERENCES images(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    categories VARCHAR[],
    content TEXT,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    image_id INTEGER REFERENCES images(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`,
];

// Function to execute queries
async function executeQuery(queries) {
  try {
    const client = await pool.connect();
    for (const query of queries) {
      await client.query(query);
    }
    client.release();
  } catch (error) {
    console.error("Error executing query:", error);
  }
}

// Function to set up the database
async function setupDatabase() {
  try {
    // Create the table
    await executeQuery(createTableQueries);
    console.log("Table created successfully.");
  } catch (error) {
    console.error("Error setting up the database:", error);
  } finally {
    // Disconnect from the pool
    pool.end();
  }
}

// Call the setupDatabase function to set up the database
setupDatabase();
