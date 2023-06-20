require("dotenv").config();
const bcrypt = require("bcrypt");

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
        console.log("Hashed Password:", hash);
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
