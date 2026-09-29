// How the page writes the rules' numbers. Formatting only: every amount and
// time comes from rules.ts or a stored booking, never from here.

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function clock(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function hours(minutes: number): string {
  const count = minutes / 60;
  return `${count} ${count === 1 ? "hour" : "hours"}`;
}

// A Canberra calendar date's month, short ("Oct"), for the date picker.
export function month(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", month: "short" });
}

// A Canberra calendar date as a reader says it ("Wed 30 Sep 2026"). Formatted
// in UTC because the string already is the Canberra date; converting it again
// would shift it a day.
export function day(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
