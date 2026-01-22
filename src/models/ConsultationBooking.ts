import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ConsultationBookingSchema = new Schema({
  slotId: { type: Schema.Types.ObjectId, ref: "ConsultationSlot", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  notes: { type: String, default: "" },
  meetingLink: { type: String, default: "" },
  status: { type: String, enum: ["pending","approved","rejected","done","cancelled"], default: "pending" },
}, { timestamps: true });

export type ConsultationBooking = InferSchemaType<typeof ConsultationBookingSchema>;
export default mongoose.models.ConsultationBooking || mongoose.model("ConsultationBooking", ConsultationBookingSchema);
