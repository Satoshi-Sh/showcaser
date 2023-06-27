require("dotenv").config();
const bcrypt = require("bcrypt");
import { pool } from "./database";

export function shortenText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  const shortenedText = text.slice(0, maxLength - 3) + "...";
  return shortenedText;
}

export function hashPassword(
  password: string,
  saltRounds = Number(process.env["SALTROUNDS"])
): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, function (err: any, hash: string) {
      if (err) {
        // Handle error
        console.error(err);
        reject(err); // Reject the promise with the error
      } else {
        // Step 2: Store the hashed password in your database or use it as needed
        resolve(hash); // Resolve the promise with the hashed password
      }
    });
  });
}

export function comparePassword(
  inputPassword: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(inputPassword, hash, function (err: any, result: boolean) {
      if (err) {
        console.error(err);
        reject(err);
      } else if (result) {
        console.log("Password match");
        resolve(true);
      } else {
        console.log("Password do not match");
        resolve(false);
      }
    });
  });
}

export async function uploadImage(file: any) {
  const { buffer, mimetype, size, encoding } = file;
  const imageQuery =
    "INSERT INTO images (content, mime, size,encoding) VALUES ($1, $2, $3, $4) RETURNING *";
  const response = await pool.query(imageQuery, [
    buffer,
    mimetype,
    size,
    encoding,
  ]);
  return response.rows[0].id;
}

export async function deleteImage(id: number) {
  const imageQuery = `Delete from images where id = (id)`;
  await pool.query(imageQuery, [id]);
  console.log("Old image was deleted..");
}
