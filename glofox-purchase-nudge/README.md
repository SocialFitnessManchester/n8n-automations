# Glofox → GHL: Purchase Nudge Automation

When a member completes a purchase in Glofox (membership purchase event), wait 10 minutes, then check whether they've also booked their first class. If yes, apply the booked tag in GHL as a safety net. If no, apply a nudge tag that triggers a "please book your first class" GHL automation.

For the deep dive on architecture, infrastructure, and design decisions — see [OVERVIEW.md](../glofox-first-class/OVERVIEW.md) in the sibling `glofox-first-class/` project. The two automations share the same upstream pattern (Sheets lookup, Glofox member/bookings calls, GHL upsert) and most of that doc applies here too.

## Flow

1. **Webhook** receives a Glofox event.
2. **Filter — type === `MEMBERSHIP_CREATED`** — gate so the workflow ignores other events that may be sent to the same URL.
3. **Google Sheets lookup** — uses `metadata.location_id` to pull the studio's API Key / API Token from the [studio config sheet](https://docs.google.com/spreadsheets/d/10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA/edit).
4. **Glofox member lookup** — `GET /prod/2.0/members/{user_id}` to get email, first/last name, phone.
5. **Wait 10 minutes** — give the member time to book their first class via the Glofox UI.
6. **Glofox bookings list** — `GET /prod/2.0/bookings?user_id={user_id}` to see what they've booked (if anything) during the wait.
7. **IF — Has any active booking?** — `data.filter(b => b.status !== 'CANCELED').length > 0`:
   - **Yes:** upsert contact in GHL + apply `first-class-booked` tag as a safety net (they should have been tagged by the First Class workflow already, but this guarantees it)
   - **No:** upsert contact in GHL + apply `purchase-no-booking-yet` tag (placeholder name — swap to the actual GHL nudge tag once it's set up)

## Gaps to address before activating

- **`purchase-no-booking-yet` is a placeholder tag name.** Replace with the actual GHL tag your "encourage to book" automation listens for. Edit the body in the **GHL: Tag purchase-no-booking-yet (nudge)** node.
- **Webhook URL routing.** The workflow's webhook path is `glofox-purchase-nudge-test`. Whether Glofox sends `MEMBERSHIP_CREATED` events to this new URL — or fans them out alongside booking events on the existing one — needs to be confirmed with Glofox support. The early `type === 'MEMBERSHIP_CREATED'` filter makes the workflow safe either way.
- **GHL location and credential are hardcoded** to the test sub-account, same pattern as `glofox-first-class/`. Tracked in [issue #1](https://github.com/SocialFitnessManchester/n8n-automations/issues/1).
- **Trial vs paid memberships** — the workflow currently fires on all `MEMBERSHIP_CREATED` events. If you want to scope to trial purchases only, add a second condition: `$json.body.payload.membership_definition.trial === true`.
- **Cancellation edge case** — if a member books then cancels within the 10-minute window, the post-wait check sees "no active booking" and routes to nudge. Currently considered acceptable (cancellation = "they tried but bailed, still need nudge").

## Setup after importing the JSON

Same as the First Class workflow ([README](../glofox-first-class/README.md)) — assign the Google Service Account credential to the Sheets node and the HTTP Header Auth credential (with the GHL PIT) to both GHL HTTP nodes. Set the GHL Location ID in each GHL node's body. Then register the webhook URL with Glofox support.

## Open items

Tracked as [GitHub Issues](https://github.com/SocialFitnessManchester/n8n-automations/issues?q=is%3Aissue+is%3Aopen+label%3Aglofox-purchase-nudge) on the parent repo. See in particular [#6](https://github.com/SocialFitnessManchester/n8n-automations/issues/6) which originally tracked this workflow's design.
