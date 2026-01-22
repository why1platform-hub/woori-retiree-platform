import mongoose, { Schema, type InferSchemaType } from "mongoose";

const NoticeSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  badge: { type: String, enum: ["urgent","info"], default: "info" },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export type Notice = InferSchemaType<typeof NoticeSchema>;
export default mongoose.models.Notice || mongoose.model("Notice", NoticeSchema);
