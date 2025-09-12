import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    type: {
      type: String,
      enum: ['detailed', 'anonymous'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    phoneNumber: {
      type: String,
      required: function() {
        return this.type === 'detailed';
      }
    },
    ipAddress: {
      type: String
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
