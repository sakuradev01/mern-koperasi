import multer from "multer";
import path from "path";

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/savings/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and PDF
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|pdf|PDF)$/)) {
    req.fileValidationError = "Only image files and PDF are allowed!";
    return cb(new Error("Only image files and PDF are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Wrapper function untuk handle multer errors
const uploadWithErrorHandling = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File terlalu besar. Maksimal ukuran file adalah 5MB.',
            error: 'FILE_TOO_LARGE'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Terlalu banyak file. Hanya boleh upload 1 file.',
            error: 'TOO_MANY_FILES'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Field file tidak dikenali.',
            error: 'UNEXPECTED_FIELD'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Error upload file: ' + err.message,
          error: 'UPLOAD_ERROR'
        });
      }
      
      if (err && err.message === 'Only image files and PDF are allowed!') {
        return res.status(400).json({
          success: false,
          message: 'Hanya file gambar (JPG, PNG, GIF) atau PDF yang diperbolehkan.',
          error: 'INVALID_FILE_TYPE'
        });
      }
      
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Error upload file: ' + err.message,
          error: 'UPLOAD_ERROR'
        });
      }
      
      next();
    });
  };
};

export { upload, uploadWithErrorHandling };
