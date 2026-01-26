import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export type Category = InferSchemaType<typeof CategorySchema>;
export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
