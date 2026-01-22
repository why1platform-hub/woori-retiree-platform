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
  const baseDate = new Date(date);
  const finishDate = endDate ? new Date(endDate) : null;

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

  const today = new Date(new Date().setHours(0, 0, 0, 0));

  // If endDate is provided, generate slots for date range
  if (finishDate) {
    // Generate slots for each day in the date range
    const currentDate = new Date(baseDate);
    const daysToGenerate = days && days.length > 0 ? days : null;

    while (currentDate <= finishDate) {
      // If specific days are selected, only generate for those days
      if (daysToGenerate === null || daysToGenerate.includes(currentDate.getDay())) {
        // Skip if date is in the past
        if (currentDate >= today) {
          // Generate 30-minute slots for this day
          for (let mins = startMinutes; mins + slotDuration <= endMinutes; mins += slotDuration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(Math.floor(mins / 60), mins % 60, 0, 0);

            const slotEnd = new Date(currentDate);
            slotEnd.setHours(Math.floor((mins + slotDuration) / 60), (mins + slotDuration) % 60, 0, 0);

            // Check if slot already exists
            const existing = await ConsultationSlot.findOne({
              instructorId: ownerId,
              startsAt: slotStart,
            });

            if (!existing) {
              const created = await ConsultationSlot.create({
                instructorId: ownerId,
                startsAt: slotStart,
                endsAt: slotEnd,
                topic,
                isBooked: false,
              });
              createdSlots.push(created);
            }
          }
        }
      }
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    // Original logic: use weeks parameter
    const daysToGenerate = days && days.length > 0 ? days : [baseDate.getDay()];
    const weeksToGenerate = weeks || 1;

    for (let week = 0; week < weeksToGenerate; week++) {
      for (const dayOfWeek of daysToGenerate) {
        // Calculate the date for this day
        const slotDate = new Date(baseDate);
        const currentDay = slotDate.getDay();
        let daysToAdd = dayOfWeek - currentDay + (week * 7);
        if (daysToAdd < 0 && week === 0) daysToAdd += 7;
        slotDate.setDate(slotDate.getDate() + daysToAdd);

        // Skip if date is in the past
        if (slotDate < today) continue;

        // Generate 30-minute slots
        for (let mins = startMinutes; mins + slotDuration <= endMinutes; mins += slotDuration) {
          const slotStart = new Date(slotDate);
          slotStart.setHours(Math.floor(mins / 60), mins % 60, 0, 0);

          const slotEnd = new Date(slotDate);
          slotEnd.setHours(Math.floor((mins + slotDuration) / 60), (mins + slotDuration) % 60, 0, 0);

          // Check if slot already exists
          const existing = await ConsultationSlot.findOne({
            instructorId: ownerId,
            startsAt: slotStart,
          });

          if (!existing) {
            const created = await ConsultationSlot.create({
              instructorId: ownerId,
              startsAt: slotStart,
              endsAt: slotEnd,
              topic,
              isBooked: false,
            });
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
