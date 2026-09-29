import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

// The booking flow end to end, against the running app: what a member does in
// a browser, done over HTTP. The server's clock is pinned to 09:00 on
// 30 September 2026 (spec/global-setup.ts), so the dates below stay bookable
// and 3–4 October stays the daylight-saving boundary. The demo members and
// courts are the ones the migrations seed: member 1 is a student with a
// package, member 2 a student with none, member 3 a student whose package
// expired; court 1 is South Oval Court 1.
const baseUrl = inject("baseUrl");
const dbPath = inject("dbPath");

// Astro refuses a form POST without a same-origin Origin header (CSRF); a
// browser sends it, a bare fetch doesn't.
const book = (fields: { member: number; court: number; date: string; slots: number[] }, origin = baseUrl) => {
  const body = new URLSearchParams({ member: String(fields.member), court: String(fields.court), date: fields.date });
  for (const slot of fields.slots) body.append("slot", String(slot));
  return fetch(new URL("/", baseUrl), { method: "POST", headers: { origin }, body, redirect: "manual" });
};

const page = async (path: string) => new JSDOM(await (await fetch(new URL(path, baseUrl))).text()).window.document;

const timetable = (member: number, court: number, date: string) => page(`/?member=${member}&court=${court}&date=${date}`);

const slot = (doc: Document, startMinute: number) => {
  const box = doc.querySelector<HTMLInputElement>(`input[name="slot"][value="${startMinute}"]`);
  if (!box) throw new Error(`no slot at ${startMinute}`);
  return { disabled: box.disabled, tag: box.closest("label")?.querySelector("[data-status]")?.textContent?.trim() };
};

// books, follows the redirect as a browser would, and returns what it says
const bookAndConfirm = async (fields: Parameters<typeof book>[0]) => {
  const res = await book(fields);
  expect(res.status).toBe(303);
  const doc = await page(res.headers.get("location") ?? "");
  return doc.querySelector(".booked")?.textContent?.replace(/\s+/g, " ") ?? "";
};

const h = (hour: number) => hour * 60;

describe("booking flow: a booking persists", () => {
  it("confirms at once, with what is free and what it costs", async () => {
    const confirmed = await bookAndConfirm({ member: 1, court: 1, date: "2026-10-01", slots: [h(10), h(11)] });
    expect(confirmed).toContain("South Oval Court 1, Thu, 1 Oct 2026, 10:00–12:00");
    expect(confirmed).toContain("2 hours free");
    expect(confirmed).toContain("$0 to pay");
  });

  it("is still there on a fresh load, taken for everyone", async () => {
    for (const member of [1, 2]) {
      const doc = await timetable(member, 1, "2026-10-01");
      expect(slot(doc, h(10))).toEqual({ disabled: true, tag: "Booked" });
      expect(slot(doc, h(11))).toEqual({ disabled: true, tag: "Booked" });
      expect(slot(doc, h(12)).disabled).toBe(false);
    }
    const mine = (await timetable(1, 1, "2026-10-01")).querySelector(".history")?.textContent ?? "";
    expect(mine).toContain("Thu, 1 Oct 2026, 10:00–12:00");
  });

  it("tells every open page when a court is booked", async () => {
    const stream = await fetch(new URL("/api/events", baseUrl));
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await book({ member: 2, court: 4, date: "2026-10-02", slots: [h(7)] });

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("event: booking")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain('"date":"2026-10-02"');
  }, 10_000);
});

describe("booking flow: what the server refuses", () => {
  const refusal = async (res: Response) => {
    expect(res.status).toBe(422);
    return new JSDOM(await res.text()).window.document.querySelector('[role="alert"]')?.textContent ?? "";
  };

  it("refuses an hour someone else holds, even if the page offered it", async () => {
    await book({ member: 1, court: 2, date: "2026-10-05", slots: [h(9)] });
    expect(await refusal(await book({ member: 2, court: 2, date: "2026-10-05", slots: [h(8), h(9)] }))).toContain(
      "already booked",
    );
  });

  it("refuses times with a gap, dates too far ahead, and members who don't exist", async () => {
    expect(await refusal(await book({ member: 2, court: 3, date: "2026-10-06", slots: [h(9), h(11)] }))).toContain(
      "next to each other",
    );
    expect(await refusal(await book({ member: 2, court: 3, date: "2026-10-15", slots: [h(9)] }))).toContain("14 days");
    expect(await refusal(await book({ member: 999, court: 3, date: "2026-10-06", slots: [h(9)] }))).toContain(
      "Pick a member",
    );
  });

  it("refuses a booking posted from another site", async () => {
    const res = await book({ member: 2, court: 3, date: "2026-10-06", slots: [h(9)] }, "https://cross-site.example.com");
    expect(res.status).toBe(403);
  });

  it("stores nothing it refused", async () => {
    const doc = await timetable(2, 3, "2026-10-06");
    for (const start of [h(9), h(11)]) expect(slot(doc, start).disabled).toBe(false);
  });
});

describe("booking flow: the daylight-saving boundary", () => {
  it("starts lights at 17:00 on 3 October and 19:00 on 4 October", async () => {
    const before = await timetable(1, 5, "2026-10-03");
    expect(slot(before, h(17)).tag).toBe("Lights $8");
    const after = await timetable(1, 5, "2026-10-04");
    expect(slot(after, h(17)).tag).toBe("");
    expect(slot(after, h(19)).tag).toBe("Lights $8");
  });

  it("charges lights for 18:00 on 3 October and not on 4 October", async () => {
    expect(await bookAndConfirm({ member: 1, court: 5, date: "2026-10-03", slots: [h(18)] })).toContain(
      "lights $8: $8 to pay",
    );
    expect(await bookAndConfirm({ member: 1, court: 5, date: "2026-10-04", slots: [h(18)] })).toContain(
      "lights $0: $0 to pay",
    );
  });
});

describe("booking flow: played bookings are kept", () => {
  it("lists a booking already played as completed, next to upcoming ones", async () => {
    // the page can't book the past, so the played booking goes straight into
    // the throwaway database, as it would sit there after its day
    const client = new Database(dbPath);
    client
      .prepare(
        "INSERT INTO bookings (member_id, court_id, date, start_minute, end_minute, free_minutes, charge_cents, lights_cents) VALUES (3, 6, '2026-09-20', 600, 660, 0, 1500, 0)",
      )
      .run();
    client.close();
    await book({ member: 3, court: 6, date: "2026-10-07", slots: [h(10)] });

    const rows = [...(await timetable(3, 6, "2026-10-07")).querySelectorAll(".history li")].map((li) =>
      li.textContent?.replace(/\s+/g, " "),
    );
    expect(rows.find((row) => row?.includes("Sun, 20 Sept 2026"))).toContain("Completed");
    expect(rows.find((row) => row?.includes("Wed, 7 Oct 2026"))).toContain("Upcoming");
  });
});
