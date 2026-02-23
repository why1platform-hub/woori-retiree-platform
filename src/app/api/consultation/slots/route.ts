import { dbConnect } from "@/lib/db";
import ConsultationSlot from "@/models/ConsultationSlot";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const instructorId = searchParams.get("instructorId");
  const mine = searchParams.get("mine") === "true";
  const available = searchParams.get("available") === "true";

  await dbConnect();

  let filter: any = {};
  if (mine) {
    const auth = await getAuthFromCookies();
    if (!auth) return error("Unauthorized", 401);
    filter.instructorId = auth.sub;
  } else if (instructorId) {
    filter.instructorId = instructorId;
  }

  if (available) {
    filter.isBooked = false;
    filter.startsAt = { $gte: new Date() };
  }

  const items = await ConsultationSlot.find(filter)
    .populate("instructorId", "name email")
    .sort({ startsAt: 1 })
    .limit(100)
    .lean();

  return json({ slots: items });
}

// Get all instructors with their availability
export async function OPTIONS(req: Request) {
  await dbConnect();

  const instructors = await User.find({ role: "instructor" })
    .select("name email")
    .lean();

  const instructorSlots = await Promise.all(
    instructors.map(async (instructor) => {
      const slots = await ConsultationSlot.find({
        instructorId: instructor._id,
        isBooked: false,
        startsAt: { $gte: new Date() },
      })
        .sort({ startsAt: 1 })
        .limit(20)
        .lean();

      return {
        instructor: { _id: instructor._id, name: instructor.name, email: instructor.email },
        availableSlots: slots,
      };
    })
  );

  return json({ instructors: instructorSlots });
}

const Body = z.object({
  instructorId: z.string().optional(),
  date: z.string().min(1),
  endDate: z.string().optional(), // Finish date for date range
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  topic: z.string().optional().default("General"),
  days: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 1=Monday, etc.
  weeks: z.number().min(1).max(12).optional().default(1), // How many weeks to generate (1-12)
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor", "superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input: " + parsed.error.message, 400);
  }

  const { date, endDate, startTime, endTime, topic, days, weeks, instructorId } = parsed.data;

  await dbConnect();

  // Determine for whom we're creating slots
  let ownerId = auth!.sub;
  if (instructorId) {
    // Only superadmin can create slots for arbitrary instructors
    if (auth!.role !== "superadmin") return error("Forbidden", 403);
    const inst = await (await import("@/models/User")).default.findById(instructorId);
    if (!inst || inst.role !== "instructor") return error("Instructor not found", 404);
    ownerId = instructorId;
  }

  const createdSlots = [];

  // Parse start and end times
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  // Calculate total minutes and number of 30-min slots
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const slotDuration = 30; // 30 minutes per slot

  if (endMinutes <= startMinutes) {
    return error("End time must be after start time", 400);
  }

  // KST = UTC+9. Input times from Korean users are KST, so offset by -9h when storing as UTC.
  const KST = 9;

  // Helper: build a UTC Date from a UTC-day + local (KST) hours/minutes
  const makeSlotDate = (utcYear: number, utcMonth: number, utcDay: number, localHour: number, localMin: number) =>
    new Date(Date.UTC(utcYear, utcMonth, utcDay, localHour - KST, localMin, 0, 0));

  // "today" in KST: midnight KST = 15:00 UTC previous day
  const nowUTC = new Date();
  const todayKST = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()) - (KST * 3600000));
  todayKST.setUTCHours(-KST, 0, 0, 0); // midnight KST in UTC

  // Use UTC dates for iteration to avoid DST/TZ issues
  const [baseYr, baseMo, baseDa] = date.split('-').map(Number);
  const baseDateUTC = new Date(Date.UTC(baseYr, baseMo - 1, baseDa));
  const finishDateUTC = endDate
    ? (() => { const [fy, fm, fd] = endDate.split('-').map(Number); return new Date(Date.UTC(fy, fm - 1, fd)); })()
    : null;

  // If endDate is provided, generate slots for date range
  if (finishDateUTC) {
    const currentDate = new Date(baseDateUTC);
    const daysToGenerate = days && days.length > 0 ? days : null;

    while (currentDate <= finishDateUTC) {
      const utcY = currentDate.getUTCFullYear();
      const utcM = currentDate.getUTCMonth();
      const utcD = currentDate.getUTCDate();
      const dayOfWeek = currentDate.getUTCDay();

      if (daysToGenerate === null || daysToGenerate.includes(dayOfWeek)) {
        const dayMidnightKST = new Date(Date.UTC(utcY, utcM, utcD, -KST, 0, 0, 0));
        if (dayMidnightKST >= todayKST) {
          for (let mins = startMinutes; mins + slotDuration <= endMinutes; mins += slotDuration) {
            const slotStart = makeSlotDate(utcY, utcM, utcD, Math.floor(mins / 60), mins % 60);
            const slotEnd = makeSlotDate(utcY, utcM, utcD, Math.floor((mins + slotDuration) / 60), (mins + slotDuration) % 60);

            const existing = await ConsultationSlot.findOne({ instructorId: ownerId, startsAt: slotStart });
            if (!existing) {
              const created = await ConsultationSlot.create({ instructorId: ownerId, startsAt: slotStart, endsAt: slotEnd, topic, isBooked: false });
              createdSlots.push(created);
            }
          }
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  } else {
    // Original logic: use weeks parameter
    const daysToGenerate = days && days.length > 0 ? days : [baseDateUTC.getUTCDay()];
    const weeksToGenerate = weeks || 1;

    for (let week = 0; week < weeksToGenerate; week++) {
      for (const dayOfWeek of daysToGenerate) {
        const slotDateUTC = new Date(baseDateUTC);
        const currentDay = slotDateUTC.getUTCDay();
        let daysToAdd = dayOfWeek - currentDay + (week * 7);
        if (daysToAdd < 0 && week === 0) daysToAdd += 7;
        slotDateUTC.setUTCDate(slotDateUTC.getUTCDate() + daysToAdd);

        const utcY = slotDateUTC.getUTCFullYear();
        const utcM = slotDateUTC.getUTCMonth();
        const utcD = slotDateUTC.getUTCDate();
        const dayMidnightKST = new Date(Date.UTC(utcY, utcM, utcD, -KST, 0, 0, 0));
        if (dayMidnightKST < todayKST) continue;

        for (let mins = startMinutes; mins + slotDuration <= endMinutes; mins += slotDuration) {
          const slotStart = makeSlotDate(utcY, utcM, utcD, Math.floor(mins / 60), mins % 60);
          const slotEnd = makeSlotDate(utcY, utcM, utcD, Math.floor((mins + slotDuration) / 60), (mins + slotDuration) % 60);

          const existing = await ConsultationSlot.findOne({ instructorId: ownerId, startsAt: slotStart });
          if (!existing) {
            const created = await ConsultationSlot.create({ instructorId: ownerId, startsAt: slotStart, endsAt: slotEnd, topic, isBooked: false });
            createdSlots.push(created);
          }
        }
      }
    }
  }

  return json({ slots: createdSlots, count: createdSlots.length }, { status: 201 });
}

// Slot update (PUT)
const UpdateBody = z.object({
  id: z.string().min(1),
  instructorId: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  topic: z.string().optional(),
  isBooked: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor", "superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const body = await req.json().catch(() => null);
  const parsed = UpdateBody.safeParse(body);
  if (!parsed.success) return error("Invalid input: " + parsed.error.message, 400);

  await dbConnect();
  const slot = await ConsultationSlot.findById(parsed.data.id);
  if (!slot) return error("Slot not found", 404);

  // Only owner instructor or superadmin can update
  if (auth!.role === "instructor" && String(slot.instructorId) !== auth!.sub) {
    return error("Forbidden", 403);
  }

  if (parsed.data.instructorId) {
    if (auth!.role !== "superadmin") return error("Forbidden: cannot reassign instructor", 403);
    const UserModel = (await import("@/models/User")).default;
    const inst = await UserModel.findById(parsed.data.instructorId);
    if (!inst || inst.role !== "instructor") return error("Instructor not found", 404);
    slot.instructorId = parsed.data.instructorId as any;

    // If slot was booked, update related bookings' instructorId
    if (slot.isBooked) {
      const BookingModel = (await import("@/models/ConsultationBooking")).default;
      await BookingModel.updateMany({ slotId: slot._id }, { $set: { instructorId: parsed.data.instructorId } });
    }
  }

  if (parsed.data.startsAt) slot.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt) slot.endsAt = new Date(parsed.data.endsAt);
  if (parsed.data.topic) slot.topic = parsed.data.topic;
  if (typeof parsed.data.isBooked === "boolean") slot.isBooked = parsed.data.isBooked;

  await slot.save();
  return json({ slot });
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor", "superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing id", 400);

  await dbConnect();
  const slot = await ConsultationSlot.findById(id);
  if (!slot) return error("Not found", 404);

  if (auth!.role === "instructor" && String(slot.instructorId) !== auth!.sub) {
    return error("Forbidden", 403);
  }

  if (slot.isBooked) {
    return error("Cannot delete a booked slot", 400);
  }

  await ConsultationSlot.findByIdAndDelete(id);
  return json({ ok: true });
}
