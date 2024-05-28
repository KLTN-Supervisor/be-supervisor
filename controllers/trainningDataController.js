
const { error } = require('console');
const fs = require('fs');
const path = require('path');
const faceapi = require('face-api.js')
const canvas = require('canvas')
const { Canvas, Image } = require('canvas');
const directoryPath = './public/uploads/students-images';
const Student = require("../models/schemas/student");
const sendMail = require("../utils/email");


const trainingFunc = async (studentUrl) => {
    console.log('Training: ', studentUrl);
    faceapi.env.monkeyPatch({ Canvas, Image })
    const img = await canvas.loadImage(studentUrl);
    
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection.descriptor;
}

const trainStudent = async (studentLabel) => {
    console.log('Training student:', studentLabel);
    const listImgPromise = [];
    const listStudentsFolders = fs.readdirSync(`${directoryPath}/${studentLabel}`);
    const listStudentFiles = listStudentsFolders.filter((file) =>
      /\.(gif|jpe?g|tiff|png|webp|bmp)$/i.test(file),
    );
    for (const fileName of listStudentFiles) {
      listImgPromise.push(trainingFunc(`${directoryPath}/${studentLabel}/${fileName}`));
    }
    const descriptions = await Promise.all(listImgPromise);
    const LabeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(
      studentLabel,
      descriptions,
    );
    console.log('Done student:', studentLabel, LabeledFaceDescriptors);
    return LabeledFaceDescriptors;
  };

async function saveFile(filename, data) {
  try {
    await fs.promises.writeFile(filename, data);
    // console.log(`Face descriptors saved to ${filename}`);
  } catch (error) {
    console.error('Error saving face descriptors:', error);
  }
  }

const trainingData = async (req, res, next) => {
  try {
      await Promise.all([
          // THIS FOR FACE DETECT AND LOAD FROM YOU PUBLIC/MODELS DIRECTORY
          faceapi.nets.ssdMobilenetv1.loadFromDisk("./public/models"),
          faceapi.nets.faceLandmark68Net.loadFromDisk("./public/models"),
          faceapi.nets.faceRecognitionNet.loadFromDisk("./public/models"),
      ])
      let trainedStudents = []
      fs.readdir(directoryPath, async (err, files) => {
          if (err) {
            console.error('Error reading directory:', err);
            return;
          }
          const folders = files.filter((file) => {
            const filePath = path.join(directoryPath, file);
            return fs.statSync(filePath).isDirectory();
          });
          let faceDescriptors = []
          for(const folder of folders){
              trainedStudents.push(folder.toString())
              const descriptor = await trainStudent(folder);
              faceDescriptors.push(descriptor);
          }
          
          if(trainedStudents){
            await Student.find({
              student_id: { $nin: trainedStudents }, // Find students whose email is not in the trainedStudents array
              learning_status: 'LEARNING' // Filter for students with 'LEARNING' status
            })
            .select('email') // Only select the email field
            .then(students => {
              for(const student of students){
                const message = `Sinh viên gửi hình cho phòng đào tạo \n Nếu đã gửi hãy bỏ qua tin nhắn này`;
                const subject = `Cảnh báo thiếu hình trên hệ thống`;
                sendMail ({ mailto: student.email, subject: subject, emailMessage: message });
              }
              
            })
          }
          saveFile(
            'labeledFacesData.json',
            JSON.stringify(faceDescriptors.map((x) => x.toJSON())),
          );
          res.json(faceDescriptors);
        });
        
      
  }catch (error){
      console.log(error);
      return next(error);
  }
}

const getTrainningData = async (req, res, next) => {
  try {
    const filePath = "./labeledFacesData.json";
    const data = await fs.promises.readFile(filePath, 'utf8');
    
    const labeledFaceDescriptors = JSON.parse(data)
    console.log("labeledFaceDescriptors", labeledFaceDescriptors);
    res.json(labeledFaceDescriptors);
    // res.json(faceDescriptors);
      
  }catch (error){
      console.log(error);
      return next(error);
  }
}

  
exports.trainingData = trainingData;
exports.getTrainningData = getTrainningData;