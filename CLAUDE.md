# COMP4020 Crit 7 harness

**Cutoff: noon, Wednesday 30 September 2026** (crit that afternoon). The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/07-anu-system/)
publishes the brief and the spec; the brief poses the problem, the spec is the
fixed contract. Read both before you plan or build.

Every rule here carries the failure it came from, so a later reader can tell a
dead rule from a live one. Rules marked *(from A2)* were carried over on
purpose from the assignment 2 harness because they don't depend on that stack;
the ones that did (GitHub Pages, stylelint, Nap Mode, OKLCH) were left behind.
See [Keeping this file honest](#keeping-this-file-honest).

## The spec, verbatim

Quoted, not paraphrased: a requirement restated in the author's own words is no
longer the requirement. *(from A2)*

- "the app loads at its \*.fly.dev URL by the cutoff"
- "it models a slice of a real ANU system you actually deal with, wired end to
  end"
- "the core flow persists across a reload — create something, and it's still
  there"
- "the repo shows the process — commits that grew with the work, a process
  overview in PROCESS.md, and the week's reflection in reflections/crit-7.md"
- "you can account for how you directed, grounded and corrected the work"

The live URL is `https://comp4020-crit7-yue03084-ce.fly.dev/`. The untouched
starter was deployed there on 2026-09-28 and returned 200, so the deploy path
is proven before any work rides on it.

## What this app answers: ANU tennis court booking

Celeste is an ANU Tennis Club (ANUTC) member. The slice is the path from being
a member to booking a court, which today crosses systems that don't know about
each other. What follows is the ground truth for every claim the app, the
README or PROCESS.md makes about ANU's systems.

### Observed (checked on 2026-09-28)

1. **Membership and the Booking Package live in the ANU Sport UniOne account**
   (`anu-sport.com.au/Account/Manage/Memberships`). Its menu (Overview, Club
   Memberships, Event Attendance, Form Responses, Jobs, Manage, Purchase
   History) has no bookings entry. *(Celeste's screenshot.)*
2. **Court booking lives in a separate portal**, `portal.anu-sport.com.au`,
   ANU Sport-branded but footed "Powered by Envibe © 2026 JONAS LEISURE".
   Celeste logs in with the same university account, yet the portal shows no
   membership or package. Its booking form's only rate condition is "Only
   ANU-Students with a current ANU Student ID will be permited to utilize
   facilities at the discounted rate." *(Celeste; form read in a browser.)*
3. **The club's own path has no way into booking.** ANU Sport's `Club-Overview`
   and `Clubs/tennis` pages link to the portal only through the site-wide
   "Facility & Gym Login"; `Clubs/tennis` sells the "2026 ANUTC Booking
   Package" ($50) without saying where to book. The booking links sit on the
   `Facilities` page, which is general hire "for ANYONE". Celeste reaches the
   portal from `anutennis.org/courtbookings/` or by searching. *(Links read in
   a browser; Celeste.)*
4. **The club site holds no personal data.** `anutennis.org` shows neither
   membership status nor bookings. *(Celeste.)*
5. **Bookings vanish, and confirmation is slow.** The portal's My Bookings page
   (`/Booking/List`) says: "Bookings will disappear from this list after they
   have completed." After submitting a booking, Celeste waits about 24 hours
   for a confirmation email. *(Celeste's screenshot; the 24 hours is her
   experience, not a measurement.)*

### Published rules the slice can enforce

Each `anutennis.org` quote below was checked against the page's raw text
(`curl`) on 2026-09-29, and each names the one page it comes from. *(The first draft of this list took them from a fetch tool that
summarises pages. It stitched two pages' sentences into one quote and dropped
the after-dark condition from the $8 rule.)*

- `anutennis.org/courtbookings/`: "Individuals holding an ANUTC Booking Package
  may access up to two consecutive hours of complimentary ANU Tennis Court hire
  per day, on the same court, during daylight hours. Any court usage exceeding
  this two-hour period or occurring outside of daylight hours will be charged
  at the applicable rate of $8.00 per hour."
- Same page: "As of 28 April 2026, ANUTC has been advised that the court
  lights are turning on at 5:00pm." (The nearest thing the club gives to a
  definition of "daylight hours".)
- Same page: the package "is only available to those with a current ANUTC
  Membership".
- Same page: "You may only book up to two weeks in advance and regular bookings
  are not permitted with the ANUTC Booking Package."
- Same page: "Standard booking fees apply for ANUTC members booking the ANU
  Tennis Courts without purchasing the ANUTC Booking Package". The page doesn't
  give the amount.
- Same page: "There are three ANU Tennis Court locations currently available
  for hire: South Oval Tennis Courts, Mills Road Tennis Court (just opposite 80
  Mills Road), Crawford / Old Canberra House Tennis Court". The page doesn't
  say how many courts South Oval has. Celeste says four, so the app has six
  courts.
- `portal.anu-sport.com.au/Booking/Book`, read in a rendered browser: "Minimum
  notice: 30 minutes", "Maximum notice: 14 days".

### Known unknowns: don't state these as fact

- **Why** confirmation takes a day. "Manual review" was an inference, and
  Celeste corrected it: all she knows is that she waited.
- Whether UniOne and the portal share any data behind the scenes. What is
  observed is that the portal *shows* none.
- **Which expiry is right.** The club says membership is "valid until the end
  of February the following year", UniOne shows Est. Expiry 2026-12-31, and
  the package "Expires 1st March the following year". The club says book "at
  least 24 hours in advance"; the portal allows 30 minutes. Pick one on
  purpose and say which.

### Decided (Celeste, 2026-09-29)

The unknowns above that the app needs an answer to, settled on purpose. Each
number lives in one constant (see "One fact, one piece of code").

- **The package expires 1 March the following year**, as the package itself
  states. The club's "end of February" and UniOne's 2026-12-31 aren't used.
- **Minimum notice is 30 minutes**, as the portal enforces. The club's 24 hours
  is "advised", and this app confirms at submission, so nothing in it needs a
  day. Don't explain the club's 24 hours: why it exists is unknown.
- **Daylight ends at 19:00 during daylight saving and 17:00 outside it**, in
  Canberra time. *(Celeste's own knowledge. The club's "5:00pm" notice is
  dated 28 April 2026, which is outside daylight saving, so the two agree.)*
- **A package gives one free block a day**: one consecutive run of at most two
  hours, on one court, in daylight. Everything else that day, including a
  second booking, is $8.00 an hour. This is the literal reading of "two
  consecutive hours ... per day, on the same court", not a total that can be
  split across bookings.
- **Pending: the price for a member with no current package.** Celeste knows
  an official rate and will supply it. Until then, don't invent a number and
  don't reuse $8. $8 is the package's overage rate, not published as the
  general hire price.
- **No login.** A few invented demo members, picked on the page, show having a
  package, having none, and having one that has expired. None of them is
  Celeste or carries her details.

**Rule: any claim about ANU's systems has to come from the list above, a page
quoted verbatim, or Celeste. The agent doesn't infer how they work inside.**
*(This session drew two such inferences, that bookings were manually reviewed
and that the two logins were separate accounts. Both read as findings, and
Celeste corrected both. An inferred claim in the README or at the crit is a
false account of a real system.)*

**A quote goes in quotation marks only after it's been checked against the
page's raw text**, from `curl` or `agent-browser read`, never from a
summarising fetch. *(Celeste asked where the $8 rule came from, and the answer
was a stitched, trimmed paraphrase presented as a quote.)*

**Screenshots carry personal data** (name, email, phone, date of birth,
student and membership IDs). The repo goes public at the cutoff, so a
screenshot is committed only after those are covered with solid fill. Don't
blur: blurred text can sometimes be recovered.

## How to work in here

- **Don't `cd`.** Put the directory in the command instead: `pnpm -C <repo>`,
  `git -C <repo>`, absolute paths. The shell's working directory persists
  between tool calls, and `git` run in a *different* repo fails silently where
  `pnpm` fails loudly. *(from A2)*
- **Before trusting a measurement, know which build and which database it
  read.** There are three of each here: `pnpm dev`, the built server
  (`dist/server/entry.mjs`, which the spec boots with a throwaway database),
  and Fly (database on the `/data` volume). A probe prints what it measured and
  opens a fresh tab per measurement. If it says nothing changed, suspect the
  probe before the code. *(from A2, where a stale `dist/` and a reused CDP tab
  each reported a working fix as broken. A lying instrument is worse than
  none, because it argues for editing correct code.)*
- **Use `agent-browser` to see the page**, not just to check that it built. It
  is installed on this machine (0.38.1, via npm, 2026-09-28). It also reads
  pages that plain fetches can't: ANU Sport's JS-rendered club pages came back
  as an empty shell until it rendered them. *(from A2)*
- **One fact, one piece of code.** A booking rule's number (two free hours,
  $8/hour, 14 days' notice) and a membership's expiry each live in one place,
  in the schema or one constant, and both the page and the rejection message
  read it. Two sources for one fact is a page that will eventually contradict
  itself. The ANU systems above are exactly that failure, at scale. *(from A2,
  where a verdict and the sentence describing it were computed twice. The
  brief names "schemas as ground truth" for this week.)*
- **Default to incremental.** Don't restructure, don't rewrite copy that's
  there, don't break an interaction that works. Before building each feature,
  say two things back: **when it updates** and **what must not change**.
  *(from A2, where that question alone settled a feature's design.)*
- **When a check fails, read its output before changing anything**; the
  message names the file, the line or the contract. A red check is
  authoritative. **Never commit a red state.** *(from A2)*

## Process and integrity

- **Commit as you go.** The commit trail is read, and the spec names
  "commits that grew with the work". A dump the night before is the weakest
  evidence. *(from A2)*
- **Don't draft `PROCESS.md` or `reflections/crit-7.md` for Celeste**, even to
  get a check green. Both are graded as her own account. Ask specific
  questions and drop her words in verbatim, or leave headings for her to fill.
  *(from A2, extended here to the reflection for the same reason. No expiry:
  this is about whose account it is.)*

## The checks (verified against this repo on 2026-09-28)

- `pnpm check` is `pnpm typecheck && pnpm test`, and `test` is
  `astro build && vitest run`. There is **no lint step** here, unlike A2.
  Because of the `&&`, a type error means the build and the spec never ran.
- `vitest` runs `spec/**/*.test.ts` and `scripts/**/*.test.ts` against the
  **built** server on a free port with a throwaway database, not the dev
  server and never local data.
- **The invariants only visit the routes in `spec/routes.ts`** (now `/` and
  `/readme/`). A new page that isn't added there silently goes unchecked,
  a11y floor included. That floor runs axe in jsdom, so contrast and overlap
  aren't checked.
- `spec/guestbook.test.ts` tests the starter's plumbing and "goes when the
  starter does"; `spec/readme.test.ts` requires `/readme/` to serve all of
  `README.md`.
- `pnpm check:evidence` requires `CLAUDE.md`, `reflections/crit-7.md`,
  `PROCESS.md` without its template comment, and that every cited SHA exists.
- CI runs only once the repo is public: check, evidence, two secret scans,
  then a deploy that checks the site returns 200, the SSE stream streams,
  same-origin POSTs aren't 403, cross-site POSTs are, and internal links
  resolve. While the repo is private, local `pnpm check` plus a manual
  `mise exec -- flyctl deploy --remote-only --ha=false -a comp4020-crit7-yue03084-ce`
  is the whole loop.
- `.githooks/pre-commit` refuses a commit if anything staged matches an API
  key's shape. `mise.local.toml` holds this repo's Fly token and is
  gitignored. Each full-stack repo gets its own token: crit 5's authenticates
  but can't see this app.

## Keeping this file honest

When you add a rule, write the failure that caused it and check any claim
about a tool against `package.json`, the workflow or the script. A wrong reason
is worse than none, because it gets believed. When you delete a rule, say what
stopped being true. When something is settled outside this file, leave a
pointer in it: this is the only file every session is guaranteed to read.
*(from A2)*
