import mongoose, { Schema, type InferSchemaType } from "mongoose";

const JobSchema = new Schema({
  company: { type: String, required: true },
  title: { type: String, required: true },
  location: { type: String, default: "" },
  employmentType: { type: String, default: "Full-time" },
  salary: { type: String, default: "" },
  requirements: { type: String, default: "" },
  description: { type: String, default: "" },
  companyLogo: { type: String, default: "" },
  applyUrl: { type: String, default: "" },
}, { timestamps: true });

export type Job = InferSchemaType<typeof JobSchema>;
export default mongoose.models.Job || mongoose.model("Job", JobSchema);
