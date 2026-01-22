import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CourseProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  subscribed: { type: Boolean, default: false },
  watched: { type: Boolean, default: false },
  watchedAt: { type: Date },
  subscribedAt: { type: Date },
}, { timestamps: true });

// Compound index for unique user-course combination
CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export type CourseProgress = InferSchemaType<typeof CourseProgressSchema>;
export default mongoose.models.CourseProgress || mongoose.model("CourseProgress", CourseProgressSchema);
