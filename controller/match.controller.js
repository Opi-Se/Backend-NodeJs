const mongoose = require('mongoose');
const { client } = require('../config/redis.config');
const { setUpMails } = require('../helpers/sendEmail');
const userRepo = require("../models/user/user.repo");
const { sendNotification } = require('../services/sendPushNotification');
const relationshipRepo = require("../models/relationship/relationship.repo");
const recommendationRepo = require("../models/recommendation/recomendation.repo");
const { deleteRelationship } = require('../services/checkCachedRelations');

// function that allows user to get his partner requests 
exports.getMatchRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                message: "Not Authorized !"
            })
        }
        const requests = await userRepo.isExist({ _id: userId }, 'partnerRequests');
        if (!requests.success) {
            return res.status(requests.statusCode).json({
                message: requests.message
            })
        }
        return res.status(200).json({
            message: 'success',
            data: requests.data
        })
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        })
    }
};

// function that allows user to search for a specific partner with his partnerId 
exports.searchForSpecificPartner = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                message: "Not Authorized !"
            })
        }
        const select = '-password -partnerRequests -notifications -isVerified -numOfReports -deviceTokens -history';
        const result = await userRepo.isExist({ _id: userId }, select);
        if (!result.success) {
            return res.status(result.statusCode).json({
                message: "partner not found !"
            })
        }
        let getProfile = await recommendationRepo.getUserDetails({ nationalId: result.data.nationalId }, 'fieldOfStudy specialization userSkills');
        return res.status(200).json({
            message: "success",
            data: result.data,
            profileDetails: getProfile.data
        })
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        })
    }
};

// function that performs the database and push notification logic for sending partner request
exports.sendPartnerRequest = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                message: "Not Authorized !"
            })
        }
        newRequest = {
            partnerId: req.user.id,
            nationalId: req.user.nationalId,
            partnerUserName: req.user.userName,
            email: req.user.email
        };
        const updateUserData = await userRepo.updateUser(
            { _id: userId },
            {
                $push: {
                    notifications: { message: "you have a new partner request check it out !" },
                    partnerRequests: newRequest
                },
                isAvailable: false
            },
        );
        res.status(updateUserData.statusCode).json({
            success: updateUserData.success,
            message: updateUserData.message,
            notifiedPartner: updateUserData.success ? updateUserData.notifiedPartner = userId : null
        });
        await sendNotification(updateUserData.data.deviceTokens, type = "newPartnerRequest");
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        });
    };
};

// function that performs the database logic and push notification when decline partner request
exports.declineMatchRequest = async (req, res) => {
    try {
        const { id } = req.user;
        const { rejectedUserId, email, requestId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(rejectedUserId)) {
            return res.status(401).json({
                message: "Not Authorized !"
            })
        }
        const user = userRepo.updateUser({ _id: id }, { $pull: { partnerRequests: { _id: requestId } } });
        const deliverEmail = setUpMails("rejectionEmail", { email: email });
        const updateUserData = userRepo.updateUser(
            { _id: rejectedUserId },
            { $push: { notifications: { message: "unfortunately, your partner request was rejected, but it's not the end you still can find your another partner :) " } } },
            'deviceTokens'
        )
        const result = await Promise.all([deliverEmail, user, updateUserData]);
        if (!result[0].success || !result[1].success || !result[2].success) {
            return res.status(500).json({
                message: "error",
                error: "error when declining partner request"
            })
        }
        res.status(200).json({
            message: "success",
            success: true
        })
        await sendNotification(result[2].data.deviceTokens, type = "rejectMatchRequest");
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        })
    }
};

// function that performs the database logic and push notification for accepting partner request
exports.acceptMatchRequest = async (req, res) => {
    try {
        const { partner2Id, nationalId } = req.query;
        const partner1Id = req.user.id;
        if (!mongoose.Types.ObjectId.isValid(partner2Id)) {
            return res.status(401).json({
                message: "Not Authorized !"
            })
        }
        const matchId = new mongoose.Types.ObjectId();
        const bulkUpdate = await userRepo.bulkUpdate([
            {
                updateOne: {
                    filter: { _id: partner1Id },
                    update: {
                        $set: {
                            matchId: matchId,
                            partnerId: partner2Id,
                            isAvailable: false,
                            partnerRequests: []
                        }
                    }
                }
            },
            {
                updateOne: {
                    filter: { _id: partner2Id },
                    update: {
                        $set: {
                            matchId: matchId,
                            partnerId: partner1Id,
                            isAvailable: false,
                            partnerRequests: []
                        },
                        $push: {
                            notifications: { message: "you have a new partner with a new chance don't miss this !" }
                        }
                    }
                }
            }
        ]);
        const createRelationship = relationshipRepo.createRelationship({
            _id: matchId,
            firstPartnerId: partner1Id,
            secondPartnerId: partner2Id,
            firstNationalId: req.user.nationalId,
            secondNationalId: nationalId,
            matchId: matchId,
            matchDate: Date.now()
        });
        const stringData = JSON.stringify([{ _id: partner1Id }, { _id: partner2Id }]);
        const cacheRelationship = client.set(`${matchId}`, stringData);
        const result = await Promise.all([bulkUpdate, createRelationship, cacheRelationship]);
        if (!result[0].success || !result[1].success || !result[2]) {
            return res.status(500).json({
                message: "error",
                error: "error when accepting partner request"
            })
        }
        res.status(200).json({
            message: "success",
            success: true,
            acceptedPartner: partner1Id,
            notifiedPartner: partner2Id,
            matchId: matchId
        });
        await sendNotification(result[1].data.deviceTokens, type = "acceptMatchRequest");
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        })
    }
};

// function that performs the database logic for dismatch with partner 
exports.disMatchWithPartner = async (req, res) => {
    try {
        const rate = req.body;
        let { matchId } = req.query;
        let relationship = await relationshipRepo.isExist({ matchId: matchId });
        if (!relationship.success) {
            return res.status(relationship.statusCode).json({
                message: relationship.error
            })
        }
        const updateUsersProgress = userRepo.updateManyUsers(
            { _id: { $in: [relationship.data.firstPartnerId, relationship.data.secondPartnerId] } },
            {
                isAvailable: true, matchId: null, partnerId: null, $inc: { points: relationship.data.progressPoints }, history: { matchId: matchId },
                $push: { notifications: { message: "it seems like your partner wasn't your best match, but the chance is not over yet. you can look for a better partner" } }
            }
        )
        const updateRate = recommendationRepo.updateData({ nationalId: req.user.nationalId }, { $push: { partnerRate: rate } });
        const deleteCachedRelationship = deleteRelationship(matchId);
        const result = await Promise.all([updateUsersProgress, updateRate, deleteCachedRelationship]);
        if (!result[0].success || !result[1].success, !result[2].success) {
            return res.status(500).json({
                message: "error",
                error: "error when dismatch with partner"
            })
        }
        return res.status(200).json({
            message: "success"
        })
    }
    catch (err) {
        return res.status(500).json({
            message: "error",
            error: err.message
        })
    }
}; 