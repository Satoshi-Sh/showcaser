const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool instance
const pool = new Pool({
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
});

// Example query to create a table
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    avatar BYTEA NOT NULL,
  );
`;

// Function to execute queries
async function executeQuery(query) {
  try {
    const client = await pool.connect();
    const result = await client.query(query);
    client.release();
    return result;
  } catch (error) {
    console.error("Error executing query:", error);
  }
}

// Function to set up the database
async function setupDatabase() {
  try {
    // Create the table
    await executeQuery(createTableQuery);
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
