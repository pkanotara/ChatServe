const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const createStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `ChatServe/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    },
  });

const menuItemUpload = multer({
  storage: createStorage('menu-items'),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

const logoUpload = multer({
  storage: createStorage('logos'),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('logo');

const handleUploadError = (upload) => (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

module.exports = {
  menuItemUpload: handleUploadError(menuItemUpload),
  logoUpload: handleUploadError(logoUpload),
};