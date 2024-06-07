const express = require("express");
const HttpError = require("./models/application/httpError");
const allowedOrigins = require("./configs/allowedOrigin");
const MongoStore = require("connect-mongo");
const session = require("express-session");
const helmet = require("helmet");
const compress = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
//ConnectDB
const { DBconnect } = require("./configs/connectDB");

const route = require("./routes/index");
const app = express();

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

//session
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_URI }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours,
    },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS!"));
      }
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  // Add the Cross-Origin-Resource-Policy header
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
});

//app.use(cookieParser());
app.set("view engine", "pug");

DBconnect(() => {
  const server = app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
  });
});

app.use(express.json());
// Sử dụng body-parser middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));

app.use(express.static(path.resolve(__dirname, "public", "uploads")));

app.use("/api", route);

app.use((req, res, next) => {
  const error = new HttpError("Đường dẫn không tồn tại!", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log("file unlink: ", err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || "Lỗi không xác định!" });
});
