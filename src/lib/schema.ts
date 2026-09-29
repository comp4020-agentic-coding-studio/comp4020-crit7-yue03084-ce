import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const messages = sqliteTable("messages", {
  id: int().primaryKey({ autoIncrement: true }),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;

// A club member. Membership and the Booking Package live together here, where
// ANU Sport keeps them in UniOne and the booking portal can't see either.
// packageExpiresOn is a Canberra calendar date (YYYY-MM-DD); null means no
// package was ever bought. Demo members are seeded by a migration, not typed
// in by hand.
export const members = sqliteTable("members", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  packageExpiresOn: text("package_expires_on"),
});

// The six courts the club lists for hire, seeded by a migration.
export const courts = sqliteTable("courts", {
  id: int().primaryKey({ autoIncrement: true }),
  location: text().notNull(),
  name: text().notNull(),
});

// One booking, kept after it's played: nothing ever deletes a row, and
// "completed" is worked out from the date and time, not stored. Times are
// minutes after midnight on `date`, Canberra time, which keeps the daylight
// rule a comparison rather than timezone arithmetic. freeMinutes and
// chargeCents are what the rules decided at booking time, stored so a later
// rule change can't rewrite what a member was told.
export const bookings = sqliteTable("bookings", {
  id: int().primaryKey({ autoIncrement: true }),
  memberId: int("member_id")
    .notNull()
    .references(() => members.id),
  courtId: int("court_id")
    .notNull()
    .references(() => courts.id),
  date: text().notNull(),
  startMinute: int("start_minute").notNull(),
  endMinute: int("end_minute").notNull(),
  freeMinutes: int("free_minutes").notNull(),
  chargeCents: int("charge_cents").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Member = typeof members.$inferSelect;
export type Court = typeof courts.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
