const cloudinary = require('cloudinary');
const firebase = require('firebase');
const Vision = require('@google-cloud/vision');
const Translate = require('@google-cloud/translate');

const config = {
  apiKey: "<FIREBASE_API_KEY>",
  authDomain: "<FIREBASE_AUTH_DOMAIN>",
  databaseURL: "<FIREBASE_DATABASE_URL>",
  projectId: "<FIREBASE_PROJECT_ID>",
  storageBucket: "<FIREBASE_STORAGE_BUCKET>",
  messagingSenderId: "<FIREBASE_SENDER_ID>"
};

firebase.initializeApp(config);

cloudinary.config({
  cloud_name: '<YOUR-CLOUD-NAME>',
  api_key: '<YOUR-API-KEY>',
  api_secret: '<YOUR-API-SECRET>'
});

// Instantiates a client
const vision = Vision();

// Your Google Cloud Platform project ID
const projectId = 'functions-179107';

// Instantiates a client
const translateClient = Translate({
  projectId: projectId
});

// The target language
const target = 'en';

// Get a reference to the database service
let ocrdb = firebase.database().ref('cloudinary_ocr_data');

exports.processImage = function(req, res){
	let file = req.body.file;
	let fileName = req.body.filename;

	uploadToCloudinary(file, fileName).then((uploadResult) => {
    return detectText(uploadResult);
  }).then((ocrResult) => {
		return pushMetadataToFirebase(ocrResult, fileName);
	}).then((response) => {
		res.send({
			"message" : `Image file ${fileName} uploaded to Cloudinary, text translated and pushed to Firebase`,
			"ocr_data" : response
		});
  }).catch((err) => {
    throw err;
  })
}

let uploadToCloudinary = (file, fileName) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(file)
    .then((result) => {
      console.log(`Image file ${fileName} successfully uploaded`);
      resolve(result);
    }).catch((err) => {
      console.error(`Error in uploading image ${fileName} - ${err}`);
      reject(err)
    });
  })
}

let detectText = (cloudinaryResult) => {
  return new Promise((resolve, reject) => {
    let file = cloudinaryResult.url; 
    vision.textDetection({ source: { imageUri: file } })
    .then((results) => {
      resolve(results);
    }).catch((err) => {
      console.error(`Error in detecting text - ${err}`);
      reject(err)
    });
  })
}

let pushMetadataToFirebase = (data, fileName) => {
	return new Promise((resolve, reject) => {
		ocrdb.push(data)
		.then(() => {
			console.log(`Metadata of file ${fileName} pushed to Firebase`);
      resolve(data);
		}).catch((err) => {
      console.error(`Error in pushing metadata of file ${fileName} to Firebase - ${err}`);
      reject(err);
    });
	})
}