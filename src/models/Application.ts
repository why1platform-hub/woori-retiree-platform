import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
  status: { type: String, enum: ["pending","approved","in_progress","completed","rejected"], default: "pending" },
  notes: { type: String, default: "" },
}, { timestamps: true });

export type Application = InferSchemaType<typeof ApplicationSchema>;
export default mongoose.models.Application || mongoose.model("Application", ApplicationSchema);
