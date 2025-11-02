import mongoose from "mongoose";

const PoliceStationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  country: {
    type: String,
    required: true,
    maxlength: 64
  },
  state: {
    type: String,
    required: false,
    maxlength: 64,
    default: ""
  },
  city: {
    type: String,
    required: false,
    maxlength: 64,
    default: ""
  },
  
  // Tracking
  registeredBy: {
    type: String,
    required: true,
    index: true
  }, // clerkUserId of the police user who registered this station
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// UNIQUE constraint: Only ONE station per name + country + state + city
// Using sparse to handle optional state/city
// Also serves as index for queries filtering by these fields
PoliceStationSchema.index(
  { country: 1, state: 1, city: 1, name: 1 },
  { unique: true, sparse: true }
);

const PoliceStation = mongoose.model("PoliceStation", PoliceStationSchema);

export default PoliceStation;
