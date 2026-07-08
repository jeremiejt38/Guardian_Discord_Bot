# 🗄️ Base de données — Guardian Discord Bot

> SQLite via `node:sqlite` (built-in Node 22+) — pas de dépendance externe.  
> Fichier : `./data/guardian.db` (configurable via `DATABASE_PATH` dans `.env`)

---

## Tables

### `schema_version`
Suivi des migrations appliquées.

| Colonne | Type | Description |
|---|---|---|
| `version` | INTEGER PK | Numéro de migration |
| `applied_at` | TEXT | Date d'application (ISO 8601) |

---

### `guilds`
Une entrée par serveur Discord.

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT PK | ID Discord du serveur |
| `setup_done` | INTEGER | 1 si le setup est terminé |
| `setup_hash` | TEXT | Hash SHA256 pour détection réinstallation |
| `owner_id` | TEXT | ID Discord du propriétaire |
| `language` | TEXT | Langue choisie (`fr`, `en`, `es`…) défaut `fr` |

---

### `guild_config`
Configuration clé/valeur par guilde et par module.

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT | ID Discord du serveur |
| `module` | TEXT | Nom du module (`channels`, `members`, `discord`…) |
| `key` | TEXT | Clé de configuration |
| `value` | TEXT | Valeur JSON sérialisée |
| PK | — | `(guild_id, module, key)` |

**Accès via :**
```js
setGuildSetting(guildId, 'channels', 'general_channel_id', '123456789')
getGuildSetting(guildId, 'channels', 'general_channel_id', null)
```

**Modules utilisés :**

| Module | Clés notables |
|---|---|
| `channels` | `general_channel_id`, `rules_channel_id`, `voice_general_id`, `afk_enabled`… |
| `roles` | `invite_role_id`, `membre_role_id`… |
| `vocal` | `prefix`, `suffix`, `suffix_enabled`, `member_limit`, `delete_delay_minutes` |
| `members` | `promotion_delay_hours`, `bio_required`, `sponsorship_required`, `invite_expulsion_days`… |
| `discord` | `afk_timeout`, `system_channel_choice`, `rules_channel_id`, `description`… |
| `setup` | `step`, `channel_cursor` |
| `guides` | `enabled`, `category_id` |
| `notifications` | toggles par catégorie d'alerte |
| `moderation` | seuils behavior score |

---

### `grades`
Mapping grades Guardian ↔ rôles Discord par guilde.

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT | ID Discord du serveur |
| `grade_name` | TEXT | `invite` / `membre` / `moderateur` / `manager` / `owner` |
| `role_id` | TEXT | ID du rôle Discord correspondant |
| PK | — | `(guild_id, grade_name)` |

---

### `members`
Membres enregistrés par Guardian.

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT | ID Discord du serveur |
| `user_id` | TEXT | ID Discord du membre |
| `grade` | TEXT | Grade actuel (`invite`, `membre`…) |
| `join_date` | TEXT | Date d'arrivée (ISO 8601) |
| `bio` | TEXT | Bio renseignée par le membre |
| `parrain_id` | TEXT | ID du parrain (si parrainage actif) |
| `score_comportement` | INTEGER | Score comportemental (défaut 0) |
| `last_regen_at` | TEXT | Dernière régénération du score (migration v4) |
| `rules_accepted` | INTEGER | 1 si règlement accepté (migration v8) |
| PK | — | `(guild_id, user_id)` |

---

### `games`
Jeux configurés par guilde.

| Colonne | Type | Description |
|---|---|---|
| `game_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | ID Discord du serveur |
| `name` | TEXT | Nom du jeu |
| `steam_app_id` | TEXT | App ID Steam (ou `000XXXXXXX` pour non-Steam) |
| `rawg_id` | TEXT | ID RAWG.io pour jeux non-Steam (migration v7) |
| `role_id` | TEXT | Rôle Discord associé |
| `channel_text_id` | TEXT | Channel textuel dédié |
| `channel_galerie_id` | TEXT | Channel galerie |
| `channel_changelog_id` | TEXT | Channel changelog Steam |
| `category_id` | TEXT | Catégorie Discord |
| `galerie_enabled` | INTEGER | Galerie active (défaut 0) |
| `changelog_enabled` | INTEGER | Changelog actif (défaut 1) |
| `text_channel_enabled` | INTEGER | Channel texte actif (défaut 0) — migration v5 |

---

### `member_games`
Opt-in membres ↔ jeux.

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT | |
| `user_id` | TEXT | |
| `game_id` | INTEGER | Référence `games.game_id` |
| PK | — | `(guild_id, user_id, game_id)` |

---

### `sanctions`
Historique des sanctions de modération.

| Colonne | Type | Description |
|---|---|---|
| `sanction_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | |
| `user_id` | TEXT | Membre sanctionné |
| `type` | TEXT | `warn` / `mute` / `kick` / `ban` |
| `reason` | TEXT | Motif |
| `applied_by` | TEXT | ID du modérateur |
| `timestamp` | TEXT | Date (ISO 8601) |
| `duration` | TEXT | Durée (si temporaire) |
| `auto` | INTEGER | 1 si automatique (behavior score) |

---

### `promotion_requests`
Demandes de promotion Invite → Membre.

| Colonne | Type | Description |
|---|---|---|
| `request_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | |
| `user_id` | TEXT | Demandeur |
| `status` | TEXT | `pending` / `accepted` / `rejected` |
| `bio` | TEXT | Bio soumise |
| `sponsorship_id` | TEXT | ID du parrain (si requis) |
| `message_id` | TEXT | Message Discord associé |
| `created_at` | TEXT | |
| `reviewed_at` | TEXT | |
| `reviewed_by` | TEXT | ID du modérateur |
| `reason` | TEXT | Motif de refus |

---

### `parrainage`

| Colonne | Type | Description |
|---|---|---|
| `guild_id` | TEXT | |
| `parrain_id` | TEXT | ID du parrain |
| `invite_id` | TEXT | ID de l'invité parrainé |
| `date` | TEXT | Date du parrainage |
| PK | — | `(guild_id, invite_id)` |

---

### `vocal_temp`
Vocaux temporaires actifs.

| Colonne | Type | Description |
|---|---|---|
| `channel_id` | TEXT PK | ID du channel vocal créé |
| `guild_id` | TEXT | |
| `game_id` | INTEGER | Jeu associé |
| `created_by` | TEXT | ID du membre créateur |
| `created_at` | TEXT | |

---

### `changelogs_seen`
Dernier changelog Steam vu par jeu (évite les doublons).

| Colonne | Type | Description |
|---|---|---|
| `game_id` | INTEGER PK | |
| `last_changelog_id` | TEXT | ID du dernier changelog Steam traité |

---

### `servers_jeu`
Serveurs de jeu communautaires.

| Colonne | Type | Description |
|---|---|---|
| `server_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | |
| `name` | TEXT | Nom du serveur |
| `game` | TEXT | Jeu associé |
| `ip` | TEXT | Adresse IP |
| `port` | INTEGER | Port |
| `password` | TEXT | Mot de passe (chiffré) |
| `approved` | INTEGER | 1 si approuvé — migration v3 |
| `last_status` | TEXT | `online` / `offline` / `unstable` |
| `last_check` | TEXT | Dernière vérification |
| `status_message_id` | TEXT | Message Discord du statut — migration v2 |

---

### `game_requests`
Demandes d'ajout de jeux par les membres (migration v6).

| Colonne | Type | Description |
|---|---|---|
| `request_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | |
| `requester_id` | TEXT | ID du membre demandeur |
| `name` | TEXT | Nom du jeu demandé |
| `steam_app_id` | TEXT | App ID Steam (optionnel) |
| `status` | TEXT | `pending` / `accepted` / `rejected` |
| `reviewed_by` | TEXT | |
| `created_at` | TEXT | |
| `reviewed_at` | TEXT | |

---

### `reports`
Signalements de membres.

| Colonne | Type | Description |
|---|---|---|
| `report_id` | INTEGER PK AUTOINCREMENT | |
| `guild_id` | TEXT | |
| `reporter_id` | TEXT | |
| `target_text` | TEXT | Cible du signalement |
| `reason` | TEXT | |
| `evidence` | TEXT | Preuves (liens, screenshots) |
| `status` | TEXT | `open` / `handled` |
| `message_id` | TEXT | Message Discord associé |
| `created_at` | TEXT | |
| `handled_at` | TEXT | |
| `handled_by` | TEXT | |

---

## Migrations

Les migrations sont dans `MIGRATIONS` dans `database/db.js`.  
**Règle absolue : ajouter uniquement en fin de tableau, ne jamais modifier une migration existante.**

| Version | Description |
|---|---|
| 1 | Schéma initial (dans `initDatabase`) |
| 2 | `servers_jeu` : ajout `status_message_id` |
| 3 | `servers_jeu` : ajout `approved` |
| 4 | `members` : ajout `last_regen_at` |
| 5 | `games` : ajout `text_channel_enabled` |
| 6 | Création table `game_requests` |
| 7 | `games` : ajout `rawg_id` |
| 8 | `members` : ajout `rules_accepted` |

---

## Ajouter une migration

```js
// Dans database/db.js — MIGRATIONS array, à la fin :
{
  version: 9,
  description: 'ma_table: ajout nouvelle_colonne',
  up(conn) {
    const cols = conn.prepare('PRAGMA table_info(ma_table)').all().map((c) => c.name);
    if (!cols.includes('nouvelle_colonne')) {
      conn.exec('ALTER TABLE ma_table ADD COLUMN nouvelle_colonne TEXT');
    }
  }
}
```
