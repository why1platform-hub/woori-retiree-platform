import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ConsultationSlotSchema = new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  topic: { type: String, default: "General" },
  isBooked: { type: Boolean, default: false },
}, { timestamps: true });

export type ConsultationSlot = InferSchemaType<typeof ConsultationSlotSchema>;
export default mongoose.models.ConsultationSlot || mongoose.model("ConsultationSlot", ConsultationSlotSchema);
