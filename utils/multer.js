import multer from "multer";
import path from "path";
import fs from "fs";

const uploadPath = "uploads/banners";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const bannerUpload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});
export default bannerUpload;
