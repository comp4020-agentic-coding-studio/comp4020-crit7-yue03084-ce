import { describe, expect, it } from "vitest";
import {
  type BookingRequest,
  canberraNow,
  decide,
  isCompleted,
  slotsFor,
  spanOf,
} from "../src/lib/rules";
import type { Member } from "../src/lib/schema";

// The rules the club and the portal publish, and the ones Celeste settled
// (CLAUDE.md), held as a contract on the one function the server runs. Each
// case is a promise the app makes to a member before they turn up to play.
const withPackage: Member = { id: 1, name: "package", packageExpiresOn: "2027-03-01", membershipValidUntil: "2027-02-28", rate: "student" };
const noPackage: Member = { id: 2, name: "none", packageExpiresOn: null, membershipValidUntil: "2027-02-28", rate: "general" };
const expired: Member = { id: 3, name: "expired", packageExpiresOn: "2026-03-01", membershipValidUntil: "2027-02-28", rate: "student" };

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

const priced = (freeMinutes: number, chargeCents: number, lightsCents = 0) => ({
  ok: true,
  freeMinutes,
  chargeCents,
  lightsCents,
});

describe("booking rules: what a package makes free", () => {
  it("gives the first two hours of hire free", () => {
    expect(ask({})).toMatchObject(priced(120, 0));
  });

  it("charges hire beyond two hours at the member's price-list rate", () => {
    expect(ask({ endMinute: h(13) })).toMatchObject(priced(120, 1500));
    expect(ask({ endMinute: h(13), member: { ...withPackage, rate: "general" } })).toMatchObject(priced(120, 2000));
  });

  it("adds $8 lights after 17:00 outside daylight saving (3 October)", () => {
    expect(ask({ date: "2026-10-03", startMinute: h(16), endMinute: h(18) })).toMatchObject(priced(120, 800, 800));
  });

  it("adds no lights before 19:00 once daylight saving starts (4 October)", () => {
    expect(ask({ date: "2026-10-04", startMinute: h(16), endMinute: h(18) })).toMatchObject(priced(120, 0, 0));
  });

  it("keeps hire free after dark and charges only the lights", () => {
    expect(ask({ startMinute: h(20), endMinute: h(21) })).toMatchObject(priced(60, 800, 800));
  });

  it("charges hire and lights together past two hours after dark", () => {
    // 3 hours after 17:00: two free, one at $15, and $8 lights on all three
    expect(ask({ date: "2026-10-03", startMinute: h(18), endMinute: h(21) })).toMatchObject(priced(120, 3900, 2400));
  });

  it("gives one free block a day: a second booking pays hire in full", () => {
    const decision = ask({ startMinute: h(14), endMinute: h(15), memberBookings: [{ freeMinutes: 60 }] });
    expect(decision).toMatchObject(priced(0, 1500));
    if (decision.ok) expect(decision.note).toContain("already used");
  });

  it("counts the package valid until the day before 1 March", () => {
    const later = { date: "2027-02-20", minute: h(9) };
    expect(ask({ date: "2027-02-28", now: later })).toMatchObject(priced(120, 0));
    expect(ask({ date: "2027-03-01", now: later })).toMatchObject(priced(0, 3000));
  });
});

describe("booking rules: without a current package", () => {
  it("charges all hire at the price-list rate", () => {
    expect(ask({ member: noPackage, endMinute: h(11) })).toMatchObject(priced(0, 2000));
  });

  it("says when the package expired", () => {
    const decision = ask({ member: expired });
    expect(decision).toMatchObject(priced(0, 3000));
    if (decision.ok) expect(decision.note).toContain("1 Mar 2026");
  });

  it("gives a package no free time once membership has lapsed", () => {
    const lapsed = { ...withPackage, membershipValidUntil: "2026-02-28" };
    const decision = ask({ member: lapsed });
    expect(decision).toMatchObject(priced(0, 3000));
    if (decision.ok) expect(decision.note).toContain("membership ended on Sat, 28 Feb 2026");
    expect(ask({ member: { ...withPackage, membershipValidUntil: null } })).toMatchObject(priced(0, 3000));
  });

  it("counts membership valid through the last day of February", () => {
    const later = { date: "2027-02-20", minute: h(9) };
    const endsEarly = { ...withPackage, membershipValidUntil: "2027-02-27" };
    expect(ask({ member: endsEarly, date: "2027-02-27", now: later })).toMatchObject(priced(120, 0));
    expect(ask({ member: endsEarly, date: "2027-02-28", now: later })).toMatchObject(priced(0, 3000));
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

  it("refuses a date that isn't one", () => {
    expect(ask({ date: "" })).toMatchObject({ ok: false });
    expect(ask({ date: "2026-13-45" })).toMatchObject({ ok: false });
    expect(ask({ date: "tomorrow" })).toMatchObject({ ok: false });
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
      expect(decision.ok, `slot at ${slot.startMinute / 60}:00`).toBe(!slot.taken && !slot.tooSoon && !slot.tooFar);
    }
  });

  it("marks every slot past the 14-day limit too far", () => {
    expect(slotsFor("2026-10-13", [], now).some((slot) => slot.tooFar)).toBe(false);
    expect(slotsFor("2026-10-14", [], now).every((slot) => slot.tooFar)).toBe(true);
  });

  it("books ticked slots only as one unbroken run", () => {
    expect(spanOf([h(12), h(10), h(11)])).toEqual({ startMinute: h(10), endMinute: h(13) });
    expect(spanOf([h(10), h(12)])).toBeNull();
    expect(spanOf([])).toBeNull();
    expect(spanOf([Number.NaN])).toBeNull();
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
