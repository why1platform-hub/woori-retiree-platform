import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

await mongoose.connect(uri, { dbName: "woori_platform" });

const { Schema } = mongoose;

const User = mongoose.models.User || mongoose.model("User", new Schema({
  name: String,
  email: { type: String, unique: true, index: true },
  passwordHash: String,
  role: { type: String, enum: ["user","instructor","superadmin"], default: "user" },
}, { timestamps: true }));

const Notice = mongoose.models.Notice || mongoose.model("Notice", new Schema({
  title: String,
  body: String,
  badge: { type: String, enum: ["urgent","info"], default: "info" },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true }));

const Program = mongoose.models.Program || mongoose.model("Program", new Schema({
  name: String,
  category: { type: String, enum: ["finance","realestate","startup","social"] },
  startDate: Date,
  endDate: Date,
  모집시작: Date,
  모집종료: Date,
  description: String,
}, { timestamps: true }));

const Job = mongoose.models.Job || mongoose.model("Job", new Schema({
  company: String,
  title: String,
  location: String,
  employmentType: String,
  salary: String,
  requirements: String,
  applyUrl: String,
}, { timestamps: true }));

const Faq = mongoose.models.Faq || mongoose.model("Faq", new Schema({
  question: String,
  answer: String,
}, { timestamps: true }));

const Course = mongoose.models.Course || mongoose.model("Course", new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: "User" },
  title: String,
  category: { type: String, enum: ["finance","realestate","startup","social"], default: "finance" },
  thumbnailUrl: String,
  videoUrl: String,
  durationMin: Number,
  views: Number,
}, { timestamps: true }));

const Resource = mongoose.models.Resource || mongoose.model("Resource", new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: "User" },
  title: String,
  category: { type: String, enum: ["finance","realestate","startup","social"], default: "finance" },
  fileUrl: String,
  fileSize: String,
  downloads: Number,
}, { timestamps: true }));

const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model("PlatformSettings", new Schema({
  platformName: {
    en: { type: String, default: "Woori Retiree Platform" },
    ko: { type: String, default: "우리 은퇴자 플랫폼" },
  },
  platformLogo: {
    url: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true }));

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne(
    { email },
    { $setOnInsert: { name, email, passwordHash, role } },
    { upsert: true }
  );
}

await upsertUser({ name: "Admin", email: "admin@demo.com", password: "Admin123!", role: "superadmin" });
await upsertUser({ name: "Instructor", email: "instructor@demo.com", password: "Instructor123!", role: "instructor" });
await upsertUser({ name: "User", email: "user@demo.com", password: "User123!", role: "user" });

const instructor = await User.findOne({ email: "instructor@demo.com" });
const admin = await User.findOne({ email: "admin@demo.com" });

await Notice.deleteMany({});
await Program.deleteMany({});
await Job.deleteMany({});
await Faq.deleteMany({});
await Course.deleteMany({});
await Resource.deleteMany({});
await PlatformSettings.deleteMany({});

await Notice.create([
  { title: "Welcome to the platform", body: "We are preparing new programs for retirees.", badge: "info" },
  { title: "Urgent: Profile update", body: "Please update your resume to receive better job recommendations.", badge: "urgent" },
]);

const now = new Date();
const in10 = new Date(Date.now() + 10*24*60*60*1000);
const in20 = new Date(Date.now() + 20*24*60*60*1000);

await Program.create([
  { name: "Retiree Finance Consulting Track", category: "finance", startDate: in20, endDate: new Date(in20.getTime()+7*24*60*60*1000), 모집시작: now, 모집종료: in10, description: "Practical finance consulting preparation." },
  { name: "Startup Mentoring Basics", category: "startup", startDate: in20, endDate: new Date(in20.getTime()+5*24*60*60*1000), 모집시작: now, 모집종료: in10, description: "Learn how to mentor startups." },
]);

await Job.create([
  { company: "Woori Partner Co.", title: "Senior Business Advisor", location: "Seoul", employmentType: "Contract", salary: "Negotiable", requirements: "10+ years experience in banking/consulting", applyUrl: "https://example.com" },
  { company: "Community Org", title: "Social Contribution Project Lead", location: "Remote", employmentType: "Part-time", salary: "KRW 3M/month", requirements: "Project management, stakeholder communication", applyUrl: "https://example.com" },
]);

await Faq.create([
  { question: "How do I apply to a program?", answer: "Go to Programs → select an open program → Apply." },
  { question: "How do consultations work?", answer: "Book an open slot, then the consultant will share a meeting link if needed." },
]);

await Course.create([
  { instructorId: instructor._id, title: "Finance Planning for Retirees", category: "finance", videoUrl: "https://www.youtube.com/", durationMin: 20, views: 10 },
]);

await Resource.create([
  { instructorId: instructor._id, title: "Resume Template (PDF)", category: "finance", fileUrl: "https://example.com/template.pdf", fileSize: "0.4MB", downloads: 3 },
]);

await PlatformSettings.create([
  { platformName: { en: "Woori Retiree Platform", ko: "우리 은퇴자 플랫폼" }, platformLogo: { url: "", fileName: "" }, updatedBy: admin._id },
]);

console.log("Seed complete.");
await mongoose.disconnect();
