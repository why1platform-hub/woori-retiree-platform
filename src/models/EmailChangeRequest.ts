import mongoose, { Schema, type InferSchemaType } from "mongoose";

const EmailChangeRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  newEmail: { type: String, required: true },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

export type EmailChangeRequest = InferSchemaType<typeof EmailChangeRequestSchema>;
export default mongoose.models.EmailChangeRequest || mongoose.model("EmailChangeRequest", EmailChangeRequestSchema);
