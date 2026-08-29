# Brief: rethink the interface of MyGym

You are a senior product designer. I want you to rethink the interface and UX of a personal
training app called **MyGym**. It works, it is deployed, it is used daily — but it has grown
feature by feature and the design has never been thought about as a whole. I want a redesign
that is opinionated, specific and buildable, not a list of best practices.

Read everything below before proposing anything. At the end there is a list of what I want
back and what I do not want.

---

## 1. Who it is for

One person. Me. There are no other users, no onboarding, no accounts, no sharing, no social
features, and there never will be. Nothing needs to scale, be discoverable by strangers, or
be explained to a newcomer. Design for one expert user who opens this app several times a
week and knows exactly what everything means.

I am a recreational athlete: I lift in a gym and I play football. I am in my thirties, I
train around 3–4 times a week, and I care about not getting injured and about slowly getting
fitter.

## 2. What the app is for

It is a **coach plus a logbook plus a progress report**.

- **Coach.** It tells me which gym session to do next, derived from a training cycle and
  from what I have actually logged. I do not choose; it recommends and I follow.
- **Logbook.** I record every gym session and every football activity.
- **Progress report.** It shows how my training load and fitness are trending, using real
  heart-rate data pulled from my Garmin watch.

## 3. The three moments of use — this matters more than anything else

**A. Before/during a gym session. Phone in hand, standing in a gym.**
The most frequent and most important moment. I open the app, see which session is up, tap
start, and then work through a list of exercises for 45–60 minutes — glancing at the phone
between sets with sweaty hands, often one-handed, sometimes with the phone propped on a
bench. I need to know what the next exercise is, how many reps, and how long to rest. Today
this screen has had the *least* design attention despite being where I spend the most time.

**B. Right after playing football. Phone, ~30 seconds.**
I log what I played (football, training, or futsal), how many goals, how it felt, and paste
a link to the Garmin activity. Then I forget about it.

**C. Reviewing, occasionally. Usually a laptop, sometimes the phone on the sofa.**
"Am I actually getting fitter? Am I training too much? Am I scoring more?" This is a
leisurely, curious mode, not an operational one. It happens maybe weekly.

These three modes are very different and the current design does not really acknowledge
that. Take a position on whether they should be three destinations, or something else
entirely.

## 4. What exists today

Single page app, no router, three tab-bar destinations plus a full-screen workout mode.

**Today** — the coach.
- A large card: next session letter (A/B/C), its name, a one-line reason ("No futsal this
  week — load the legs with Session B"), any warnings ("Avoided Session B within 48h of
  football"), a big Start button, the rotating core-finisher exercise for that session, and
  a row of three buttons to override the recommendation manually.
- A button: "⚽ I played — log it".
- Two small tiles: last gym session, last football activity, with how long ago.
- Three small tiles: activities this week, week streak, average per week.

**Log** — the history.
- A 12-week heatmap (7 rows = weekdays, one column per week), colour-coded gym vs match,
  brightness by rating, with 12 weeks / 6 months / 12 months toggles.
- Below it, every entry ever, grouped by month, newest first. Each row: an icon, a title
  ("Session A · Complete", "Football · 2 goals · 1h 20m"), the date, a star rating, and edit
  and delete buttons. Tapping a row opens a detail sheet.
- The heatmap and the list do not interact at all. You cannot tap a day.

**Progress** — the dashboard. Currently seven stacked panels, in this order:
- Weekly training load: 12 stacked bars, gym vs football, plus "+38% vs the week before".
- Goals per match: a line with a rolling average over it.
- Fitness: average heart rate per match over time (falling = fitter).
- Intensity: share of each match spent in heart-rate zones 4–5.
- Sessions by type: counts of A / B / C with a proportion bar.
- Highlights: six small tiles (longest streak, best match goals, busiest week, total
  sessions, matches + training, total goals).
- Two stat tiles: gym totals, football totals.

**Workout mode** — full screen, entered from Today, hides the nav.
- Sections: athletic prep, the main strength or conditioning work, a core finisher.
- Each exercise: name, reps, rest, an optional note, a thumbnail, and a play button that
  opens a video in a modal. Some are supersets of two movements. Exercises are tiered T1
  (never skip) and T2 (drop if short on time).
- A finish button at the bottom opens a sheet: date, completion (complete / T1 only), a
  1–3 star rating, and an optional Garmin link.

**Entry detail sheet** — opened from the Log list.
- The basics, plus, if the activity was recorded on the watch, a full Garmin readout:
  stat tiles, a heart-rate curve, time in each of five HR zones, and training-effect bars.

## 5. The data that exists

Everything below is already captured and available to display. You are not limited to what
is currently shown — if something is under-used, say so.

**Every gym session:** which session (A/B/C), completed fully or only the essential tier, a
1–3 rating, which conditioning variant, which rotating core exercise, whether extra leg work
was added.

**Every football activity:** football, training, or futsal; goals scored; a 1–3 rating.

**Optionally on either, pulled from Garmin:** duration, distance, steps, calories, average /
max / min heart rate, aerobic and anaerobic training effect (0–5 with a label like "Lactate
threshold"), exercise load, moderate and vigorous intensity minutes, body-battery change,
estimated sweat loss, seconds spent in each of five heart-rate zones, and a heart-rate +
body-battery curve sampled about every 30 seconds.

**Derived by the app:** the next recommended session and why, coaching warnings, weekly
training load split by gym vs football, week-on-week load change, consistency streaks.

## 6. Constraints — proposals that ignore these are useless to me

- **iPhone Safari first.** Installed as a PWA, standalone, portrait. Desktop is secondary
  and only used for mode C. Design phone-first and say what changes on a wide screen.
- **Dark theme.** Near-black background, one green accent. You may propose changing the
  palette but justify it.
- **React + TypeScript + Tailwind CSS.** No component library, no charting library — every
  chart is hand-rolled SVG or CSS. Proposals needing heavy new dependencies are out.
- **Single page, no router.** Views are application state. Deep links do not exist.
- **Works offline.** No network in the gym basement.
- **Do not redesign the coaching logic.** Which session is recommended, and why, is settled
  and correct. You are designing how it is *presented*, not what it decides.
- **No native capabilities.** No push notifications, no HealthKit, no background sync, no
  widgets. Browser only.
- **One person, no growth.** Do not propose anything justified by onboarding, retention,
  engagement, virality, or gamification-for-motivation. If you propose a streak or a badge,
  argue for it as something *I* would find genuinely useful, not as a retention mechanic.

## 7. What I think is wrong — challenge this, do not just agree

These are my hypotheses, not findings. Push back where you disagree.

- The app grew feature by feature and the structure was retrofitted late. It may still be
  organised around what the data *is* rather than what I am *doing*.
- **Progress is a wall.** Seven panels of roughly equal visual weight, no hierarchy, no
  narrative. It does not answer "am I doing well?" — it makes me do the interpreting.
- **Today is functional but flat.** A big card and some buttons. It tells me what to do but
  has no sense of occasion or momentum.
- **Workout mode gets the least attention and the most use.** It is a scrolling list of
  exercises. There is no rest timer, no sense of progress through the session, no way to
  tick things off.
- **The Log is inert.** A heatmap that cannot be tapped and a list you scroll. It is storage,
  not insight.
- Data density is low. Lots of uppercase labels and generous padding, so little fits on a
  phone screen and everything needs scrolling.
- It looks like a generic dark dashboard template. It has no character.

<!-- ============================================================
     FILL THIS IN — what actually annoys you, in your own words.
     Be specific and petty. "The start button is too far down",
     "I never look at the heatmap", "I hate the star ratings",
     "logging a match takes too many taps". Concrete irritations
     produce far better design work than an abstract brief.
     ============================================================ -->

**My specific complaints:**

-
-
-

## 8. What I want back

Work in this order and show your reasoning.

1. **Diagnosis.** What is this app actually for, and where does the current design fight
   that? Be concrete and reference specific screens. Tell me which of my hypotheses in §7
   are wrong.
2. **A point of view.** One paragraph: what should this app feel like to use? Commit to
   something. "Calm and glanceable" and "dense and instrument-like" are both defensible —
   pick one and hold it consistently through everything that follows.
3. **Information architecture.** What are the destinations, what lives where, and why. If
   you keep three tabs, justify it; if you would collapse or split them, show that.
4. **Screen by screen.** For each screen: its single job, what is on it in priority order,
   what the hierarchy is, and **what you removed**. I want things cut — the app has
   accumulated more than it needs. Name what goes.
5. **The gym session screen in detail.** This is the one that matters most and has been
   designed the least. Consider: glanceability at arm's length, one-handed use, sweaty
   hands, knowing where you are in the session, rest timing, and what happens if I skip
   something.
6. **The progress story.** If I open the review page once a week, what single thing should
   it tell me before I read anything else? Design the answer to "am I doing well?" rather
   than a set of charts I have to interpret myself.
7. **Wireframes.** Low fidelity, as monospace/ASCII sketches inline in your answer, phone
   width. I need to see the layout, not admire a rendering.
8. **Trade-offs.** What does your design lose? What would you be unsure about until it was
   used for two weeks?

## 9. What I do not want

- Generic advice that could apply to any app. If a sentence would survive being pasted into
  a brief for a banking app, cut it.
- A design system, a component inventory, a colour-token table, or accessibility
  boilerplate. Assume competence on the fundamentals.
- Proposals that require capabilities the constraints rule out.
- Hedging. If you think a feature should be deleted, say so plainly.
- Enthusiasm about how great the redesign will be. Just do the work.

## 10. Before you start

Ask me up to five questions whose answers would genuinely change your design. Then wait for
my answers before producing the full proposal. If you have no real questions, say so and
begin.
