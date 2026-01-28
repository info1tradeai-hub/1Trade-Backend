import ConversationModel from "../models/conversation.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import Message from "../models/message.model.js";
import Admin from "../models/admin.model.js";

//   try {
//     const receiverId = req.params.id;
//     const senderId = req.user._id;
//     const { message } = req.body;

//     if (!message) {
//       return res.status(400).json({ message: "Message content is required." });
//     }

//     // check existing conversation
//     let conversation = await ConversationModel.findOne({
//       participants: { $all: [senderId, receiverId] },
//     });

//     // if no conversation, create new
//     if (!conversation) {
//       conversation = new ConversationModel({
//         participants: [senderId, receiverId],
//         messages: [],
//       });
//     }

//     // create new message
//     const messageData = await Message.create({
//       senderId,
//       receiverId,
//       message,
//     });

//     // ✅ add message reference into conversation
//     if (messageData) {
//       conversation.messages.push(messageData._id);
//       await conversation.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: "Message sent successfully.",
//       data: messageData,
//       conversation,
//     });
//   } catch (error) {
//     console.error("Error sending message:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

// controller/message.controller.js
export const getMessages = async (req, res) => {
  try {
    const myId = req.admin._id || req.user._id;
    const otherId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await ConversationModel.find({
      participants: userId,
    })
      .populate("participants", "fullname profile email")
      .populate("messages");
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const sendMessage = async ({ senderId, receiverId, message, type }) => {
  try {
    let msgType = type;
    let msgContent = message;

    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = new ConversationModel({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: msgContent,
      type: msgType,
    });

    conversation.messages.push(newMessage._id);
    await conversation.save();

    console.log("📩 Message sent successfully:", newMessage);

    return newMessage;
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    throw error;
  }
};

export const getMessagesForUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = await Admin.findOne().select("_id");
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const deleteUserChatByAdmin = async (req, res) => {
  try {
    const { userIds } = req.body;
    console.log(userIds);

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs are required.",
      });
    }

    const admin = await Admin.findOne().select("_id");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    const idsArray = Array.isArray(userIds) ? userIds : [userIds];

    const conversations = await ConversationModel.find({
      participants: { $all: [admin._id] },
      participants: { $in: idsArray },
    });
    console.log(conversations);

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No conversations found for given user IDs.",
      });
    }

    const allMessageIds = conversations.flatMap((conv) => conv.messages);

    await Message.deleteMany({ _id: { $in: allMessageIds } });

    const conversationIds = conversations.map((conv) => conv._id);
    await ConversationModel.deleteMany({ _id: { $in: conversationIds } });

    return res.status(200).json({
      success: true,
      message: "Chats deleted successfully for selected users.",
      deletedChats: idsArray.length,
      deletedMessages: allMessageIds.length,
    });
  } catch (error) {
    console.error("❌ Error deleting chats by admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
