import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  if (!allowed.includes(ext)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed"), false);
  }
  cb(null, true);
};

export const upload = multer({ storage, fileFilter });
