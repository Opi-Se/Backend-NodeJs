const recommendationModel = require('./recommendation.model');
const userModel = require('../user/user.model');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// when user login for the first time we will get his recommendation array 
exports.getFirstRecommendation = (nationalId) => {
    try {
        let result = {
            success: true,
            statusCode: 201,
            message: "success",
        }
        return fetch(`https://ml-api-x5og.onrender.com/nationalId=${nationalId}`)
            .then(recommendation => recommendation.json())
            .then(async data => {
                result = {
                    success: true,
                    statusCode: 200,
                    message: "success",
                    data: data
                }
                await recommendationModel.updateOne({ nationalId: nationalId }, { userRecommendations: data });
                return result;
            }).catch(err => {
                return {
                    success: false,
                    statusCode: 500,
                    message: "error",
                    error: err.message
                }
            });
    }
    catch (err) {
        return {
            success: false,
            statusCode: 500,
            message: err.message
        };
    };
};

// whenever the user ask for partner recommendation we will get his recommendation array
exports.getUserRecommendations = async (nationalId, page, select, populate) => {
    try {
        const limit = 5;
        const skip = (page - 1) * limit;
        let recommendation = await recommendationModel.findOne({ nationalId: nationalId }).populate(populate).select('userRecommendations user');
        if (!recommendation) {
            return {
                success: false,
                statusCode: 404,
                message: "could not find any recommendations for this user !"
            }
        }
        if (recommendation.user.partnerId) {
            return {
                success: false,
                statusCode: 401,
                message: "user already has a partner !"
            };
        }
        recommendation = recommendation.userRecommendations.map(user => user.nationalId);
        const users = await userModel.find({ nationalId: { $in: recommendation }, isAvailable: true }).populate({ path: 'profileDetails', select: 'fieldOfStudy specialization userSkills' }).select(select);
        if (users.length === 0) {
            return {
                success: true,
                hasRecommendation: false,
                statusCode: 200,
                message: "there is no recommendations yet !",
            }
        }
        return {
            success: true,
            hasRecommendation: true,
            statusCode: 200,
            message: "success",
            totalNumOfItems: users.length,
            totalPages: Math.ceil(users.length / limit),
            currentPage: page,
            data: users.slice(skip, skip + limit)
        }
    }
    catch (err) {
        return {
            success: false,
            statusCode: 500,
            message: err.message
        }
    }
};

// replicate data for ML model ( recommendation collection )
exports.replicateDataForModels = async (data) => {
    try {
        let result = await recommendationModel.findOneAndUpdate({ nationalId: data.nationalId }, data, { upsert: true, new: true });
        if (!result) {
            return {
                success: false,
                statusCode: 417,
                message: "could not replicate data for models !"
            }
        }
        return {
            success: true,
            statusCode: 201,
            message: "success",
            data: result
        }
    }
    catch (err) {
        return {
            success: false,
            statusCode: 500,
            message: err.message
        }
    }
};

// update data for ML model ( update rate when user dismatch in recommendation collection )
exports.updateData = async (filter, update) => {
    try {
        const result = await recommendationModel.updateOne(filter, update);
        if (!result) {
            return {
                success: false,
                statusCode: 417,
                message: "could not update data !"
            }
        }
        return {
            success: true,
            statusCode: 201,
            message: "success",
        }
    }
    catch (err) {
        return {
            success: false,
            statusCode: 500,
            message: err.message
        }
    }
};

// get user prefers and skills  
exports.getUserDetails = async (filter, select) => {
    try {
        let data = await recommendationModel.findOne(filter).select(select);
        if (!data) {
            return {
                success: false,
                statusCode: 404,
                message: "could not found any details for this user !"
            }
        }
        return {
            success: true,
            statusCode: 200,
            message: "success",
            data: data
        }
    }
    catch (err) {
        return {
            success: false,
            statusCode: 500,
            message: err.message
        }
    }
};
