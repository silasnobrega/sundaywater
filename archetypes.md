# Sunday Water — customer archetypes

Source of truth for the water check (`start.html`). The quiz sorts every visitor into one of
these six identities after two questions, then asks that identity's own follow-ups in its own
voice, and writes the result for it. `quiz_map.json` carries the copy; `quiz.js` runs it.

**The rule:** an archetype is not a problem label. It is a flattering identity the visitor
recognizes as themselves, written so the next step (test, then a system) is simply what that
kind of person does. Hims doesn't say "you have hair loss." It says "you take care of yourself."

Each archetype has:
- **id** — used in `quiz_map.json`, the lead payload (`archetype`), and the `book.html` hash.
- **Identity** — two or three sentences they'd nod along to. Flattering, specific, true.
- **The shift** — one line that turns the identity into a buying decision.
- **Voice** — how they talk. Every question on their branch is worded this way.
- **Pain points** — what the branch questions are built from.
- **Lean** — the product the result usually lands on. The answers can still override it.

---

## `scrutinizer` — The Scrutinizer
*"You don't take anyone's word for it."*

**Identity.** You're on a well, and you know what that means: nobody is checking this water but you. You don't take the inspector's word, the neighbor's word, or "it's always been fine." You want to see it.

**The shift.** Scrutinizers don't guess. They test. Then they decide.

**Voice.** Plain, skeptical, a little proud of it. Short sentences. Doesn't like being sold. Responds to "numbers," "see it," "on record," "nobody else is checking."

**Pain points.** Well never tested, or tested once at the inspection years ago. Orange staining, rotten-egg smell, grit. The quiet worry of a tap that looks fine. Arsenic and bacteria in CT wells (about 1 in 25 CT wells is over the arsenic limit).

**Lean.** Free test first → Essential (sediment + carbon) if iron/sediment shows; Soft if hardness; Complete if both plus health.

---

## `protector` — The Protector
*"You check everything that touches your kid."*

**Identity.** Car seat, crib, the paint, the food — you've checked it all. Water is the one thing in the house you can't see, so it's the one thing you haven't.

**The shift.** Protectors don't hope it's fine. They make sure.

**Voice.** Warm, direct, slightly urgent. Everything is about the kid. Responds to "the bottle," "formula," "the one thing you can't see," "make sure."

**Pain points.** Formula mixed with tap water. PFAS, lead, nitrates. Pitcher filters that don't do what people think. Not knowing if it's city or well. Renting and feeling stuck.

**Lean.** Kitchen tap RO (drinking and formula water) → Complete if the house also has hard water.

---

## `fixer` — The Fixer
*"You don't live with a problem you can solve."*

**Identity.** Spots on the glasses, the shower door, the water heater working too hard. You've scrubbed it, vinegared it, and you're done managing it. You'd rather fix the cause.

**The shift.** Fixers fix the cause, not the symptom.

**Voice.** Practical, impatient, hands-on. Talks about the house like a project list. Responds to "the cause," "done with it," "every faucet," "appliances."

**Pain points.** Scale on fixtures and glass. Dry skin and hair, stiff laundry. Water heater and dishwasher wearing out. A softener that came with the house and isn't keeping up.

**Lean.** Soft (whole-house softener) → Complete if they also want the kitchen tap handled. Renters get the kitchen tap and a line to take to the landlord.

---

## `investigator` — The Investigator
*"You've read the report. You want the numbers."*

**Identity.** You pulled the utility report. You know what TTHM and PFAS are. What you don't have is the number from your own kitchen tap, and you know a plant report isn't that.

**The shift.** Investigators don't settle for the plant's numbers. They get their own.

**Voice.** Precise, data-first, allergic to pitches. Give them figures and sources. Responds to "your own tap," "percent of the limit," "second opinion," "no pitch."

**Pain points.** PFAS and disinfection byproducts in the CCR. Legal limit vs. health guideline gap. Wanting a measurement, not a sales call. Distrust of the "free test" as a sales trick.

**Lean.** Free test first, framed as a measurement → Kitchen tap RO for PFAS/lead → Complete if hardness is also on record.

---

## `freshstart` — The Fresh Start
*"New house. Do it right from day one."*

**Identity.** You just took the keys. You're the kind of person who finds out what you inherited before it becomes a problem: the roof, the furnace, and the water.

**The shift.** Fresh Starts don't inherit someone else's shortcuts. They set their own baseline.

**Voice.** Organized, forward-looking, list-maker. "New house, new rules." Responds to "baseline," "inherited," "day one," "before it's a problem."

**Pain points.** Unknown equipment left behind (a softener, an under-sink filter, a well). First-week surprises: taste, spots, staining. Wanting one clean answer so they can move on to the next item.

**Lean.** Free test first (the baseline) → whatever the water shows. Inherited softener → service check before anything new.

---

## `standard` — The Standard-Setter
*"You read the labels on your food."*

**Identity.** You read labels. You notice when something's off and you don't pretend it isn't. Whether it's the taste or what you can't taste, the tap hasn't met your standard, and buying bottled is a workaround, not a fix. This is also the door for the health-conscious visitor with no single symptom ("I care what goes in my body. I just know it's not good").

**The shift.** Standard-Setters don't work around it. They raise the tap to the standard.

**Voice.** Discerning, a little aesthetic, quality-minded. Talks about taste and coffee and cooking. Responds to "standard," "every glass," "the workaround," "bottled."

**Pain points.** Not trusting what they can't taste (PFAS, lead). Chlorine / pool taste on city water. Metallic or rotten-egg taste on well water. Cases of bottled water every week. A fridge filter that's past its date.

**Lean.** Essential (whole-house carbon) for chlorine taste on every faucet → Kitchen tap RO if it's really about the glass → Complete for both.

---

## How the sort works

Two openers. Each answer carries weights toward one or two archetypes. Highest total wins; a tie goes to the first question's answer.

1. **"What brought you here?"** — seven answers, weight 3: one per archetype, plus a health-conscious door ("I care what goes in my body") that routes to the Standard-Setter.
2. **"When something in the house isn't right, you…"** — five answers about *how they handle things*, weight 2 (plus a 1 toward a related archetype). This is the identity question; it also breaks ties and shades the reveal.

After the sort, the visitor sees the **reveal** (identity + shift), then the town step and town report (shared), then the archetype's branch: three multiple-choice questions and one open question in the archetype's voice, then contact, then the result written for that archetype.

Branch answers carry **tags** (`hard`, `health`, `taste`, `sed`, `well`, `city`, `rent`, `own`, `baby`, `kids`, `softener`, `pitcher`, `untested`, `research`, `now`, …). The recommendation reads the tags plus the archetype's lean. Edit copy freely in `quiz_map.json`; keep the tags.
