import mongoose from "mongoose";

const adminInfoSchema = new mongoose.Schema({
  bep20Address: {
    type: String,
    default: null,
  },
  trc20Address: {
    type: String,
    default: null,
  },
  telegramLink: {
    type: String,
    default: null,
  },
  instagramLink: {
    type: String,
    default: null,
  },
  youtubeLink: {
    type: String,
    default: null,
  },
  twitterLink: {
    type: String,
    default: null,
  },
  ourBlog: {
    type: String,
    default: null,
  },
  documentation: {
    type: String,
    default: null,
  },
  inviteFriends: {
    type: String,
    default: null,
  },
  aiTrade: {
    type: String,
    default: null,
  },
  tutorials: {
    type: String,
    default: null,
  },
  ourBlog: {
    type: String,
    default: null,
  },
  termsService: {
    type: String,
    default: null,
  },
  privacyPolicy: {
    type: String,
    default: null,
  },
  discover: {
    type: String,
    default: null,
  },
  faq: {
    type: String,
    default: null,
  },
});

const AdminInfo = mongoose.model("AdminInfo", adminInfoSchema);
export default AdminInfo;
