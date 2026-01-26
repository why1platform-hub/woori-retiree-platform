import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProgramSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  모집시작: { type: Date, required: true },
  모집종료: { type: Date, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["upcoming","open","closed"], default: "upcoming" },
}, { timestamps: true });

export type Program = InferSchemaType<typeof ProgramSchema>;
export default mongoose.models.Program || mongoose.model("Program", ProgramSchema);
