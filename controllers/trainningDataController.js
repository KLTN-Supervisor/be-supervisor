const { error } = require("console");
const fs = require("fs");
const path = require("path");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const { Canvas, Image } = require("canvas");
const directoryPath = "./public/uploads/students-images";
const Student = require("../models/schemas/student");
const Train = require("../models/schemas/train");
const sendMail = require("../utils/email");

const trainingFunc = async (studentUrl) => {
  faceapi.env.monkeyPatch({ Canvas, Image });
  const img = await canvas.loadImage(studentUrl);
  console.log("done training: ", studentUrl);

  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection.descriptor;
};

const trainStudent = async (studentLabel) => {
  console.log("Training student:", studentLabel);
  const listImgPromise = [];
  const listStudentsFolders = fs.readdirSync(
    `${directoryPath}/${studentLabel}`
  );
  const listStudentFiles = listStudentsFolders.filter((file) =>
    /\.(gif|jpe?g|tiff|png|webp|bmp)$/i.test(file)
  );
  for (const fileName of listStudentFiles) {
    listImgPromise.push(
      trainingFunc(`${directoryPath}/${studentLabel}/${fileName}`)
    );
  }
  const descriptions = await Promise.all(listImgPromise);
  const LabeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(
    studentLabel,
    descriptions
  );
  return LabeledFaceDescriptors;
};

async function saveFile(filename, descriptors) {
  try {
    // Read the existing data from the file
    let existingData = [];
    try {
      const existingDataString = await fs.promises.readFile(filename, "utf8");
      existingData = JSON.parse(existingDataString);
    } catch (error) {
      // If the file doesn't exist yet, existingData will be an empty array
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    for (const descriptor of JSON.parse(descriptors)) {
      // Check if the label already exists in the existing data
      const existingItemIndex = existingData.findIndex(
        (item) => item.label === descriptor.label
      );
      if (existingItemIndex !== -1) {
        existingData[existingItemIndex].descriptors = descriptor.descriptors;
      } else {
        // If the label doesn't exist, add the new descriptor
        existingData.push(descriptor);
      }
    }

    // Write the updated data to the file
    await fs.promises.writeFile(filename, JSON.stringify(existingData));
  } catch (error) {
    console.error("Error saving face descriptors:", error);
  }
}

const trainingData = async (req, res, next) => {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk("./public/models"),
      faceapi.nets.faceLandmark68Net.loadFromDisk("./public/models"),
      faceapi.nets.faceRecognitionNet.loadFromDisk("./public/models"),
    ]);

    let trainedStudents = [];
    const faceDescriptors = fs.readdir(directoryPath, async (err, files) => {
      if (err) {
        console.error("Error reading directory:", err);
        return;
      }

      const folders = files.filter((file) => {
        const filePath = path.join(directoryPath, file);
        return fs.statSync(filePath).isDirectory();
      });

      const array = await Train.findOne({}, {}, { sort: { created_at: -1 } })
        .then((latestTrain) => {
          return latestTrain.label;
        })
        .catch((error) => {
          console.error(error);
          return null;
        });

      const descriptorPromises = folders.map(async (folder) => {
        trainedStudents.push(folder.toString());
        if (array.includes(folder.toString())) {
          return await trainStudent(folder);
        } else {
          return null;
        }
      });

      if (trainedStudents) {
        await Student.find({
          student_id: { $nin: trainedStudents }, // Find students whose email is not in the trainedStudents array
          learning_status: "LEARNING", // Filter for students with 'LEARNING' status
        })
          .select("email") // Only select the email field
          .then((students) => {
            for (const student of students) {
              const message = `Sinh viên gửi hình cho phòng đào tạo \n Nếu đã gửi hãy bỏ qua tin nhắn này`;
              const subject = `Cảnh báo thiếu hình trên hệ thống`;
              sendMail({
                mailto: student.email,
                subject: subject,
                emailMessage: message,
              });
            }
          });
      }

      const descriptors = await Promise.all(descriptorPromises);
      const validDescriptors = descriptors.filter((d) => d !== null);

      saveFile(
        "labeledFacesData.json",
        JSON.stringify(validDescriptors.map((x) => x.toJSON()))
      );

      return validDescriptors;
    });

    // await notifyMissingStudents(trainedStudents);
    res.json(faceDescriptors);
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

const getTrainningData = async (req, res, next) => {
  try {
    const filePath = "./labeledFacesData.json";
    const data = await fs.promises.readFile(filePath, "utf8");

    const labeledFaceDescriptors = JSON.parse(data);
    // console.log("labeledFaceDescriptors", labeledFaceDescriptors);
    res.json(labeledFaceDescriptors);
    // res.json(faceDescriptors);
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

exports.trainingData = trainingData;
exports.getTrainningData = getTrainningData;
