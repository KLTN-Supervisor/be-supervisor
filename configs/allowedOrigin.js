const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000");
}
module.exports = allowedOrigins;
