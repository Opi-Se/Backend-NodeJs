const joi = require("joi");
const objectId = require('joi-objectid')(joi);

module.exports = {

    getAllTasksValid: {
        params: joi.object().required().keys({
            matchId: objectId().required().messages({
                "string.empty": "match id can't be empty",
                "any.required": "match id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),
            year: joi.number().integer().min(2024).required().messages({
                "number.base": "Year must be a number",
                "number.integer": "Year must be an integer",
                "number.min": "Year must be more than or equal 2024",
                "any.required": "Year is required",
            }),
            month: joi.number().integer().min(1).max(12).required().messages({
                "number.base": "Month must be a number",
                "number.integer": "Month must be an integer",
                "number.min": "Month must be between 1 and 12",
                "number.max": "Month must be between 1 and 12",
                "any.required": "Month is required",
            }),
            page: joi.number().min(1).default(1).messages({
                "number.base": "page must be a number",
                "number.min": "page must be a positive number",
            }),
            limit: joi.number().min(1).default(10).messages({
                "number.base": "page must be a number",
                "number.min": "page must be a positive number",
            }),

        }),
    },

    getSpecificTasksTypeValid: {
        params: joi.object().required().keys({

            page: joi.number().min(1).default(1).messages({
                "number.base": "page must be a number",
                "number.min": "page must be a positive number",
            }),

            limit: joi.number().min(1).default(10).messages({
                "number.base": "page must be a number",
                "number.min": "page must be a positive number",
            }),

            type: joi.string().valid('toDo', 'inProgress', 'done').messages({
                "string.any": " task status must be one of [toDo, InProgress, done]",
            }),

            matchId: objectId().required().messages({
                "string.empty": "match id can't be empty",
                "any.required": "match id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),

        }),
    },

    addTaskValid: {
        body: joi.object().required().keys({

            title: joi.string().required().messages({
                "string.empty": "title can't be empty",
                "any.required": "title is required"
            }),

            content: joi.string().required().messages({
                "string.empty": "content can't be empty",
                "any.required": "content is required"
            }),

            startDate: joi.date().required().messages({
                "string.empty": "start date can't be empty",
                "any.required": "start date is required"
            }),

            endDate: joi.date().required().messages({
                "string.empty": "end date can't be empty",
                "any.required": "end date is required"
            }),

        }),
    },

    editTaskValid: {

        body: joi.object().required().keys({
            title: joi.string(),
            content: joi.string(),
            startDate: joi.date(),
            endDate: joi.date(),
            taskStatus: joi.string().valid('toDo', 'inProgress', 'done').messages({
                "any.only": " task status must be one of [toDo, InProgress, done]",
            }),
        }),

        params: joi.object().required().keys({
            taskId: objectId().required().messages({
                "string.empty": "task id can't be empty",
                "any.required": "task id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),
            matchId: objectId().required().messages({
                "string.empty": "match id can't be empty",
                "any.required": "match id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),
        }),

    },

    deleteTaskValid: {
        params: joi.object().required().keys({

            taskId: objectId().required().messages({
                "string.empty": "task id can't be empty",
                "any.required": "task id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),

            matchId: objectId().required().messages({
                "string.empty": "match id can't be empty",
                "any.required": "match id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),

        }),
    },

    deleteAllTasksTypeValid: {
        params: joi.object().required().keys({

            type: joi.string().valid('toDo', 'inProgress', 'done').messages({
                "string.any": " task status must be one of [toDo, InProgress, done]",
            }),

            matchId: objectId().required().messages({
                "string.empty": "match id can't be empty",
                "any.required": "match id is required",
                'objectId.invalid': 'task id must be a valid id'
            }),

        }),
    },

};