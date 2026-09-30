# Process overview

## What I built

A court booking page for the ANU Tennis Club. I book courts often, and the
system I use today felt wrong to me. What the app does, and where its rules
come from, is in `README.md`.

## How I got here

Buying my Booking Package and membership took real effort, because the
information is scattered. Most of it is on the tennis club's website, but the
purchase, my membership status and the booking itself are all on ANU Sport.
When I book, I can't see my membership status or what I'll pay, and there's no
record of anything except the confirmation email and the receipt. Before
building, I looked at each piece myself: my ANU Sport account, the booking
portal, the club website and the price list
([`c999ab2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/c999ab2),
[`3291161`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/3291161)).

The $8 mattered most. It is the lights fee, but the club's page doesn't say so
clearly, so the agent read it as the court fee after dark. I corrected that:
hire and lights are charged separately
([`98540eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/98540eb)).

There is no login. Building one is a lot of work and hard to demo, so the page
lets you pick an invented demo member instead.

Typing in a date was too inconvenient, so I asked for a calendar you can click,
which also shows the day of the week at a glance
([`cd3440a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/cd3440a),
[`17fe048`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/17fe048)).

The rules are convoluted, so the check I trusted most was going through them
myself: I had the agent set out how every price is worked out, and checked each
line. The tests that hold those rules are in
[`5276e59`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/5276e59)
and
[`b97aa95`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yue03084-ce/commit/b97aa95).
