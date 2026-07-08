# 🗺️ Guardian Setup Wizard — Arbre de navigation

> Généré depuis `guardian/modules/initialisation/setupFlow.js`  
> Mis à jour : v0.23.5 — 9 steps + écrans hors-step

```
🚀 GUARDIAN SETUP WIZARD — Arbre de navigation
═══════════════════════════════════════════════

[INSTALL MESSAGE]
  └─ 🟢 "Installer Guardian"
       │
       ├─ (reinstall) ──────────────────────────────► completeGuildSetup() directement
       │
       └─ (nouvelle install) ──► autoMapRolesByName()
                                      │
                                      ▼
╔══════════════════════════════════════════════════════════════╗
║  VÉRIFICATION SÉCURITÉ DES RÔLES (hors steps numérotés)     ║
║  Rôles dangereux / inutilisés détectés ?                     ║
║  ├─ Oui → panel sécurité (acknowledge / supprimer / garder)  ║
║  │         ↓ quand résolu                                    ║
║  └─ Non ──────────────────────────────────────────────────── ║
╚══════════════════════════════════════════════════════════════╝
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1 — Grades & Rôles (1/9)                                  │
│  Mode invité : [👤 Classique] [🔒 Strict] [🚀 Direct]  (cycle) │
│                                                                  │
│  Scénario A — Aucun rôle sur le serveur                         │
│    └─ "✨ Créer tous les rôles auto"                            │
│         └─► (renommage optionnel par grade) ──► ✅ Suivant     │
│                                                                  │
│  Scénario B — Rôles existants (mapping manuel)                  │
│    └─ Select menu grade par grade + ◀ ▶ navigation              │
│         ├─ "✨ Créer ce rôle" (si non mappé)                   │
│         │     ├─ Conflit ? ──► [🔗 Transférer | 🗑️ Recréer]   │
│         │     └─ Pas de conflit → créé + grade suivant          │
│         └─ Tous mappés → ✅ Suivant                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               │
                    ┌──────────▼──────────┐
                    │ Confirmation Owner  │  (popup hors-step)
                    │  Select membre +    │
                    │  ✅ Confirmer       │
                    └──────────┬──────────┘
                               │
                               ▼
        ┌──────── Serveur Community ? ──────────────────────┐
        │  Non                                              │  Oui
        ▼                                                   ▼
  [Continuer sans activer]              [🔄 Vérifier à nouveau]
        │                                        │ (si Community maintenant)
        └──────────────────┬─────────────────────┘
                           │
                    ┌──────▼──────────────────────────────────────────────┐
                    │  DÉTECTION JEUX EXISTANTS  (hors-step, avant step 3) │
                    │  Guardian analyse les channels existants              │
                    │                                                       │
                    │  ├─ Jeux détectés → [✅ Récupérer | ⏭️ Ignorer]     │
                    │  │     └─ Récupérer ──► REVIEW des jeux détectés     │
                    │  │           (ajuster/supprimer) ──► "Continuer ▶"  │
                    │  │                 │                                  │
                    │  │                 ▼                                  │
                    │  │        GAME LINK (hors-step)                       │
                    │  │        Associer channels existants par jeu         │
                    │  │        (text / changelog / forum / galerie)        │
                    │  │        [⏭️ Passer ce jeu] [➡️ Jeu suivant / ✅]   │
                    │  │                 │                                  │
                    │  └─ Aucun jeu / Ignoré / GameLink terminé ───────────┘
                    └─────────────────────┬───────────────────────────────
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3 — Channels (3/9)                                        │
│                                                                  │
│  Auto-détection d'abord :                                        │
│    ├─ [✅ Conserver les choix de Guardian]  → pré-remplit tout  │
│    └─ [⚙️ Configurer manuellement]         → sélection 1 par 1  │
│                                                                  │
│  Pour chaque slot (vocal général, AFK, #général, #règles…) :   │
│    ├─ Select menu (channels existants)                           │
│    ├─ "🤖 Laisser Guardian créer"                               │
│    ├─ "⏭️ Ignorer ce channel"  (si optionnel)                   │
│    └─ ◀ Préc. / Suivant ▶                                       │
│                                                                  │
│  ⚠️ #général est obligatoire — bloque si non configuré         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ✅ Continuer
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4 — Membres (4/9)                                         │
│  ├─ ⏱️ Délai promotion : ±12h (12h → 1440h)                    │
│  ├─ 📝 Bio obligatoire : on/off                                 │
│  ├─ 👥 Parrainage : on/off                                      │
│  ├─ 🔍 Grade réviseur : cycle Modé → Manager → Owner           │
│  ├─ 🚪 Expulsion invités : on/off + délai ±1j                   │
│  ├─ 💬 Message de bienvenue : modal texte                       │
│  ├─ 🌟 Présentation #rejoindre : modal texte                    │
│  │                                                               │
│  └─ (Community only) ⚙️ Paramètres Discord                     │
│       ├─ [📜 Appliquer canal règles]  → guild.edit()           │
│       ├─ [📡 Appliquer canal updates] → guild.edit()           │
│       └─ [📝 Description serveur]     → modal → guild.edit()   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5 — Vocaux temporaires (5/9)                              │
│  ├─ 🏷️ Préfixe : cycle (aucun / 🎮 / 🎯 / 🔊 / ⚔️ / 🏆 / 🎲) │
│  ├─ 🏷️ Suffixe « — Partie » : on/off                          │
│  ├─ 👤 Limite membres : ±1 (0 = illimité)                      │
│  └─ ⏱️ Délai suppression room vide : ±30s (0.5 → 60 min)      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6 — Jeux (6/9)                                            │
│  ├─ [➕ Ajouter] → modal nom → recherche Steam auto             │
│  │     ├─ Trouvé  → confirmation + ajout                        │
│  │     └─ Pas trouvé → 2e modal (nom + Steam ID manuel)         │
│  ├─ Per jeu : [✏️ Éditer] [🖼️ Galerie] [📢 Changelog] [💬 Texte] [🗑️] │
│  ├─ [◀ ▶] pagination                                            │
│  └─ [🧹 Tout effacer]                                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7 — Modération (7/9)                                      │
│  ├─ ⚖️ Score comportemental : on/off                            │
│  ├─ 🛡️ Anti-spam : seuil ±1 msg / 3s                           │
│  ├─ 🐌 Slow mode : ±5s (0 → 120s)                              │
│  ├─ 🚫 Blacklist : warn / silent + [✏️ Gérer mots] [🗑️ Vider]  │
│  │     └─ modal ajout mot                                        │
│  └─ 📋 Niveau logs : cycle minimal / normal / verbose           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 8 — Paramètres Discord avancés (8/9)  [skippable]        │
│                                                                  │
│  AutoMod Discord (toggle par règle → REST API) :               │
│    ├─ 📣 Anti mention-spam                                      │
│    ├─ 🚫 Filtre mots bannis                                     │
│    └─ 🛡️ Anti-spam contenu                                     │
│                                                                  │
│  (Community only) :                                             │
│    └─ [🎟️ Ajouter channels à l'onboarding] → REST API         │
│                                                                  │
│  └─ [⏭️ Passer cette étape] ──► Step 9                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ▶ Suivant
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 9 — Récapitulatif & Finalisation (9/9)                    │
│  Affiche le résumé complet : grades, modules, membres,          │
│  vocaux, jeux, modération                                        │
│                                                                  │
│  [🚀 Finaliser]                                                  │
│       ├─► (prérelease détectée) → [✅ Confirmer | ⏭️ Ignorer]  │
│       ├─► (nouvelles options depuis dernière install)           │
│       │     └─ Wizard "nouvelles options" (hors-step)           │
│       │           [➡️ Suivant | ⏭️ Passer]                      │
│       └─► completeGuildSetup()                                  │
│                 ├─ Provision channels Guardian                   │
│                 ├─ Application paramètres Discord               │
│                 ├─ [Notifier membres existants ? Oui / Non]     │
│                 └─ ✅ Setup terminé                              │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════
LÉGENDE
═══════════════════════════════════
──► action immédiate (pas de step dédié)
─┬─ choix / branchement
 │   réintègre le flux principal
[x] bouton / interaction
(x) condition
◀ ▶  navigation step précédent / suivant (disponible partout)
```

## Notes architecturales

- **La navigation `◀ ▶` est globale** — le bouton "Retour" ramène toujours au step précédent sauvegardé.
- **3 écrans "hors-step"** s'intercalent entre des steps normaux sans incrémenter le compteur :
  - Vérification sécurité des rôles (avant step 2)
  - Détection / review / GameLink des jeux existants (entre step 1 et step 3)
  - Auto-détection channels (début step 3)
- **Step 2 (modules)** et **step 4 (membres)** appliquent des changements Discord en temps réel via `guild.edit()` sans quitter le step.
- **Step 8** est le seul step entièrement skippable via un bouton dédié.
- **La finalisation** peut déclencher 1 à 2 écrans supplémentaires (prérelease + nouvelles options) avant d'exécuter réellement `completeGuildSetup()`.
- **Le step 2 n'existe pas dans le numérotage** — il est sauté visuellement (step 1 → sécurité → step 2 affiché comme "2/9"). La détection de jeux se positionne entre le step 1 et le step 3 côté serveur (step interne = 2, mais l'UI saute au step 3 channels).
