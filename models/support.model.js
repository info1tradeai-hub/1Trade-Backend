import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      ref: "UserModel",
    },
    subject: {
      type: String,
    },
    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Closed"],
      default: "Pending",
    },
    response: {
      type: String,
    },
    file: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Support = mongoose.model("Support", supportSchema);

export default Support;
