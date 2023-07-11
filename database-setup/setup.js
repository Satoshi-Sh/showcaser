const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool instance
const pool = new Pool({
  user: process.env.USERNAME,
  password: process.env.PASSWORD,
  host: "localhost",
  database: "mydb",
  port: 5432,
});

// Example query to create a table
const createTableQueries = [
  `DROP TABLE IF EXISTS users, projects, images;
  `,
  `CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    content BYTEA NOT NULL,
    encoding VARCHAR(255) NOT NULL,
    mime VARCHAR(255) NOT NULL,
    size INT
  );
`,
  `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY UNIQUE,
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
    id SERIAL PRIMARY KEY UNIQUE,
    title VARCHAR(255) NOT NULL,
    repos VARCHAR(255) NOT NULL,
    page_url VARCHAR(255),
    description TEXT,
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
