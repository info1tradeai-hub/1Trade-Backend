// import mongoose from "mongoose";

// const userRewardSchema = mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "UserModel",
//     },
//     amount: {
//       type: Number,
//       default: 0,
//     },
//     message: {
//       type: String,
//       default: "",
//     },
//     contributors: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "UserModel",
//       },
//     ],
//     type: {
//       type: String,
//       enum: ["referral", "joining"],
//     },
//     slabId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "AdminReferralRewardSlab",
//     },
//   },
//   { timestamps: true }
// );

// const UserRewardModel = mongoose.model("UserRewardModel", userRewardSchema);
// export default UserRewardModel;

import mongoose from "mongoose";

const userRewardSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    amount: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      default: "",
    },
    contributors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
    type: {
      type: String,
      enum: ["referral", "joining"],
    },
    slabId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminReferralRewardSlab",
    },
    isApplied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserRewardModel = mongoose.model("UserRewardModel", userRewardSchema);
export default UserRewardModel;
