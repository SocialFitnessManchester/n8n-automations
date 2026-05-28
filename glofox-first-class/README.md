# Glofox → GHL: First Class Automation

When a Glofox webhook fires for a member's first-class event (booked, cancelled, or attended), apply the matching tag in Go High Level so the existing GHL workflows take over the rest.

## Flow

1. **Webhook** receives Glofox event. The top-level `type` is `BOOKING_CREATED`, `BOOKING_DELETED`, or `BOOKING_UPDATED`; we route on `payload.status` (`BOOKED` / `CANCELED` / `ATTENDED`).
2. **Google Sheets lookup** — uses `metadata.location_id` to pull the studio's API Key / API Token from the [studio config sheet](https://docs.google.com/spreadsheets/d/10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA/edit).
3. **Glofox member lookup** — `GET /prod/2.0/members/{user_id}` to get email, first/last name, phone.
4. **Glofox bookings list** — `GET /prod/2.0/bookings?user_id={user_id}` returns the member's full booking history (including cancelled).
5. **"Is First Class Event?" IF** — passes based on event type:
   - `BOOKED`: non-cancelled count === 1 (catches first-ever and re-book-after-cancel)
   - `CANCELED`: non-cancelled count === 0 AND total bookings === 1 (only fires for genuine first-class cancellation)
   - `ATTENDED`: attended count === 1 (their first attended class)
6. **Switch** by `payload.status`:
   - `BOOKED` → upsert contact in GHL + apply `first-class-booked` tag
   - `CANCELED` → upsert + apply `first-class-cancelled` tag, then DELETE `first-class-booked` tag (so re-booking re-fires the welcome automation)
   - `ATTENDED` → not yet wired (pending Glofox enabling attended events on the webhook)

All GHL calls go directly to HighLevel V2 (`POST /contacts/upsert`, `DELETE /contacts/{id}/tags`) via HTTP Request nodes with a Private Integration Token as Bearer auth.

## One workflow per studio

Each studio gets its own workflow file in `workflows/`. GHL credential and Location ID are pre-configured per studio so the right sub-account is implicit. To add a studio: copy an existing workflow, update the webhook path + GHL Location ID + credential, then register the new webhook URL with Glofox.

## Setup after importing the JSON

1. **Assign credentials in n8n UI** (not stored in JSON):
   - Google Sheets — **Google Service Account** credential, with the service account email shared on the studio config sheet (Viewer access).
   - All GHL HTTP nodes — **HTTP Header Auth** credential with `Name: Authorization`, `Value: Bearer pit-<your-token>`. Create a Private Integration in the GHL sub-account (Settings → Private Integrations) with View/Edit Contacts scopes.
2. **Set the GHL Location ID** in the body of the GHL upsert nodes. Find it in GHL → Settings → Business Profile.
3. **Register the webhook URL with Glofox** for this studio's branch (Glofox staff must do this — see memory note about webhook setup constraint).
4. **Test:** book a class for a brand-new member, confirm the tag lands; cancel, confirm the swap.

## Known follow-ups

- **ATTENDED branch** — pending Glofox support enabling attended events; we'll wire it once test payloads are flowing.
- **Branch ID not in sheet** — workflow currently fails silently at the lookup step if no row matches. An error branch would catch this loudly.
- **Multi-studio consolidation** — every new studio = a Glofox support ticket to register the webhook URL. Argues for moving to one master n8n workflow with dynamic GHL credential/location lookup eventually.
