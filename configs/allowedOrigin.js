const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://192.168.1.17:3000");
  allowedOrigins.push("http://192.168.0.2:3000");
  allowedOrigins.push("http://localhost:3000");
}
module.exports = allowedOrigins;
