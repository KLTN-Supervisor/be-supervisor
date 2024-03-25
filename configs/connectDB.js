const mongoose = require("mongoose");
exports.DBconnect = async (appStart) => {
  await mongoose
    .connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("connect DB success");

      if (appStart) {
        appStart();
      }
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
};
