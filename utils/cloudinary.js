// import { v2 as cloudinary } from "cloudinary";
// import dotenv from "dotenv";
// import fs from "fs";

// dotenv.config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export default cloudinary;

// export const uploadToCloudinary = (file) => {
//   return new Promise((resolve, reject) => {
//     try {
//       if (!file || !file.path) {
//         return reject(new Error("❌ Invalid file provided"));
//       }

//       const filePath = file.path;
//       console.log("📤 Uploading:", filePath);

//       const ext = filePath.split(".").pop().toLowerCase();

//       let resourceType = "raw";
//       let folderName = "uploads";

//       if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
//         resourceType = "image";
//         folderName = "supportImages";
//       } else if (["pdf"].includes(ext)) {
//         resourceType = "raw";
//         folderName = "pdfs";
//       }

//       cloudinary.uploader.upload(
//         filePath,
//         {
//           resource_type: resourceType,
//           folder: folderName,
//         },
//         (error, result) => {
//           if (error) {
//             console.error("❌ Cloudinary upload error:", error);
//             return reject(error);
//           }

//           console.log("✅ Cloudinary upload success:", result.secure_url);

//           // ✅ SAFE LOCAL DELETE
//           fs.unlink(filePath, (err) => {
//             if (err) {
//               console.error("⚠️ Error deleting local file:", err);
//             } else {
//               console.log("🗑️ Deleted local file:", filePath);
//             }
//           });

//           resolve({
//             url: result.secure_url,
//             public_id: result.public_id,
//           });
//         }
//       );
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file || !file.path) {
        return reject(new Error("❌ Invalid file provided"));
      }

      const filePath = file.path;
      const originalName = file.originalname; // 🔥 multer se
      const ext = path.extname(originalName); // .pdf
      const baseName = path.basename(originalName, ext); // filename only

      console.log("📤 Uploading:", originalName);

      let resourceType = "raw";
      let folderName = "uploads";

      if (
        [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext.toLowerCase())
      ) {
        resourceType = "image";
        folderName = "supportImages";
      } else if (ext.toLowerCase() === ".pdf") {
        resourceType = "raw";
        folderName = "pdfs";
      }

      // cloudinary.uploader.upload(
      //   filePath,
      //   {
      //     resource_type: resourceType,
      //     folder: folderName,
      //     public_id: baseName, // ✅ SAME FILE NAME
      //     use_filename: true,
      //     unique_filename: false, // ❌ random off
      //     overwrite: true, // ✅ same name replace
      //   },
      //   (error, result) => {
      //     if (error) {
      //       console.error("❌ Cloudinary upload error:", error);
      //       return reject(error);
      //     }

      //     console.log("✅ Uploaded as:", result.public_id);

      //     // 🗑️ delete local file
      //     fs.unlink(filePath, () => {});

      //     resolve({
      //       url: result.secure_url,
      //       public_id: result.public_id,
      //       originalName,
      //     });
      //   }
      // );
      cloudinary.uploader.upload(
        filePath,
        {
          resource_type: resourceType,
          folder: folderName,

          access_mode: "public", // 🔥 REQUIRED
          type: "upload", // 🔥 REQUIRED

          public_id: baseName.replace(/\s+/g, "-"), // ❌ spaces hatao
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            return reject(error);
          }

          fs.unlink(filePath, () => {});

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};
