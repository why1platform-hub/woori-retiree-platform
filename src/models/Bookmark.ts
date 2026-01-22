import mongoose, { Schema, type InferSchemaType } from "mongoose";

const BookmarkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
}, { timestamps: true });

BookmarkSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type Bookmark = InferSchemaType<typeof BookmarkSchema>;
export default mongoose.models.Bookmark || mongoose.model("Bookmark", BookmarkSchema);
