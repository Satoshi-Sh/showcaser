const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool instance
export const pool = new Pool({
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  database: process.env.DATABASE,
  port: process.env.PORT,
});

// Function to execute queries
async function executeQuery(query: string) {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(query);
    client.release();
    return result;
  } catch (error) {
    console.error("Error executing query:", error);
  }
}

// Function to set up the database
async function getData(query: string) {
  try {
    const result = await executeQuery(query);
    return result.rows;
  } catch (error) {
    console.error("Error setting up the database:", error);
  }
}

export default getData;
