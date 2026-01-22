import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InquirySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["open","answered","closed"], default: "open" },
  reply: { type: String, default: "" },
}, { timestamps: true });

export type Inquiry = InferSchemaType<typeof InquirySchema>;
export default mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
