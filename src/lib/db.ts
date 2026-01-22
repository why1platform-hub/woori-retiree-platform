import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

global.mongooseConn = global.mongooseConn || { conn: null, promise: null };

export async function dbConnect() {
  if (global.mongooseConn.conn) return global.mongooseConn.conn;

  if (!global.mongooseConn.promise) {
    global.mongooseConn.promise = mongoose.connect(MONGODB_URI!, { dbName: "woori_platform" }).then((m) => m);
  }
  global.mongooseConn.conn = await global.mongooseConn.promise;

  // Ensure models are registered on the connected mongoose instance.
  // Some populate calls expect models to be registered on the current connection,
  // so dynamically import the model files after connecting.
  await Promise.all([
    import("@/models/User"),
    import("@/models/Application"),
    import("@/models/Program"),
    import("@/models/ConsultationBooking"),
    import("@/models/ConsultationSlot"),
    import("@/models/Course"),
    import("@/models/Notice"),
    import("@/models/Job"),
    import("@/models/PlatformSettings"),
  ]);

  return global.mongooseConn.conn;
}
