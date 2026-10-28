# Coach message quota

Installed in Supabase project boalacuzelujpifbbptm using migration coach_daily_message_limit.

## Policy
- 20 accepted request attempts per authenticated member per calendar day.
- Jack and Jill share one allowance.
- Reset at midnight Europe/London, including daylight-saving changes.
- An atomic PostgreSQL UPSERT prevents simultaneous requests from exceeding 20.
- Only service_role can call reserve_coach_message; clients cannot read or reset counters.
- Failed AI calls count once a reservation has been accepted; retries require another reservation. This conservative rule prevents retries bypassing the cap.
- Only user ID, date and count are stored; no chat content.

## Integration status
The database rule is deployed and tested. The website still uses scripted coach demos and does NOT call this rule. No live AI service, account integration or monthly dollar spending cap is enabled by this change.

Before enabling live AI, the trusted server handler must:
1. Verify the member session on the server and derive user.id from it (never accept the member ID supplied by a browser).
2. Validate the coach and message and check that the AI provider is configured.
3. Call the Supabase RPC reserve_coach_message with p_user_id and p_coach, using a server-only service-role credential.
4. Fail closed if the database call fails. If allowed is false, return HTTP 429 with remaining and resets_at without calling AI.
5. Only when allowed is true, make ONE bounded AI request. Do not let automatic retries bypass the quota.
6. Return remaining and resets_at to the client, which can show a daily allowance notice.

Member authentication and the real coaching handler are still outstanding. This quota is NOT a dollar budget or a complete launch configuration.

## Verification
Run test-coach-quota.sql in a trusted administrative SQL session. The transaction rolls back all test records. Covers the 20-message boundary shared across coaches, blocked 21st message, member isolation, new-day reset, UK midnight, invalid coach and client privilege restrictions. A separate service_role transaction verified actual server execution.

Security advisor reports informational RLS-without-policy for this private table. Intentional: anon/authenticated get no schema or table privileges and there are no client policies; only the trusted service_role uses it. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
