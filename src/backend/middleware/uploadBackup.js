const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../../temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'backup_' + Date.now() + '.db');
  }
});

const fileFilter = function (req, file, cb) {
  // Aceptar archivos .db
  if (file.originalname.endsWith('.db')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan archivos .db'));
  }
};

const uploadBackup = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
  fileFilter: fileFilter
});

module.exports = uploadBackup;