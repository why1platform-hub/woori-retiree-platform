import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ResourceSchema = new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, default: "finance" },
  fileUrl: { type: String, required: true }, // MVP: URL to a PDF/doc
  fileSize: { type: String, default: "" },
  downloads: { type: Number, default: 0 },
}, { timestamps: true });

export type Resource = InferSchemaType<typeof ResourceSchema>;
export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);
