const express = require("express");
const HttpError = require("./models/application/httpError");
const allowedOrigins = require("./configs/allowedOrigin");

const session = require("express-session");
const helmet = require("helmet");
const compress = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const route = require("./routes/index");
const app = express();

app.use(express.json());
// Use compress!
app.use(compress());
// Use Helmet!
app.use(helmet());
// HTTP  logger

if (process.env.NODE_ENV !== "production") {
  const morgan = require("morgan");
  require("dotenv").config();
  // Sử dụng morgan trong môi trường development
  app.use(morgan("combined"));
}

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS hihihihi!"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.set("view engine", "pug");

//ConnectDB
const { DBconnect } = require("./configs/connectDB");
DBconnect(() => {
  const server = app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
  });
});

app.use(express.json());
app.use("/api", route);

// Sử dụng body-parser middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  const error = new HttpError("Đường dẫn không tồn tại!", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "Lỗi không xác định!" });
});
