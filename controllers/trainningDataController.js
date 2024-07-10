const { error, time } = require("console");
const fs = require("fs");
const path = require("path");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const { Canvas, Image } = require("canvas");
const directoryPath = "./public/uploads/students-images";
const Student = require("../models/schemas/student");
const Train = require("../models/schemas/train");
const sendMail = require("../utils/email");

let userError = []

const trainingFunc = async (studentUrl) => {
  try {
    faceapi.env.monkeyPatch({ Canvas, Image });
    const img = await canvas.loadImage(studentUrl);
    console.log("done training: ", studentUrl);

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      return detection.descriptor;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error processing ${studentUrl}: `, error);
    userError.push(studentUrl.split('/').pop())
    return null;
  }
};

const trainStudent = async (studentLabel) => {
  try {
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
          .then(descriptor => descriptor || [])
          .catch(error => {
            console.error(`Error processing ${directoryPath}/${studentLabel}/${fileName}: `, error);
            return [];
          })
      );
    }
    const descriptions = await Promise.all(listImgPromise);
    const LabeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(
      studentLabel,
      descriptions
    );
    return LabeledFaceDescriptors;
  } catch (error){
    console.error(`Error processing ${studentLabel}: `, error);
    return null;
  }
};

async function saveFile(filename, descriptors, res) {
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
    let trainedStudents = [];
    for (const data of existingData) {
      trainedStudents.push(data.label);
    }

    const studentPromise = Student.find({
      student_id: { $nin: trainedStudents }, // Find students whose email is not in the trainedStudents array
      learning_status: "LEARNING", // Filter for students with 'LEARNING' status
    })
      .select("email"); // Only select the email field
    
    studentPromise.then(async (students) => {
      const emailPromises = [];
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const emailPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.log("send email to ", student.email);
            const message = `Sinh viên gửi hình cho phòng đào tạo \nNếu đã gửi hãy bỏ qua tin nhắn này`;
            const subject = `Cảnh báo thiếu hình trên hệ thống`;
            sendMail({
              mailto: student.email,
              subject: subject,
              emailMessage: message,
            }).then(() => {
              console.log(i + 1);
              resolve();
            });
          }, 1000 * (i + 1));
        });
        emailPromises.push(emailPromise);
      }
    
      await Promise.all(emailPromises);
    
      console.log(userError)
      if(userError.length > 0){
        console.log("error "+ userError);
        let error = "Đã train xong ngoài các file không được hỗ trợ: "
        for(let i=0; i< userError.length; ++i){
          if(i === userError.length - 1)
            error += userError[i].toString()
          else
            error = error + userError[i].toString() + ", "
            
        }
        console.log(error)
        await res.status(402).json({message: error});
      }
      else{
        console.log("pass");
        await res.json(descriptors)
      }
      // Sau khi tất cả email đã được gửi, tiến hành lưu file
      await fs.promises.writeFile(filename, JSON.stringify(existingData));
      // await res.json(descriptors)
    }).catch((error) => {
      console.error(error);
    });
    
    
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
    const faceDescriptors = await new Promise((resolve, reject) => {
      fs.readdir(directoryPath, async (err, files) => {
        if (err) {
          console.error("Error reading directory:", err);
          reject(err);
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
        const descriptors = await Promise.all(descriptorPromises);
        const validDescriptors = descriptors.filter((d) => d !== null);
        
        resolve(validDescriptors);
      });
    });
    
    
    saveFile(
      "labeledFacesData.json",
      JSON.stringify(faceDescriptors.map((x) => x.toJSON())), res
    )
    
    console.log(userError);
    // res.json(faceDescriptors);
    // console.log(userError);
      
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
