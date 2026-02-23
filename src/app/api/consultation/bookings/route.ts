import { dbConnect } from "@/lib/db";
import ConsultationSlot from "@/models/ConsultationSlot";
import ConsultationBooking from "@/models/ConsultationBooking";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user", "instructor", "superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const instructorView = searchParams.get("instructor") === "true";

  await dbConnect();

  let filter = {};
  if (auth!.role === "superadmin") {
    filter = {};
  } else if (auth!.role === "instructor" || instructorView) {
    filter = { instructorId: auth!.sub };
  } else {
    filter = { userId: auth!.sub };
  }

  const items = await ConsultationBooking.find(filter)
    .populate("slotId")
    .populate("userId", "name email")
    .populate("instructorId", "name email")
    .sort({ createdAt: -1 })
    .lean();
  return json({ bookings: items });
}

const Body = z.object({
  slotId: z.string().min(1),
  notes: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user", "instructor", "superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const slot = await ConsultationSlot.findById(parsed.data.slotId);
  if (!slot) return error("Slot not found", 404);
  if (slot.isBooked) return error("Slot already booked", 409);

  // Check if user already has a pending/approved booking for this slot
  const existing = await ConsultationBooking.findOne({
    slotId: slot._id,
    userId: auth!.sub,
    status: { $in: ["pending", "approved"] }
  });
  if (existing) return error("You already have a booking for this slot", 409);

  const booking = await ConsultationBooking.create({
    slotId: slot._id,
    userId: auth!.sub,
    instructorId: slot.instructorId,
    notes: parsed.data.notes,
    status: "pending",
  });

  // create notification for instructor
  const NotificationModel = (await import("@/models/Notification")).default;
  try {
    await NotificationModel.create({ userId: slot.instructorId, type: 'booking_request', text: `New booking requested by ${auth!.name}`, payload: { bookingId: booking._id } });
    // notify user
    await NotificationModel.create({ userId: auth!.sub, type: 'booking', text: `Your booking request was submitted`, payload: { bookingId: booking._id } });
  } catch (e) {
    console.error('Failed to create booking notifications', e);
  }

  return json({ booking }, { status: 201 });
}

const PatchActionBody = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  meetingLink: z.string().optional().default("")
});

const AdminPatchBody = z.object({
  bookingId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  meetingLink: z.string().optional().default(""),
  instructorId: z.string().optional(),
  slotId: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const body = await req.json().catch(() => null);

  // First try instructor action shape
  const actionParsed = PatchActionBody.safeParse(body);
  if (actionParsed.success) {
    const parsed = actionParsed.data;

    await dbConnect();
    const booking = await ConsultationBooking.findById(parsed.bookingId);
    if (!booking) return error("Booking not found", 404);

    // Check if instructor owns this booking (unless superadmin)
    if (auth!.role === "instructor" && String(booking.instructorId) !== auth!.sub) {
      return error("Forbidden", 403);
    }

    if (booking.status !== "pending") {
      return error("Booking is not pending", 400);
    }

    if (parsed.action === "approve") {
      // Mark slot as booked
      const slot = await ConsultationSlot.findById(booking.slotId);
      if (slot) {
        slot.isBooked = true;
        await slot.save();
      }

      // Reject all other pending bookings for this slot
      await ConsultationBooking.updateMany(
        { slotId: booking.slotId, _id: { $ne: booking._id }, status: "pending" },
        { $set: { status: "rejected" } }
      );

      booking.status = "approved";
      booking.meetingLink = parsed.meetingLink || "";
      await booking.save();

      // notify user
      const NotificationModel = (await import("@/models/Notification")).default;
      await NotificationModel.create({ userId: booking.userId, type: 'booking_status', text: `Your booking was approved`, payload: { bookingId: booking._id } });
    } else {
      booking.status = "rejected";
      await booking.save();
      const NotificationModel = (await import("@/models/Notification")).default;
      await NotificationModel.create({ userId: booking.userId, type: 'booking_status', text: `Your booking was rejected`, payload: { bookingId: booking._id } });
    }

    return json(booking);
  }

  // Otherwise, try admin update shape (superadmin only)
  const adminParsed = AdminPatchBody.safeParse(body);
  if (!adminParsed.success) return error("Invalid input", 400);
  if (auth!.role !== "superadmin") return error("Forbidden", 403);

  await dbConnect();
  const booking = await ConsultationBooking.findById(adminParsed.data.bookingId);
  if (!booking) return error("Booking not found", 404);

  // Update slot assignment
  if (adminParsed.data.slotId && String(booking.slotId) !== adminParsed.data.slotId) {
    const newSlot = await ConsultationSlot.findById(adminParsed.data.slotId);
    if (!newSlot) return error("Slot not found", 404);
    if (newSlot.isBooked) return error("Slot already booked", 400);

    // Unbook old slot
    const oldSlot = await ConsultationSlot.findById(booking.slotId);
    if (oldSlot) { oldSlot.isBooked = false; await oldSlot.save(); }

    booking.slotId = adminParsed.data.slotId as any;
    booking.instructorId = newSlot.instructorId as any;
    newSlot.isBooked = adminParsed.data.status === "approved" || booking.status === "approved";
    await newSlot.save();
  }

  // Update instructor directly
  if (adminParsed.data.instructorId) {
    booking.instructorId = adminParsed.data.instructorId as any;
  }

  // Update meeting link
  if (typeof adminParsed.data.meetingLink === "string") booking.meetingLink = adminParsed.data.meetingLink;

  // Update status
  if (adminParsed.data.status) {
    if (adminParsed.data.status === "approved") {
      // Ensure slot is marked booked and reject other pending bookings
      const slot = await ConsultationSlot.findById(booking.slotId);
      if (slot) {
        slot.isBooked = true; await slot.save();
        await ConsultationBooking.updateMany({ slotId: booking.slotId, _id: { $ne: booking._id }, status: "pending" }, { $set: { status: "rejected" } });
      }
    }
    booking.status = adminParsed.data.status;
  }

  await booking.save();
  // Notify user about admin update
  try { const NotificationModel = (await import("@/models/Notification")).default; await NotificationModel.create({ userId: booking.userId, type: 'booking_update', text: `Your booking was updated by admin`, payload: { bookingId: booking._id } }); } catch(e) { console.error('Failed to create admin booking notification', e); }
  return json(booking);
}
