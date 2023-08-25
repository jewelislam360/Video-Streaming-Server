const jwt = require("jsonwebtoken");
function jwtSign(userDetails) {
  const token = jwt.sign(userDetails, process.env.jwt_secret, {
    expiresIn: "2d",
  });
  return token;
}

module.exports = jwtSign;
