const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, `../../uploads/${folder}`));
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400), false);
  }
};

const photoUpload = multer({
  storage: createStorage('photos'),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
});

const documentUpload = multer({
  storage: createStorage('documents'),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'application/pdf']),
});

const expenseUpload = multer({
  storage: createStorage('documents'),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'application/pdf']),
});

module.exports = { photoUpload, documentUpload, expenseUpload };
