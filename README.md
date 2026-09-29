# ANU Tennis Club court booking

One page where an ANU Tennis Club (ANUTC) member books a court and sees, before
they book, what their membership and Booking Package make free and what the
rest will cost. Today that path crosses systems that don't know about each
other: membership and the package live in the ANU Sport UniOne account, which
has no bookings; court booking lives in a separate portal, which shows no
membership or package; and the club's own site holds neither. This app puts
the member, the rules and the timetable in one place.

It is a model, not a replacement. The members are invented demo people, and
nothing here talks to ANU Sport.

## What it does

- **Pick a member, a court and a day, then tick the hours.** Courts open
  06:00–22:00 in one-hour slots; a booking is one unbroken run of slots on one
  court. Hours someone else holds are greyed out before you pick them, and
  update live on every open page when anyone books.
- **The member's status is on the page:** ANUTC membership, Booking Package,
  whether that day's free hours are still there, and when lights start.
- **Confirmation is immediate**, with the free hours, hire and lights itemised.
  After booking through the portal, the author waited about a day for a
  confirmation email.
- **Played bookings stay listed**, marked completed. The portal's My Bookings
  says "Bookings will disappear from this list after they have completed."
- **The server re-checks every booking** against the database when it's
  submitted, because two people can be looking at the same free hour. A
  refusal says which rule stopped it.

## The rules, and where each comes from

- **Free hours:** a current Booking Package gives the first two hours of one
  booking a day free, dark or not. A second booking that day pays full hire.
  The club's words: "up to two consecutive hours of complimentary ANU Tennis
  Court hire per day, on the same court".
- **Hire:** beyond the free hours, or without a current package, $15 an hour
  for students and $20 for the general public, from ANU Sport's facility price
  list.
- **Lights:** $8 an hour for every hour after dark, on top of hire, whether
  that hour's hire is free or paid. Daylight ends at 17:00, or 19:00 during
  daylight saving (from 4 October 2026).
- **Notice:** at least 30 minutes, and at most 14 days ahead, as the booking
  portal enforces.
- **Package:** expires 1 March the following year, so it covers bookings up to
  28 February. It "is only available to those with a current ANUTC
  Membership", which the club says is valid "until the end of February the
  following year". Without a current membership the package gives no free
  hours, but the court can still be booked at the price-list rate.

## Where this departs from what the club publishes

- **The $8.** The club's page says court use beyond the two free hours "or
  occurring outside of daylight hours will be charged at the applicable rate of
  $8.00 per hour", a single flat rate. This app instead charges hire at the
  price-list rate and adds $8 an hour for lights, because that is how the
  author has actually been billed. The two readings give different totals, and
  the app follows the bill.
- **Which expiry.** UniOne shows membership expiring on 31 December; the club
  says the end of February. The app uses the club's date.
- **Notice.** The club advises booking at least 24 hours ahead; the portal
  allows 30 minutes. The app uses the portal's 30 minutes, since it confirms
  at submission.

## What it doesn't do

- **No login.** You pick a demo member from a list: a student with a package,
  one with none, one whose package expired, two general-public members, and a
  non-member. Anyone can book as any of them.
- **No payment.** It says what is owed; nothing is charged.
- **No cancellations.**

## What's checked

`pnpm check` builds the app and runs `spec/` against the built server:
`booking-rules.test.ts` holds the rules above as a contract on the one function
the server prices with, and `booking-flow.test.ts` drives the running app over
HTTP: a booking survives a reload, refusals store nothing, lights change at
the daylight-saving boundary, and a played booking stays listed as completed.
Whether the page is clear to a member who has never seen it is a judgement no
test makes.
