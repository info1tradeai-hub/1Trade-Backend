// models/pdfModel.js
import mongoose from "mongoose";

const pdfFileSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const pdfSchema = new mongoose.Schema(
  {
    learnMore: {
      type: pdfFileSchema,
      default: null,
    },
    presentation: {
      type: pdfFileSchema,
      default: null,
    },
    whitepaper: {
      type: pdfFileSchema,
      default: null,
    },
    lightpaper: {
      type: pdfFileSchema,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const Pdf = mongoose.model("Pdf", pdfSchema);
export default Pdf;
