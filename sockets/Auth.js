// function to check Authentication in sockets 
const { getTokenData } = require('../helpers/getTokenData');
const { getFromCache } = require('../services/checkCachedRelations');

exports.checkSocketAuth = async (token, matchId) => {
    try {
        const tokenData = getTokenData(token);
        if (!tokenData.success) {
            return {
                success: false,
                message: "Not Authorized !",
            };
        };
        const relationship = await getFromCache(matchId, tokenData.id);
        if (!relationship.success) {
            return {
                success: false,
                message: "Not Authorized !",
            };
        };
        return {
            success: true,
            message: "success",
            userId: tokenData.id
        };
    }
    catch (err) {
        return {
            success: false,
            message: `error while authenticating !`,
        };
    };
};