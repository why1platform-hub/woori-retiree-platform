import mongoose, { Schema, type InferSchemaType } from "mongoose";

const MessageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export type Message = InferSchemaType<typeof MessageSchema>;
export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
