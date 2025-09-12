import mongoose from "mongoose";
import notificationSchema from "./notificationModel.js";

const caseModel = new mongoose.Schema(
  {
    // Personal Information
    fullName: {
      type: String,
    },
    age: {
      type: String,
    },
    gender: { 
      type: String, 
      enum: ["male", "female", "other"]
    },
    contactNumber: {
      type: String,
      required: true,
    },
    height: {
      type: String,
    },
    complexion: {
      type: String,
    },
    identificationMark: {
      type: String,
    },
    dateMissingFound: { 
      type: Date, 
      required: true 
    },
    city: { 
      type: String,
    },
    state: { 
      type: String,
    },
    pincode: {
      type: String,
      required: true,
    },
    country: { 
      type: String,
      required: true,
    },
    description: { 
      type: String 
    },
    addedBy: {
      type: String,
      required: true
    },
    caseOwner: {
      type: String,
      required: true
    },
    landMark: {
      type: String,
    },
    FIRNumber:{
      type: String
    },
    policeStationState: {
      type: String,
    },
    policeStationCity: {
      type: String,
    },
    policeStationName: {
      type: String,
    },
    policeStationCountry: {
      type: String,
      required: true,
    },
    caseRegisterDate: {
      type: Date,
    },
    isAssigned: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["missing", "found", "closed"],
      default: "missing"
    },
    reportedBy: {
        type: String,
        enum: ["general_user", "police", "NGO"]
    },
    reward: String,
    lastSearchedTime: {
      type: Date,
      default: function() {
        return this.createdAt || new Date();
      }
    },
    notifications: {
        type: [notificationSchema],
        default: []
    },
    similarCaseIds: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },
    verificationBypassed: {
        type: Boolean,
        default: false
    },
    showCase: {
        type: Boolean,
        default: true
    }
  },
  { timestamps: true }
);

const Case = mongoose.model("Case", caseModel);
export default Case;
