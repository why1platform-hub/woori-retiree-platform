import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CourseSchema = new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, default: "finance" },
  thumbnailUrl: { type: String, default: "" },
  videoUrl: { type: String, default: "" }, // MVP: URL to streaming video
  durationMin: { type: Number, default: 10 },
  views: { type: Number, default: 0 },
}, { timestamps: true });

export type Course = InferSchemaType<typeof CourseSchema>;
export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
