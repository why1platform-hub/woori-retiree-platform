import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ResumeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  summary: { type: String, default: "" },
  experience: { type: String, default: "" },
  skills: { type: String, default: "" },
}, { timestamps: true });

export type Resume = InferSchemaType<typeof ResumeSchema>;
export default mongoose.models.Resume || mongoose.model("Resume", ResumeSchema);
