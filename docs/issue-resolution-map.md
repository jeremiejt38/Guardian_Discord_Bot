# Issue Resolution Map (Phases 1-7)

This document links implemented phases to repository issues created from the Scrum workflow.

Important:
- The implementation work is committed and pushed.
- Issues were not auto-closed by commit keywords.
- Use this map to close issues manually (or update with `Closes #...` references in follow-up commits/PRs).

## Commits by phase
- Phase 1: 636a95b
- Phase 2: 6aa6290
- Phase 3: edfc8c5
- Phase 4: f46942c
- Phase 5: a507d61
- Phase 6: d454a2e
- Phase 7: 63b0723

## Mapping

### Phase 1 - Initialization flow and install foundation
Commit: 636a95b

Covered issues:
- #15 checkInstall startup flow
- #16 setup private session
- #17 setup step 1 grade-role mapping
- #18 setup step 2 member parameters
- #19 setup step 3 games setup
- #20 setup step 4 optional module toggles
- #21 setup step 5 recap and installation

Partially covered:
- #27 configuration category generation and filtering
- #28 owner advanced channels generation

### Phase 2 - Member onboarding and promotion workflow
Commit: 6aa6290

Covered issues:
- #30 guildMemberAdd invite grade assignment integration
- #31 welcome message flow
- #32 promotion request validation workflow
- #33 posting requests in demandes channel
- #34 staff actions accept/reject/reply
- #36 invite auto-expulsion job (configurable)

### Phase 3 - Games opt-in and server game administration
Commit: edfc8c5

Covered issues:
- #37 permanent mes-channels panel
- #38 multi-select game opt-in
- #39 add/remove diff sync with game roles
- #40 synchronization with ma-gamelist behavior
- #41 manager add/remove game from jeux-serveur

### Phase 4 - Temporary voice channels
Commit: f46942c

Covered issues:
- #42 creer-un-channel UI and game selection
- #43 temporary voice creation and naming rules
- #44 auto-delete timer for empty temporary channels
- #45 startup cleanup of stale temporary voice channels

### Phase 5 - Changelogs and server monitor
Commit: a507d61

Covered issues:
- #47 changelog novelty detection with DB anti-duplication
- #48 publication in per-game channels and game-updates aggregation
- #49 periodic changelog scheduling with configurable frequency
- #62 TCP game server checking with status values
- #63 periodic monitor updates in liste-serveurs

### Phase 6 - Moderation, reports, and behavior scoring
Commit: d454a2e

Covered issues:
- #50 warn command implementation and sanction persistence
- #51 mute command implementation with duration parsing
- #52 kick command implementation
- #53 ban command implementation
- #55 report modal submission flow
- #56 report publication and handled lifecycle
- #57 anti-spam integration with moderation pipeline
- #60 behavior score model with configurable thresholds

Partially covered:
- #54 historique command consistency with new moderation pipeline
- #61 owner-facing comportement configuration interface

### Phase 7 - Configuration surfaces and mutation logging
Commit: 63b0723

Covered issues:
- #65 settings permanent configuration panels system
- #67 moderator configuration surfaces routing integration
- #68 manager configuration surfaces and toggles
- #69 owner configuration surfaces and logs-config mutation logging

Partially covered:
- #66 member+ configuration interfaces are shared with Phase 3 opt-in surfaces and refreshed in startup orchestration

## Not yet addressed in phases 1-7
Examples of backlog items still pending before/with Phase 8:
- #70, #71, #72 test coverage completion
- #8 migrations framework completion
- #58, #59 deeper auto-moderation rules
- #64 complete serveurs-jeu manager UX parity
- #73 optional rich presence placeholder finalization
