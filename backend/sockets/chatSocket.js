const Message = require("../models/Messages");
const Chat = require("../models/chat");
const User = require("../models/Users");
const Notification = require("../models/notification");
const jwt = require("jsonwebtoken");
require("dotenv").config();

function chatSocketHandler(io) {
  // Authenticate socket using JWT from cookies
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error("Authentication required"));

      const token = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("accessToken="))
        ?.split("=")[1];

      if (!token) return next(new Error("Access token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id);
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      console.log("✅ Socket authenticated for:", user.firstname);
      next();
    } catch (err) {
      console.error("❌ JWT verification failed:", err.message);
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ ${socket.user.firstname} connected (${socket.id})`);
    socket.join(`user_${socket.user._id}`);
    io.emit("userOnline", { userId: socket.user._id });

    // Chat room joins
    socket.on("joinRoom", (chatId) => {
      socket.join(chatId);
      console.log(`🟢 ${socket.user.firstname} joined room ${chatId}`);
    });

    socket.on("leaveRoom", (chatId) => {
      socket.leave(chatId);
      console.log(`🚪 ${socket.user.firstname} left room ${chatId}`);
    });

    // Send message + notify
    socket.on("sendMessage", async ({ chatId, content, attachments, replyTo }) => {
      try {
        const message = await Message.create({
          chat: chatId,
          sender: socket.user._id,
          content: content?.trim(),
          attachments,
          replyTo
        });

        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            lastMessage: message._id,
            updatedAt: new Date(),
            $inc: { unreadCount: 1 }
          },
          { new: true }
        ).populate("participants");

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username profilePic")
          .populate({
            path: "chat",
            populate: { path: "participants", select: "username profilePic" }
          });

        io.to(chatId).emit("receiveMessage", populatedMessage);
        console.log("📤 Message sent to room:", chatId);

      } catch (err) {
        console.error("❌ Failed to send message:", err.message);
        socket.emit("messageError", {
          message: "Failed to send message",
          error: err.message
        });
      }
    });
    socket.on("markAsSeen", async ({ chatId }) => {
      try {
        await Message.updateMany(
          {
            chat: chatId,
            "readBy.user": { $ne: socket.user._id } // Only those not yet read by this user
          },
          {
            $push: {
              readBy: {
                user: socket.user._id,
                readAt: new Date()
              }
            }
          }
        );

        io.to(chatId).emit("messagesMarkedAsSeen", {
          chatId,
          userId: socket.user._id
        });
      } catch (err) {
        console.error("❌ Error marking messages as seen:", err.message);
      }
    });


    // Delete message
    socket.on("deleteMessage", async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit("messageError", { message: "Message not found" });
        }
        if (message.sender.toString() !== socket.user._id.toString()) {
          return socket.emit("messageError", { message: "You can only delete your own messages" });
        }

        message.deleted = true;
        message.deletedAt = new Date();
        await message.save();

        io.to(message.chat.toString()).emit("messageDeleted", { messageId });
        console.log(`🗑️ Soft-deleted message ${messageId}`);
      } catch (err) {
        console.error("❌ Failed to delete message:", err.message);
        socket.emit("messageError", {
          message: "Failed to delete message",
          error: err.message
        });
      }
    });


    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ ${socket.user.firstname} disconnected`);
      io.emit("userOffline", { userId: socket.user._id });
    });
  });
}

module.exports = chatSocketHandler;
