# CivicVoice: presentation script

For the deck `CivicVoice_Software_Advance_TA.pptx` (15 slides). Target length: about 12 minutes, plus questions.
Spoken lines are plain text. *Italics* are stage directions. **Bold** marks words to stress.

---

## Slide 1 · Title (0:30)

Good morning, everyone. I'm Jatin, MCA, SGT University.

Think about the last time something broke in your area. A pothole. A bus that never comes on time. Where did you complain? Probably a WhatsApp group. And what happened next? **Nothing.**

That's the problem I built this project around. It's called **CivicVoice**: an online petition and community feedback platform. Full stack: React on the front, Node and Express in the middle, MySQL underneath.

---

## Slide 2 · The problem (1:00)

Local issues get raised everywhere, except in a place where they can be **counted, verified and tracked**.

*Point to each card.*

Four things are broken today.

**One: no single channel.** Complaints are spread across chats, posts and paper. Most never reach the right authority.

**Two: no proof of support.** A paper petition can't be verified. One person can sign it ten times.

**Three: no transparency.** You complain, and then you never find out if anyone acted.

**Four: no structured feedback.** The authority gets noise, not numbers.

So the real question is: how do we turn complaints into something an authority **can't ignore**?

---

## Slide 3 · Our solution (0:50)

CivicVoice is one web platform for all of it.

Citizens create petitions, collect **verified** signatures, discuss the issue and track its progress. Admins keep the space clean and fair.

It has five objectives. *Read them quickly, stress number 2.*

The one I care about most is **number two**: exactly one verified signature per user, per petition. Not enforced by a button on the screen. Enforced by the **database itself**. I'll show you how in a minute.

---

## Slide 4 · Key features (0:50)

Here are the eight features.

Create a petition with a problem, a solution, a target and an end date. Sign it, once. Watch live progress. Search and filter. Discuss in the comments. Report bad content. Rate the platform. And dashboards for both users and admins.

The important point: **every feature on this slide is backed by something real in the database**: a table, a view or a stored procedure. Nothing here is just a screen.

---

## Slide 5 · Process model (0:50)

For the process model, I chose **evolutionary prototyping**.

Why? Because this is a community platform. You don't know how people will actually use comments, reports or moderation until you put a working version in front of them.

So I built it in three increments. First the core: users, petitions and signing. Then the community features: comments, reports, feedback. Then admin moderation, dashboards and hardening.

Each increment ended with something I could actually demo, which also lined up with each TA review.

---

## Slide 6 · Functional requirements (0:40)

These are the twelve functional requirements, FR1 to FR12, each one mapped to an actor.

*Don't read the table.*

Guests can browse. Users can create, sign, comment, report and give feedback. Admins moderate and see statistics.

Every one of these twelve maps to an API endpoint later. So nothing on this slide is a wish list. It's all built.

---

## Slide 7 · Cost estimation (0:50)

To estimate cost, I used **Use Case Points**.

Three complex actors gives an actor weight of 9. Ten use cases, five simple and five average, gives 75. So the unadjusted total is 84.

Then we adjust. The technical factor is 0.99, and the environmental factor is 0.89. That gives **74 Use Case Points**.

At Karner's standard of 20 person-hours per point, that's about **1,480 hours of effort**, roughly **₹3.7 lakh** at an assumed ₹250 an hour.

*Pause.*

The rate is an assumption, but the method is standard and every step is on the slide.

---

## Slide 8 · Architecture (0:50)

The system has three tiers.

**On top**, a React single-page app. It holds the login token and talks to the server over HTTPS.

**In the middle**, Node and Express. Every request passes through authentication, input validation, and then a controller.

**At the bottom**, MySQL 8: seven tables, two views and one stored procedure.

One design decision worth mentioning: the API re-checks your account on **every single request**. So if an admin suspends you, it takes effect **immediately**, even if you're already logged in.

---

## Slide 9 · Use case diagram (0:35)

Three actors.

A **guest** can browse and register. A **registered user** inherits everything a guest can do, and adds creating, signing, commenting, reporting and feedback. The **admin** moderates: petition status, comments, reports, feedback, users, statistics.

---

## Slide 10 · Class diagram (0:35)

Seven classes, and they mirror the seven database tables one to one.

User and Petition are the centre. A user creates many petitions. A petition belongs to one category. And **Signature** sits between users and petitions, because one user can sign many petitions, and one petition has many signers.

---

## Slide 11 · Sequence diagram: signing (1:10)

This is the most important slide. Let's follow **one click** on "Sign this petition".

*Trace the arrows with your hand.*

The browser sends a request with the user's token. The middleware verifies the token and loads the user. Then the server makes **one call**: `CALL sp_sign_petition`.

Inside the database, the procedure checks four things, in order. Is the user active? Does the petition exist? Is it open for signing? Has it expired? Only if all four pass does it insert the signature.

And if the same person tries again? The **unique key** on petition and user blocks it. The database itself says no.

Each failure comes back as its own error code, and the server turns it into the right HTTP status: 400, 403, 404 or 409. On success, the counter and the progress bar update instantly, with no page reload.

So duplicate signing is blocked in **three layers**: the button disables itself, the API returns 409, and the database's unique key makes it impossible.

---

## Slide 12 · ER diagram (0:35)

Seven entities. Users and petitions are the hubs.

Two constraints I want to point out. **Signatures** has a composite unique key, which is the one-signature rule. And **content reports** has a CHECK constraint: a report must point at **exactly one** thing, either a petition or a comment, never both and never neither.

---

## Slide 13 · UI screens (0:50)

Here's the interface, with the real sample data.

**Left**, the home page: search, and petition cards with live progress.

**Middle**, the petition page: the problem, the solution, the signature count, the Sign button and the discussion.

**Right**, the admin dashboard: totals at the top, and a list of petitions waiting for a decision, with approve and reject right there.

*If you have the live app open, switch to it now and sign a petition live. It takes 20 seconds and is the strongest moment of the talk.*

---

## Slide 14 · Testing (0:50)

I ran twelve test cases directly against the database on MySQL 8.0.46. **All twelve passed.**

The interesting ones: signing twice fails. Signing a petition under review fails. Signing an expired one fails. A suspended user can't sign. A rating of 6 is rejected. And a report with no target is rejected.

On top of these twelve, the API has **37 automated tests** with Jest and Supertest, and they all pass too.

---

## Slide 15 · Thank you (0:30)

To sum up.

CivicVoice turns scattered complaints into **verified, trackable public demand**.

Seven tables, two views, one stored procedure. Four UML and ER diagrams. Twelve out of twelve database tests passed.

And the core promise, **one person, one signature**, isn't a rule in the UI. It's guaranteed by the database.

Thank you. I'm happy to take questions.

---

## Likely questions, with short answers

**Why MySQL and not MongoDB?**
Signatures need relational guarantees: a unique key, foreign keys, CHECK constraints and a stored procedure that validates atomically. MySQL gives all of that out of the box.

**Can one person make two accounts and sign twice?**
Yes, with a second email. That's the honest limit. The fix is phone OTP verification at sign-up, which is in the future scope.

**Why a stored procedure instead of checking in Node?**
So the rule can't be bypassed. Any client, even a direct database connection, has to go through the same checks.

**What happens if a user is suspended while logged in?**
Their very next request fails with 403, because the server re-reads the account status every time.

**How did you arrive at ₹250 an hour?**
It's an assumed rate for illustration. The effort, 1,480 hours, comes from the standard Karner method.
