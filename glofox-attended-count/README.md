# Glofox → GHL Total Classes Attended

When a member is marked **attended** for a class in Glofox, this automation updates their **"Total Classes Attended"** number on their Go High Level (GHL) contact. That lets GHL automations fire on attendance milestones — e.g. a reward or status upgrade at 5 / 10 / 25 classes.

It is a small, **standalone** workflow — deliberately kept separate from the [First Class automation](../glofox-first-class/) so it stays easy to read and troubleshoot.

## How it works (plain English)

1. Glofox tells us "member X just attended a class" (a webhook).
2. We look up that member's email in Glofox.
3. We ask Glofox how many classes that member has attended **in total**.
4. We save that number onto their GHL contact.

The webhook only tells us *who* attended — it never includes the running total, so step 3 (asking Glofox for the count) is the important bit.

## Status

🚧 **Draft — not live yet.** Built and tested end-to-end except the final GHL write, which still uses placeholder GHL IDs.

## More

- Full detail, design decisions, and findings: [OVERVIEW.md](./OVERVIEW.md)
- What's left to do: [`glofox-attended-count` issues](https://github.com/SocialFitnessManchester/n8n-automations/labels/glofox-attended-count)
