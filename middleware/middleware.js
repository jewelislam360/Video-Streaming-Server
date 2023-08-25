const jwt = require("jsonwebtoken");

const jwtCheck = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);
    req.user = decoded; // Attach the decoded user info to the request
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

module.exports = jwtCheck;
