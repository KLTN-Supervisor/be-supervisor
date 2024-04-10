const generateOTP = (len) => {
  let OTP;
  min = Math.pow(10, len - 1); // 10^5
  max = Math.pow(10, len) - 1; // 10^6 -1
  // get random between min and max
  OTP = Math.floor(Math.random() * (max - min + 1) + min);

  return OTP;
};

module.exports = generateOTP;
