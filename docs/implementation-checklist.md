# Guardian - Execution checklist

## Phase 0 - Baseline safeguards
- [x] Add a minimal i18n layer and remove hardcoded user-facing strings in touched files.
- [x] Add centralized interaction routing for setup custom IDs.
- [ ] Add basic role/grade guard helpers for commands and interaction handlers.

## Phase 1 - Initialization flow (spec module 1)
- [x] Implement setup step state machine (steps 1 to 5) in DB-backed config.
- [x] Build setup components: role mapping, member rules, games, module toggles.
- [ ] Implement final installation creator for categories/channels/roles. (provisioning + per-channel rules done for current channels, advanced channels still pending)
- [ ] Add owner-only access checks for setup and reinstall actions. (setup covered, reinstall action pending)

## Phase 2 - Members workflow (spec module 2)
- [x] Add welcome buttons/modal flow for invite->member request.
- [x] Validate delay, bio requirement, and sponsorship requirement in order.
- [x] Post request cards in `#demandes` with action buttons.
- [x] Implement accept/refuse/reply handlers and logging.
- [x] Make invite auto-expulsion delay fully configurable.
- [x] Persist promotion request lifecycle (pending/accepted/rejected).

## Phase 3 - Games opt-in and channels (spec module 3)
- [x] Add permanent message/UI in `#mes-channels` and `#ma-gamelist`.
- [x] Implement multi-select sync with `member_games` and role assignment.
- [x] Add manager workflow to add/remove game and provision category/channels/role.

## Phase 4 - Temporary voice (spec module 4)
- [x] Add create-voice interaction flow from `#créer-un-channel`.
- [x] Support naming format with prefix/suffix and numeric collision handling.
- [x] Make empty-channel deletion delay configurable per guild.

## Phase 5 - Changelogs and monitor (spec modules 5 and 7)
- [x] Add configurable timer frequencies from guild settings.
- [x] Add robust channel resolution by stored IDs with fallback logging.
- [x] Implement `#liste-serveurs` message update mode (edit not repost).

## Phase 6 - Moderation and behavior (spec module 6)
- [x] Align behavior score semantics (decreasing score vs increasing counter).
- [x] Add configurable thresholds and chained auto-sanctions.
- [x] Implement report modal submission and mark-as-handled lifecycle.
- [x] Extend moderation commands with DM notifications and timeout parsing.

## Phase 7 - Config surfaces (spec module 9)
- [x] Add permanent interactive config posts per channel.
- [x] Log every config mutation in `#logs-config` with old/new values.
- [x] Add module/channel toggles that hide channels instead of deleting.

## Phase 8 - Quality and release
- [ ] Add tests for setup interactions and state transitions.
- [ ] Add tests for member promotion workflow validations.
- [ ] Add tests for behavior thresholds and automod sanctions.
- [ ] Add linting/formatting and CI pipeline.
- [ ] Prepare migration framework beyond schema version 1.
