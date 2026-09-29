import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type CanberraNow, decide } from "./rules";
import {
  type Booking,
  bookings,
  type Court,
  courts,
  type Member,
  type Message,
  members,
  messages,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Booking, Court, Member, Message };

export function listMessages(): Message[] {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(50).all();
}

export function addMessage(body: string): Message {
  return db.insert(messages).values({ body }).returning().get();
}

export function listMembers(): Member[] {
  return db.select().from(members).orderBy(asc(members.id)).all();
}

export function listCourts(): Court[] {
  return db.select().from(courts).orderBy(asc(courts.id)).all();
}

// Bookings on one court on one date, by anyone: what the timetable greys out.
export function bookingsOnCourt(courtId: number, date: string): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.courtId, courtId), eq(bookings.date, date)))
    .all();
}

// One member's bookings on one date, on any court: whether today's free block
// is spent.
export function memberBookingsOn(memberId: number, date: string): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.memberId, memberId), eq(bookings.date, date)))
    .all();
}

// Every booking a member has made, played ones included, latest first.
export function memberHistory(memberId: number): (Booking & { court: Court })[] {
  return db
    .select()
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .where(eq(bookings.memberId, memberId))
    .orderBy(desc(bookings.date), desc(bookings.startMinute))
    .all()
    .map((row) => ({ ...row.bookings, court: row.courts }));
}

export function getBooking(id: number): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.id, id)).get();
}

export interface BookingInput {
  memberId: number;
  courtId: number;
  date: string;
  startMinute: number;
  endMinute: number;
}

export type BookingOutcome = { ok: true; booking: Booking } | { ok: false; reason: string };

// The server's re-check: whatever the timetable showed, the rules run again
// here against what the database holds now, and the read and the write share
// one transaction so two members can't both take the same hour.
export function placeBooking(input: BookingInput, now: CanberraNow): BookingOutcome {
  return db.transaction((tx) => {
    const member = tx.select().from(members).where(eq(members.id, input.memberId)).get();
    const court = tx.select().from(courts).where(eq(courts.id, input.courtId)).get();
    if (!member || !court) return { ok: false, reason: "Pick a member and a court." };

    const decision = decide({
      member,
      date: input.date,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      courtBookings: tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.courtId, court.id), eq(bookings.date, input.date)))
        .all(),
      memberBookings: tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.memberId, member.id), eq(bookings.date, input.date)))
        .all(),
      now,
    });
    if (!decision.ok) return decision;

    const booking = tx
      .insert(bookings)
      .values({
        ...input,
        freeMinutes: decision.freeMinutes,
        chargeCents: decision.chargeCents,
        lightsCents: decision.lightsCents,
      })
      .returning()
      .get();
    return { ok: true, booking };
  });
}
