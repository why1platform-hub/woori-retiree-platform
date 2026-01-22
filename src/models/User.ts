import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Role } from "@/lib/auth";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user","instructor","superadmin"], default: "user" as Role },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  organization: { type: String, default: "" },
  // Instructor-specific fields
  profileType: { type: String, enum: ["personal","company",""], default: "" },
  companyName: { type: String, default: "" },
  companyPosition: { type: String, default: "" },
  expertise: { type: String, default: "" },
  passwordResetRequested: { type: Boolean, default: false },
  passwordResetRequestedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export type User = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User || mongoose.model("User", UserSchema);
