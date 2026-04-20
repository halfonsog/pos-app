const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// ✅ NUEVA RUTA: src/frontend/uploads/productos
const uploadDir = path.join(__dirname, '../../frontend/uploads/productos');

console.log('📁 UPLOAD DIR:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Directorio creado:', uploadDir);
}

const storage = multer.memoryStorage();

const fileFilter = function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: fileFilter
});

const procesarImagen = async (req, res, next) => {
  console.log('🖼️ procesarImagen llamado');

  if (!req.file) {
    console.log('⚠️ No hay archivo, continuando...');
    return next();
  }

  try {
    const filename = 'prod_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + '.jpg';
    const filepath = path.join(uploadDir, filename);

    console.log('🖼️ Guardando en:', filepath);

    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: 'cover',
        position: 'center',
        background: { r: 255, g: 255, b: 255 }
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    req.file.filename = filename;
    req.file.path = filepath;

    console.log('✅ Imagen guardada:', filename);
    console.log('✅ ¿Existe?', fs.existsSync(filepath));

    next();
  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    next(error);
  }
};

module.exports = { upload, procesarImagen };