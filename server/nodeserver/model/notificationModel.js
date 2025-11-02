import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: false
         },
         isRead: {
            type: Boolean,
            default: false
         },
         isClickable: {
            type: Boolean,
            default: true
         },
         navigateTo: {
            type: String,
            default: null
         },
         time: {
            type: Date,
            default: Date.now
        }
    }
);

export default notificationSchema;