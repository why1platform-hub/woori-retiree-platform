import mongoose, { Schema, type InferSchemaType } from "mongoose";

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, required: true },
  text: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export type Notification = InferSchemaType<typeof NotificationSchema>;
export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
