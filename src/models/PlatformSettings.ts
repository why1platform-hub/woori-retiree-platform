import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PlatformSettingsSchema = new Schema({
  platformName: {
    en: { type: String, default: "Woori Retiree Platform" },
    ko: { type: String, default: "우리 은퇴자 플랫폼" },
  },
  platformLogo: {
    url: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export type PlatformSettings = InferSchemaType<typeof PlatformSettingsSchema>;

export default mongoose.models.PlatformSettings || 
  mongoose.model("PlatformSettings", PlatformSettingsSchema);
