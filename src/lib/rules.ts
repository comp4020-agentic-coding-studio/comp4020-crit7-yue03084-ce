import { day } from "./format";
import type { Booking, Member } from "./schema";

// Every number the booking rules use, in one place. The page, the rejection
// messages and the tests all read these, so a rule can't say one thing on
// screen and another at the server. Where each comes from is recorded in
// CLAUDE.md ("Published rules" and "Decided").
export const RULES = {
  // anutennis.org/courtbookings/: "up to two consecutive hours of
  // complimentary ANU Tennis Court hire per day, on the same court"
  freeBlockMinutes: 120,
  // ANU Sport's facility price list, TENNIS row, per hour (Celeste confirms
  // the unit): hire beyond the free block, or without a package
  hireCentsPerHour: { student: 1500, general: 2000 },
  // Celeste, as billed: $8 an hour for lights after dark, on top of hire.
  // The club's page reads this $8 as a flat rate instead; CLAUDE.md records
  // the discrepancy.
  lightsCentsPerHour: 800,
  // the portal: "Minimum notice: 30 minutes"
  minNoticeMinutes: 30,
  // the portal: "Maximum notice: 14 days"; the club: "up to two weeks"
  maxAdvanceDays: 14,
  // Celeste: daylight ends at 19:00 in daylight saving, 17:00 outside it
  daylightEndDst: 19 * 60,
  daylightEndStandard: 17 * 60,
  // Celeste: courts open 06:00–22:00, booked in one-hour slots
  openMinute: 6 * 60,
  closeMinute: 22 * 60,
  slotMinutes: 60,
} as const;

// ACT observes the same daylight saving as NSW; this zone name is Canberra.
const TIME_ZONE = "Australia/Canberra";

// "now" as the rules see it: a Canberra calendar date and minutes past its
// midnight, the same shape bookings are stored in.
export interface CanberraNow {
  date: string;
  minute: number;
}

export function canberraNow(at: Date = new Date()): CanberraNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// Whether a Canberra date falls in daylight saving. Asked at 12:00 UTC, which
// is late evening in Canberra, well after the 2–3am changeover, so the answer
// holds for the whole playing day.
export function isDaylightSaving(date: string): boolean {
  const offset = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === "timeZoneName")?.value;
  return offset === "GMT+11";
}

export function daylightEnd(date: string): number {
  return isDaylightSaving(date) ? RULES.daylightEndDst : RULES.daylightEndStandard;
}

// Whole days from one calendar date to another, ignoring time zones: both are
// Canberra dates already.
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// A package that "Expires 1st March" covers bookings on dates before that day.
export function hasPackageOn(member: Member, date: string): boolean {
  return member.packageExpiresOn !== null && date < member.packageExpiresOn;
}

export function isCompleted(booking: Pick<Booking, "date" | "endMinute">, now: CanberraNow): boolean {
  return booking.date < now.date || (booking.date === now.date && booking.endMinute <= now.minute);
}

export function overlaps(a: { startMinute: number; endMinute: number }, b: { startMinute: number; endMinute: number }): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

export interface BookingRequest {
  member: Member;
  date: string;
  startMinute: number;
  endMinute: number;
  // bookings already on this court that day, by anyone
  courtBookings: Pick<Booking, "startMinute" | "endMinute">[];
  // this member's bookings that day, on any court
  memberBookings: Pick<Booking, "freeMinutes">[];
  now: CanberraNow;
}

export type Decision =
  | {
      ok: true;
      freeMinutes: number;
      // the total, lights included
      chargeCents: number;
      lightsCents: number;
      // why no hire is free, when none is
      note: string | null;
    }
  | { ok: false; reason: string };

// Why a member gets no free hire on a date, or null if their free block is
// still there. The page shows this before booking and decide() prices by it,
// so the two can't disagree.
export function freeBlockNote(
  member: Member,
  date: string,
  memberBookings: Pick<Booking, "freeMinutes">[],
): string | null {
  if (!hasPackageOn(member, date)) {
    return member.packageExpiresOn
      ? `Your Booking Package expired on ${day(member.packageExpiresOn)}.`
      : "You don't have a Booking Package.";
  }
  if (memberBookings.some((booking) => booking.freeMinutes > 0)) {
    return "You've already used today's two free hours.";
  }
  return null;
}

// The timetable submits the start of each ticked slot; a booking is one
// unbroken run of them. Returns that run, or null if the slots have a gap or
// none were ticked. Alignment and opening hours are decide()'s to check.
export function spanOf(slotStarts: number[]): { startMinute: number; endMinute: number } | null {
  const starts = [...new Set(slotStarts)].sort((a, b) => a - b);
  if (starts.length === 0 || starts.some((start) => !Number.isInteger(start))) return null;
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] !== starts[i - 1] + RULES.slotMinutes) return null;
  }
  return { startMinute: starts[0], endMinute: starts[starts.length - 1] + RULES.slotMinutes };
}

// The whole rulebook: given what a member asked for and what's already booked,
// either refuse with the rule that stopped it or say how much is free and what
// the rest costs. Pure, so the page and the tests exercise the same code the
// server runs.
export function decide(request: BookingRequest): Decision {
  const { member, date, startMinute, endMinute, now } = request;

  if (
    startMinute % RULES.slotMinutes !== 0 ||
    endMinute % RULES.slotMinutes !== 0 ||
    startMinute < RULES.openMinute ||
    endMinute > RULES.closeMinute ||
    endMinute <= startMinute
  ) {
    return { ok: false, reason: "Pick one or more whole-hour slots between 6am and 10pm." };
  }

  // a malformed date makes daysBetween NaN, which every comparison below
  // would wave through
  const days = daysBetween(now.date, date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(days)) {
    return { ok: false, reason: "Pick a date." };
  }
  if (days < 0 || (days === 0 && startMinute - now.minute < RULES.minNoticeMinutes)) {
    return { ok: false, reason: `Bookings need at least ${RULES.minNoticeMinutes} minutes' notice.` };
  }
  if (days > RULES.maxAdvanceDays) {
    return { ok: false, reason: `You can book at most ${RULES.maxAdvanceDays} days ahead.` };
  }

  if (request.courtBookings.some((booking) => overlaps(booking, request))) {
    return { ok: false, reason: "Someone has already booked this court for part of that time." };
  }

  const minutes = endMinute - startMinute;

  // One free block a day: the first up-to-two hours of the booking, dark or
  // not, and only if no earlier booking that day already had free time.
  const note = freeBlockNote(member, date, request.memberBookings);
  const freeMinutes = note ? 0 : Math.min(RULES.freeBlockMinutes, minutes);

  const hireCents = ((minutes - freeMinutes) * RULES.hireCentsPerHour[member.rate]) / 60;
  const darkMinutes = Math.max(0, endMinute - Math.max(startMinute, daylightEnd(date)));
  const lightsCents = (darkMinutes * RULES.lightsCentsPerHour) / 60;
  return { ok: true, freeMinutes, chargeCents: hireCents + lightsCents, lightsCents, note };
}

export interface Slot {
  startMinute: number;
  endMinute: number;
  taken: boolean;
  // past, or inside the minimum notice
  tooSoon: boolean;
  // beyond the furthest date that can be booked
  tooFar: boolean;
  daylight: boolean;
}

// The day's one-hour slots on one court, for the timetable. Uses the same
// overlap and notice rules as decide(), so a slot the page offers is one the
// server will accept.
export function slotsFor(
  date: string,
  courtBookings: Pick<Booking, "startMinute" | "endMinute">[],
  now: CanberraNow,
): Slot[] {
  const slots: Slot[] = [];
  const days = daysBetween(now.date, date);
  for (let start = RULES.openMinute; start < RULES.closeMinute; start += RULES.slotMinutes) {
    const slot = { startMinute: start, endMinute: start + RULES.slotMinutes };
    slots.push({
      ...slot,
      taken: courtBookings.some((booking) => overlaps(booking, slot)),
      tooSoon: days < 0 || (days === 0 && start - now.minute < RULES.minNoticeMinutes),
      tooFar: days > RULES.maxAdvanceDays,
      daylight: start < daylightEnd(date),
    });
  }
  return slots;
}
