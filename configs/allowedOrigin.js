const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production"){
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("192.168.0.2");
}
module.exports = allowedOrigins;
