const passport = require("passport");
const passportJWT = require("passport-jwt");
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Configure Passport
const configurePassport = () => {
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env["SECRET"], // Replace with your own secret key
  };

  passport.use(
    new JwtStrategy(jwtOptions, (payload: any, done: any) => {
      // In a real application, you would validate the token's payload and query your database for the user
      const user = {
        ...payload,
      };
      return done(null, user);
    })
  );
};

// Generate a JWT token
const generateToken = (payload: any) => {
  return jwt.sign(payload, process.env["SECRET"]);
};

const authenticateToken = (req: any, res: any, next: any) => {
  // Extract the token from the request (from headers, cookies, or elsewhere)
  const token = req.cookies.token;

  if (token) {
    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, process.env["SECRET"]) as {
        id: number;
        displayname: string;
        description: string;
        username: string;
        avatar_path: string;
      };

      // Attach the decoded payload to the request object
      req.user = decoded;
      next();
    } catch (err) {
      // Handle token verification errors
      console.error("Invalid token:", err);
      res.redirect("login?message=Please login");
    }
  } else {
    res.redirect("login?message=Please login");
  }
};

module.exports = { configurePassport, generateToken, authenticateToken };
