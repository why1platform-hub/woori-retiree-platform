import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FollowSchema = new Schema({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  followeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

export type Follow = InferSchemaType<typeof FollowSchema>;
export default mongoose.models.Follow || mongoose.model('Follow', FollowSchema);
