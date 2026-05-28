# Glowfox → GHL: First Class Automation

When a Glowfox webhook fires and the event is the member's first-ever booking, tag the matching contact in Go High Level so the existing GHL workflow takes over the rest.

## Flow

1. **Webhook** receives Glowfox event (`BOOKING_CREATED` / `BOOKING_CANCELLED` / `BOOKING_ATTENDED`)
2. **Google Sheets lookup** — uses `Metadata.Location Id` to pull the studio's API Key / API Token from the [studio config sheet](https://docs.google.com/spreadsheets/d/10JeveuIeXNGsGyDQD5dvFLKzOoOzIN8ffRwszGuu2XA/edit)
3. **Glowfox member lookup** — `GET /prod/2.0/members/{user_id}` to get the member's email
4. **Glowfox bookings count** — `GET /prod/2.0/bookings?user_id={user_id}` to determine `is_first_booking`
5. **IF** — stop unless `total_count === 1`
6. **Switch** by `payload.status`:
   - `BOOKED` → tag `first-class-booked` in GHL (wired)
   - `CANCELED` → placeholder, not wired yet
   - `ATTENDED` → placeholder, not wired yet
7. **GHL upsert + tag** — calls HighLevel V2 API `POST /contacts/upsert` directly via HTTP Request node, using a Private Integration Token as Bearer auth. Finds the contact by email (creates if missing) and applies the tag in one call.

## One workflow per studio

Each studio gets its own workflow file in `workflows/`, named after the studio. The GHL credential and webhook path are pre-configured per studio so the right sub-account is implicit.

To add a new studio: copy an existing workflow JSON, update the webhook path, assign the GHL credential for that sub-account, register the new webhook URL in Glowfox.

## Setup after importing the JSON

1. **Assign credentials in n8n UI** (not stored in JSON):
   - Google Sheets — **Google Service Account** credential, with the service account email shared on the studio config sheet (Viewer access)
   - GHL HTTP node — **HTTP Header Auth** credential with `Name: Authorization`, `Value: Bearer pit-<your-token>`. Create a Private Integration in the GHL sub-account (Settings → Private Integrations) with View/Edit Contacts scopes.
2. **Set the GHL Location ID** in the body of the `GHL: Tag first-class-booked` HTTP node. Find it in GHL → Settings → Business Profile.
3. **Register the webhook URL with Glowfox** for this studio's branch.
4. **Test:** book a class for a brand-new member in Glowfox, confirm the tag lands on their GHL contact.

## Known unknowns / next iterations

- **Cancelled & attended branches** are stubbed — logic for "first class" semantics differs across statuses (see thread). Wire after testing the booked path.
- **`Raw Data Is First`** field on the booking object may be a more reliable signal than `total_count === 1`. Worth exploring during test.
- **Contact missing in GHL** — currently set to upsert (create if missing). May want to fail loudly instead.
- **Branch ID not found in sheet** — workflow will currently silently fail at the lookup step. Add an error branch when ready.
