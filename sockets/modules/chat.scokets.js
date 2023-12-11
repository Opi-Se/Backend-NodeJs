// events related to chat module
const mongoose = require('mongoose');
const chatRepo = require('../../models/chat/chat.repo.js');
const relationshipRepo = require('../../models/relationship/relationship.repo.js');

// event to send message in chat 
exports.sendMessage = async (socket, data, ack) => {
    try {
        const matchId = socket.handshake.query.matchId;
        const chat = await chatRepo.updateChat({ matchId }, { $push: { chat: data } }, { upsert: true, new: true });
        if (!chat.success) {
            return ack({
                success: false,
                message: `error while sending message !`,
            })
        }
        socket.broadcast.to(matchId).emit("receiveMessage", { data: data });
        return ack({
            success: true,
            message: `message sent successfully !`,
            data: data
        })
    }
    catch (err) {
        console.log(err.message)
        return ack({
            success: false,
            message: `error while sending message !`,
        })
    }
};

// event to delete message from chat 
exports.deleteMessage = async (socket, data, ack) => {
    try {
        const matchId = socket.handshake.query.matchId;
        if (!mongoose.isValidObjectId(data.messageId)) {
            return ack({
                success: false,
                message: `invalid message id !`,
            })
        }
        const chat = await chatRepo.updateChat({ matchId }, { $pull: { chat: { _id: data.messageId } } }, { new: true });
        if (!chat.success) {
            return ack({
                success: false,
                message: `error while deleting message !`,
            })
        }
        socket.broadcast.to(matchId).emit("messageDeleted", data.messageId);
        return ack({
            success: true,
            message: `message deleted successfully !`,
            data: data
        })
    }
    catch (err) {
        console.log(err.message)
        return ack({
            success: false,
            message: `error while deleting message !`,
        })
    }
};

// event to start chat session  
exports.startChatSession = async (socket, data, ack) => {
    try {
        const matchId = socket.handshake.query.matchId;
        socket.broadcast.to(matchId).emit("newChatSessionRequest", data);
        return ack({
            success: true,
            message: `session request was sent !`,
        })
    }
    catch (err) {
        console.log(err.message)
        return ack({
            success: false,
            message: `error while sending message !`,
        })
    }
};

// event to reply on chat session request ( accept / reject )
exports.replyToSessionRequest = async (socket, data, ack) => {
    try {
        const matchId = socket.handshake.query.matchId;
        socket.broadcast.to(matchId).emit("replyToRequest", { data });
        return ack({
            success: true,
            message: `reply on session request was sent !`,
        })
    }
    catch (err) {
        console.log(err.message)
        return ack({
            success: false,
            message: `error while sending message !`,
        })
    }
};

// event to end chat session
exports.endChatSession = async (socket, data, ack) => {
    try {
        const matchId = socket.handshake.query.matchId;
        socket.broadcast.to(matchId).emit("terminateSession", { message: "session was ended by your partner !" });
        const result = await relationshipRepo.updateRelationship({ matchId: matchId }, { $push: { sessionsHistory: data } });
        if (!result.success) {
            return ack({
                success: false,
                message: `chat session was ended but could not record the session !`,
            })
        }
        return ack({
            success: true,
            message: `chat session was ended and recorded successfully !`,
        })
    }
    catch (err) {
        console.log(err.message)
        return ack({
            success: false,
            message: `error while ending session !`,
        })
    }
};