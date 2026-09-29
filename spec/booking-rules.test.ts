import { describe, expect, it } from "vitest";
import {
  type BookingRequest,
  canberraNow,
  decide,
  isCompleted,
  RULES,
  slotsFor,
} from "../src/lib/rules";
import type { Member } from "../src/lib/schema";

// The rules the club and the portal publish, and the ones Celeste settled
// (CLAUDE.md), held as a contract on the one function the server runs. Each
// case is a promise the app makes to a member before they turn up to play.
const withPackage: Member = { id: 1, name: "package", packageExpiresOn: "2027-03-01" };
const noPackage: Member = { id: 2, name: "none", packageExpiresOn: null };
const expired: Member = { id: 3, name: "expired", packageExpiresOn: "2026-03-01" };

const h = (hour: number) => hour * 60;
const now = { date: "2026-09-29", minute: h(9) };

const ask = (overrides: Partial<BookingRequest>): ReturnType<typeof decide> =>
  decide({
    member: withPackage,
    date: "2026-09-30",
    startMinute: h(10),
    endMinute: h(12),
    courtBookings: [],
    memberBookings: [],
    now,
    ...overrides,
  });

describe("booking rules: what a package makes free", () => {
  it("gives two daylight hours free", () => {
    expect(ask({})).toEqual({ ok: true, freeMinutes: 120, chargeCents: 0 });
  });

  it("charges $8 an hour beyond the two free hours", () => {
    expect(ask({ endMinute: h(13) })).toEqual({ ok: true, freeMinutes: 120, chargeCents: 800 });
  });

  it("charges after dark: 17:00 outside daylight saving (3 October)", () => {
    expect(ask({ date: "2026-10-03", startMinute: h(16), endMinute: h(18) })).toEqual({
      ok: true,
      freeMinutes: 60,
      chargeCents: 800,
    });
  });

  it("charges after dark: 19:00 once daylight saving starts (4 October)", () => {
    expect(ask({ date: "2026-10-04", startMinute: h(16), endMinute: h(18) })).toEqual({
      ok: true,
      freeMinutes: 120,
      chargeCents: 0,
    });
  });

  it("gives nothing free for a booking wholly after dark", () => {
    expect(ask({ startMinute: h(20), endMinute: h(21) })).toEqual({ ok: true, freeMinutes: 0, chargeCents: 800 });
  });

  it("gives one free block a day: a second booking pays in full", () => {
    expect(ask({ startMinute: h(14), endMinute: h(15), memberBookings: [{ freeMinutes: 60 }] })).toEqual({
      ok: true,
      freeMinutes: 0,
      chargeCents: 800,
    });
  });

  it("counts the package valid until the day before 1 March", () => {
    expect(ask({ date: "2027-02-28", now: { date: "2027-02-20", minute: h(9) } })).toMatchObject({ freeMinutes: 120 });
    expect(ask({ date: "2027-03-01", now: { date: "2027-02-20", minute: h(9) } })).toMatchObject({ ok: false });
  });
});

describe("booking rules: what gets refused", () => {
  it("refuses less than 30 minutes' notice, accepts exactly 30", () => {
    const tooSoon = ask({ date: now.date, startMinute: h(10), now: { ...now, minute: h(9) + 31 } });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.reason).toContain("notice");
    expect(ask({ date: now.date, startMinute: h(10), now: { ...now, minute: h(9) + 30 } })).toMatchObject({ ok: true });
  });

  it("refuses a date in the past", () => {
    expect(ask({ date: "2026-09-28" })).toMatchObject({ ok: false });
  });

  it("refuses more than 14 days ahead, accepts exactly 14", () => {
    expect(ask({ date: "2026-10-13" })).toMatchObject({ ok: true });
    expect(ask({ date: "2026-10-14" })).toMatchObject({ ok: false });
  });

  it("refuses a court someone else holds for any part of the time", () => {
    const decision = ask({ courtBookings: [{ startMinute: h(11), endMinute: h(12) }] });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toContain("already booked");
  });

  it("refuses times outside 06:00–22:00 or off the hour", () => {
    expect(ask({ startMinute: h(5), endMinute: h(7) })).toMatchObject({ ok: false });
    expect(ask({ startMinute: h(21), endMinute: h(23) })).toMatchObject({ ok: false });
    expect(ask({ startMinute: h(10) + 30, endMinute: h(12) })).toMatchObject({ ok: false });
  });

  it("refuses a member without a current package while the standard fee is pending", () => {
    expect(RULES.standardCentsPerHour).toBeNull();
    expect(ask({ member: noPackage })).toMatchObject({ ok: false });
    const decision = ask({ member: expired });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toContain("2026-03-01");
  });
});

describe("booking rules: the timetable offers only what the server accepts", () => {
  it("marks held slots taken and the rest free", () => {
    const slots = slotsFor("2026-09-30", [{ startMinute: h(10), endMinute: h(12) }], now);
    expect(slots).toHaveLength(16);
    expect(slots.filter((slot) => slot.taken).map((slot) => slot.startMinute)).toEqual([h(10), h(11)]);
  });

  it("marks slots inside the notice period too soon", () => {
    const slots = slotsFor(now.date, [], { ...now, minute: h(9) + 45 });
    expect(slots.filter((slot) => slot.tooSoon).map((slot) => slot.startMinute)).toEqual([
      h(6),
      h(7),
      h(8),
      h(9),
      h(10),
    ]);
  });

  it("agrees with decide() on every free slot", () => {
    for (const slot of slotsFor(now.date, [{ startMinute: h(14), endMinute: h(15) }], now)) {
      const decision = ask({ date: now.date, startMinute: slot.startMinute, endMinute: slot.endMinute, courtBookings: [{ startMinute: h(14), endMinute: h(15) }] });
      expect(decision.ok, `slot at ${slot.startMinute / 60}:00`).toBe(!slot.taken && !slot.tooSoon);
    }
  });
});

describe("booking rules: time", () => {
  it("reads now in Canberra time, including daylight saving", () => {
    expect(canberraNow(new Date("2026-09-29T00:30:00Z"))).toEqual({ date: "2026-09-29", minute: h(10) + 30 });
    expect(canberraNow(new Date("2026-10-05T00:30:00Z"))).toEqual({ date: "2026-10-05", minute: h(11) + 30 });
  });

  it("keeps a played booking as completed rather than dropping it", () => {
    expect(isCompleted({ date: "2026-09-28", endMinute: h(12) }, now)).toBe(true);
    expect(isCompleted({ date: now.date, endMinute: h(9) }, now)).toBe(true);
    expect(isCompleted({ date: now.date, endMinute: h(10) }, now)).toBe(false);
  });
});
