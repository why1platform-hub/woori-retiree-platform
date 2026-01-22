import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FaqSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { timestamps: true });

export type Faq = InferSchemaType<typeof FaqSchema>;
export default mongoose.models.Faq || mongoose.model("Faq", FaqSchema);
