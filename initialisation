``` text
🤖 SETUP COMPLET — Guardian Bot v1
Je vais réorganiser et compléter ton setup de manière logique et exhaustive. Ceci est destiné à l'IA qui va générer le code.

📋 Structure Générale du Setup
Le setup se divise en 7 étapes logiques :

Language & Vérification — Langue, détection installation existante
Grades & Rôles — Mapping Guardian grades ↔ rôles Discord
Channels Génériques — Règles, annonces, bienvenue, FAQ, général, AFK
Gestion Membres — Système d'accueil Invité → Membre
Modules de Base — VocalGames, GameUpdates, GameList, Logs
Permissions & Access — Qui voit/gère quoi
Finalisation — Vérification, activation, cleanup


🔧 SETUP — ÉTAPE 0 : LANGUAGE & VÉRIFICATION
Durée estimée : 5-10 min
Objectif : Définir la langue, détecter une installation existante, avertir des changements.
0.1 — Choix de la langue
Guardian Bot — Bienvenue ! 🎮

Étape 1/7 : Language

Quelle langue voulez-vous utiliser ?
Interaction : Select Menu

🇫🇷 Français
🇬🇧 English
🇪🇸 Español
(extensible)

Stockage : guild_config.language

0.2 — Détection Installation Existante
Guardian vérifie via audit logs (hash sha256 du guildId) si une installation précédente existe.
Cas A : Installation neuve
✅ Serveur vierge détecté !
Nous allons créer une installation Guardian complète.
Cas B : Installation existante
⚠️ Installation Guardian détectée sur ce serveur.

Que voulez-vous faire ?
Interaction : Boutons

🔄 Reconfigurer — Mode "mise à jour" (ne supprime rien, propose modifications)
🗑️ Réinitialiser — Mode "reset complet" (suppression de la config, recréation)
❌ Annuler — Quitter le setup


0.3 — Scan des Channels Existants
Guardian scanne le serveur et détecte :
0.3.1 — Channels Génériques Existants
Détection des channels existants...

Trouvés :
✅ #général → Utilisé pour le chat général
✅ #annonces → Utilisé pour les annonces
⚠️ #regles → Doit être renommé en #règles
❌ #faq → Non trouvé, sera créé
Pour chaque channel trouvé :

Green (✅) = Format correct, sera utilisé
Yellow (⚠️) = Mauvais nom/format, sera renommé
Red (❌) = Non trouvé, sera créé

Interaction : Bouton "Continuer"

0.3.2 — Channels de Jeux Existants
Guardian détecte les channels qui matchent les patterns :

#nomdjeu (chat général)
#nomdjeu-galerie (galerie)
#nomdjeu-changelogs (updates)

Channels de jeux détectés :

✅ #valorant → Récupéré, sera géré par Guardian
⚠️ #csgo-general → Doit être renommé en #csgo
⚠️ #csgo_screenshots → Doit être renommé en #csgo-galerie
Action : Guardian propose un mapping automatique basé sur le nom existant.
Interaction : Pour chaque channel mal nommé :

Proposer un nouveau nom
Valider ou laisser Guardian le renommer


0.3.3 — Channels Vocaux Existants
Guardian détecte :

Général (vocal)
AFK (vocal)
Autres vocaux numérotés ou nommés

Vocaux détectés :

✅ Général → Sera utilisé
⚠️ AFK (ancien) → Sera renommé en AFK
❌ (1), (2), (3) → Seront supprimés ou cachés

0.4 — Avertissement des Changements
⚠️ IMPORTANT — Voici ce qui va se passer :

1. Channels nommés → Seront renommés/créés au bon format
2. Anciens channels chaos → Resteront mais seront cachés
3. Nouveaux channels Guardian → Seront créés automatiquement
4. Rôles → Seront créés/mappés
5. Permissions → Seront configurées

Êtes-vous d'accord pour continuer ?
Interaction : Boutons

✅ Continuer
❌ Annuler


🔧 SETUP — ÉTAPE 1 : GRADES & RÔLES
Durée estimée : 10-15 min
Objectif : Mapper les 5 grades Guardian aux rôles Discord existants ou en créer.
Hiérarchie Guardian
Grade 5 : Owner       (1 seul, généralement le serveur owner)
Grade 4 : Manager     (Gestion serveur, channels, config)
Grade 3 : Modérateur  (Gestion membres, modération, sanctions)
Grade 2 : Membre      (Accès complet aux features)
Grade 1 : Invité      (Accès limité, nouveau)
Grade 0 : Sans Rôle   (Aucun accès)
1.1 — Mapping Rôle Owner
Étape 2/7 : Grades & Rôles

Grade 5 - OWNER (Accès complet au bot)
Qui est Owner du serveur Guardian ?
Info : Généralement le Discord Server Owner, mais peut être différent.
Interaction : Select Menu (rôles du serveur)

Liste de tous les rôles existants
Option "Créer un nouveau rôle @Owner"

Validation : Au moins 1 Owner minimum.
Stockage : grade_mapping.owner_role_id

1.2 — Mapping Rôle Manager
Grade 4 - MANAGER (Gestion channels, serveur, config)
Qui sont les Managers ?
Info : Généralement les administrateurs du serveur.
Interaction : Select Menu multi-select

Liste des rôles existants
Option "Créer un nouveau rôle @Manager"

Validation : Au moins 1 Manager.
Stockage : grade_mapping.manager_role_ids[]

1.3 — Mapping Rôle Modérateur
Grade 3 - MODÉRATEUR (Modération, sanctions, validation membres)
Qui sont les Modérateurs ?
Info : Équipe de modération, peut inclure des Managers.
Interaction : Select Menu multi-select

Liste des rôles existants
Option "Créer un nouveau rôle @Modérateur"

Validation : Au moins 1 Modérateur.
Stockage : grade_mapping.moderator_role_ids[]

1.4 — Mapping Rôle Membre
Grade 2 - MEMBRE (Accès complet aux features)
Qui devient Membre ?
Info : Attribué automatiquement après validation de l'Invité.
Interaction : Select Menu

Liste des rôles existants
Option "Créer un nouveau rôle @Membre" (recommandé)

Validation : Obligatoire.
Stockage : grade_mapping.member_role_id

1.5 — Mapping Rôle Invité
Grade 1 - INVITÉ (Accès limité, nouveau)
Qui est Invité au serveur ?
Info : Attribué automatiquement aux nouveaux membres. Peut être le rôle @everyone ou un rôle dédié.
Interaction : Select Menu

Liste des rôles existants
Option "Créer un nouveau rôle @Invité" (recommandé)
Option "@everyone" (donner accès à tous)

Validation : Obligatoire.
Stockage : grade_mapping.guest_role_id

1.6 — Résumé des Rôles
✅ Résumé des grades configurés :

Owner   → @Owner (1 personne)
Manager → @Manager, @Admin (2 rôles)
Modérateur → @Modérateur, @Support (2 rôles)
Membre  → @Membre (nouveau rôle créé)
Invité  → @Invité (nouveau rôle créé)

Continuer ? (Si non, retour à l'étape précédente)
Interaction : Boutons

✅ Continuer
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 2 : CHANNELS GÉNÉRIQUES
Durée estimée : 15-20 min
Objectif : Créer ou utiliser les channels publics/privés de base.
2.1 — Catégorie INFORMATIONS (Publique)
Étape 3/7 : Channels Génériques

📁 INFORMATIONS (visible par tous)
2.1.1 — Channel #règles
#règles (Read-only)
Description : Règles du serveur
Interaction : Select Menu

✅ Channel existant (liste)
➕ Créer un nouveau channel

Si création :

Créer avec permissions read-only pour Invité+
Post un message type (editable après)

Message type :
📜 RÈGLES DU SERVEUR

1. Respecter les autres membres
2. Pas de spam
3. Pas de NSFW
4. Pas de pub sans permission
5. Suivre les ordres des Modérateurs
6. Amusez-vous ! 🎮

Dernière mise à jour : [date]
Stockage : channels.rules_channel_id

2.1.2 — Channel #annonces
#annonces (Read-only)
Description : Annonces officielles
Même process que #règles
Message type :
📢 ANNONCES OFFICIELLES

Ce channel est réservé aux annonces officielles du serveur.
Seuls les Managers et Owner peuvent poster ici.

📌 Dernières annonces :
[à remplir]
Stockage : channels.announcements_channel_id

2.1.3 — Channel #bienvenue
#bienvenue (Read-only + messages auto)
Description : Message d'accueil automatique
Interaction : Select Menu

✅ Channel existant
➕ Créer nouveau

Guardian poste automatiquement :
👋 BIENVENUE SUR [SERVEUR NAME] !

Coucou [nouveau membre] ! 👋

Nous sommes heureux de t'accueillir sur Gaming Zone !
[Logo du serveur si disponible]

Avant de commencer :
✅ Lis les #règles (c'est court, promis)
✅ Va dans #présentation pour te présenter
✅ Après 48h, demande à devenir Membre dans #devenir-membre

Des questions ? Regarde la #faq !

À très bientôt ! 🚀
Personnalisation :

Logo du serveur (récupéré automatiquement)
Nom du serveur (récupéré automatiquement)
Délai avant promotion (paramétrable plus tard, défaut 48h)

Stockage : channels.welcome_channel_id

2.1.4 — Channel #faq
#faq (Forum)
Description : Questions fréquentes
Important : Type = FORUM (thread-based), pas texte classique.
Interaction : Select Menu

✅ Channel existant (vérifier que c'est un Forum)
➕ Créer nouveau

Si création : Créer comme Forum Discord natif.
Pré-remplissage par Guardian (IA) :
Guardian va générer automatiquement une FAQ basée sur :

Les modules activés
Les règles du serveur
Les channels existants

Exemple de threads générés :
📌 Comment devenir Membre ?
└─ Réponse : Tu dois...

📌 Comment créer un vocal ?
└─ Réponse : Va dans #créer-un-channel...

📌 Qu'est-ce que le scoring de comportement ?
└─ Réponse : C'est un système qui...

📌 Comment jouer sur les serveurs de jeu ?
└─ Réponse : Va dans #liste-serveurs...
Managers/Owner peuvent :

Ajouter des threads manuellement
Régénérer la FAQ complète via commande
Archiver/supprimer des Q&R

Stockage : channels.faq_channel_id

2.1.5 — Channel #statut-bot
#statut-bot (Optionnel)
Description : Logs et statut de Guardian
Interaction : Bouton

✅ Activer #statut-bot
❌ Désactiver (pas de channel)

Si activé :

Guardian poste un message initial :

🤖 STATUT GUARDIAN

Status : ✅ En ligne
Dernier redémarrage : [date/heure]
Serveurs gérés : 1
Membres : XXX
Configuration : ✅ Complète

[Stats détaillées mises à jour automatiquement]
Peut afficher :

Uptime du bot
Nombre d'actions modération
Derniers événements
Statistiques serveur

Stockage : channels.bot_status_channel_id (ou null si désactivé)

2.2 — Catégorie COMMUNAUTÉ (Publique, Membres+)
2.2.1 — Channel #général
#général (Texte)
Visible par : Invité (lecture seule), Membre+ (lecture/écriture)
Interaction : Select Menu

✅ Channel existant
➕ Créer nouveau

Permissions :

Invité : VIEW + READ_MESSAGE_HISTORY (pas SEND_MESSAGES)
Membre+ : VIEW + SEND_MESSAGES + READ_MESSAGE_HISTORY

Stockage : channels.general_channel_id

2.2.2 — Channel #game-updates
#game-updates (Texte, Read-only)
Visible par : Membre+
Description : Centralise tous les #[jeu]-changelogs
Interaction : Select Menu

✅ Channel existant
➕ Créer nouveau

Message initial :
🎮 MISES À JOUR DES JEUX

Ce channel centralise toutes les mises à jour Steam des jeux que vous suivez.

Les changelogs arrivent automatiquement quand une mise à jour est détectée.

[Logs vides au départ]
Note : Ce channel sera automatiquement alimenté par le module GameUpdates.
Stockage : channels.game_updates_channel_id

2.2.3 — Channel #suggestions
#suggestions (Forum)
Visible par : Membre+
Description : Les membres proposent des idées
Interaction : Bouton

✅ Activer #suggestions
❌ Désactiver

Si activé :
Interaction : Select Menu

✅ Channel existant (vérifier Forum)
➕ Créer nouveau

Type : Forum Discord natif.
Règles :

Tout Membre peut créer un thread
Les threads sont publics
Réactions autorisées (👍👎 minimum)
Archivage auto après 7j sans réponse

Message initial :
💡 SUGGESTIONS & IDÉES

Vous avez une idée pour améliorer le serveur ?
Partagez-la ici en créant un nouveau post !

Comment ça marche :
1. Clique "Créer un post"
2. Donne un titre clair
3. Décris ton idée
4. Les membres votent (👍👎)
5. Les Modos répondent

Merci de rendre Gaming Zone meilleur ! 🎮
Stockage : channels.suggestions_channel_id (ou null si désactivé)

2.2.4 — Channel #liste-serveurs
#liste-serveurs (Texte)
Visible par : Membre+
Description : Statut des serveurs de jeu en temps réel
Interaction : Bouton

✅ Activer #liste-serveurs
❌ Désactiver

Si activé :
Guardian affiche :
🖥️ SERVEURS DE JEU DISPONIBLES

[Carte en temps réel, mise à jour toutes les 5 min]

Exemple :
┌─ Valorant EU
│  IP: 123.456.789.012
│  Port: 5959
│  Status: ✅ EN LIGNE (15/16 joueurs)
│  Dernier check: il y a 2 min
│
└─ CS2 PRO
   IP: 234.567.890.123
   Port: 6060
   Status: ❌ OFFLINE
   Dernier check: il y a 1 min
Note : Les serveurs sont ajoutés par les Managers dans la config plus tard.
Stockage : channels.server_list_channel_id (ou null si désactivé)

2.3 — Catégorie VOCAUX
2.3.1 — Vocal #Général
🔊 Général (Vocal)
Visible par : Invité+
Interaction : Select Menu

✅ Vocal existant
➕ Créer nouveau

Propriétés :

User limit : 0 (illimité)
Bitrate : 96kbps (par défaut Discord)

Stockage : channels.voice_general_id

2.3.2 — Vocal #AFK
🔊 AFK (Vocal)
Visible par : Invité+
Description : Vocal pour inactifs
Interaction : Bouton

✅ Activer AFK
❌ Désactiver (pas de vocal AFK)

Si activé :
Interaction : Select Menu

✅ Vocal existant
➕ Créer nouveau

Propriétés :

User limit : 0 (illimité)
AFK timeout : 15 minutes (déplacé automatiquement après 15 min inactif)

Stockage : channels.voice_afk_id (ou null si désactivé)

2.4 — Résumé Channels
✅ Channels génériques configurés :

📁 INFORMATIONS
✅ #règles (read-only)
✅ #annonces (read-only)
✅ #bienvenue (auto-messages)
✅ #faq (forum, pré-rempli)
✅ #statut-bot (optionnel, activé)

📁 COMMUNAUTÉ
✅ #général (pour tous)
✅ #game-updates (changelogs auto)
✅ #suggestions (forum, activé)
✅ #liste-serveurs (optionnel, activé)

📁 VOCAUX
✅ Général (illimité)
✅ AFK (15 min timeout, optionnel)

Continuer ?
Interaction : Boutons

✅ Continuer
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 3 : GESTION DES MEMBRES
Durée estimée : 10-15 min
Objectif : Configurer le système d'accueil Invité → Membre.
3.1 — Activation Gestion des Membres
Étape 4/7 : Gestion des Membres

Voulez-vous activer la gestion automatique des nouveaux membres ?
Info :

✅ Oui : Guardian gère l'accueil, demandes de promotion, messages auto
❌ Non : Mode manuel (pour serveurs très restrictifs)

Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.

3.2 — Configuration si Activé
3.2.1 — Délai avant promotion (48h)
⏱️ Après combien de temps un Invité peut demander à devenir Membre ?

Actuellement : 48 heures
Interaction : Modal

Input : nombre d'heures (entier)
Minimum : 1h
Maximum : 720h (30 jours)
Défaut : 48h

Stockage : newmember_config.promotion_delay_hours

3.2.2 — Bio obligatoire
📝 Faut-il une bio pour demander la promotion ?
Info : Si oui, l'Invité doit écrire au moins 15 mots pour demander.
Interaction : Bouton

✅ Obligatoire (recommandé)
❌ Optionnel

Défaut : Obligatoire.
Stockage : newmember_config.bio_required

3.2.3 — Parrainage obligatoire
👥 Faut-il un parrain pour demander la promotion ?
Info :

✅ Oui : Un Membre doit confirmer "/parrainer <nom>" pour que l'Invité puisse demander.
❌ Non : Pas nécessaire.

Interaction : Bouton

✅ Obligatoire
❌ Optionnel (recommandé)

Défaut : Optionnel.
Stockage : newmember_config.sponsor_required

3.2.4 — Message de bienvenue personnalisé
💬 Message de bienvenue pour les nouveaux arrivants
(Laissez vide pour utiliser le message par défaut)
Interaction : Modal texte multi-ligne
Défaut : Message généré dynamiquement basé sur les modules activés.
Variables disponibles :

{username} — Nom du membre
{servername} — Nom du serveur
{delay} — Délai avant promotion
{modules} — Liste des modules activés

Exemple :
Bienvenue {username} sur {servername} ! 🎮

Tu es Invité pour {delay} heures.
Pendant ce temps, tu peux :
✅ Lire les règles
✅ Te présenter
✅ Explorer les vocaux publics

Ensuite, tu pourras demander à devenir Membre.

À plus tard ! 🚀
Stockage : newmember_config.welcome_message (ou null = défaut)

3.3 — Channels d'Accueil (Créés Automatiquement)
Guardian crée automatiquement 2 channels privés pour chaque Invité (privés au groupe "User + Modos + Owner") :
3.3.1 — Channel Privé #devenir-membre
#devenir-membre (privé par Invité)
Visible par : L'Invité + Modérateur+ 
Description : Chacun a un channel privé unique
Guardian y poste (message personnalisé) :
👋 Bienvenue [username] sur Gaming Zone !

Tu es Invité pour maintenant.
Voici ce que tu dois faire :

✅ **1. Lis les règles**
   → Va dans #règles

✅ **2. Visite la présentation du serveur**
   → Va dans #présentation-serveur

✅ **3. Attends 48 heures**
   → [Compte à rebours: X h XX min]

✅ **4. (Optionnel) Trouve un parrain**
   → Un Membre fait : /parrainer [ton_nom]

✅ **5. Écris une bio (15 mots min)**
   → On attend... 👀

✅ **6. Clique "Demander à devenir Membre"**
   → Un bouton apparaîtra ici à [heure]

Des questions ? 💬
Les Modérateurs du serveur peuvent t'aider ici !
Bouton (apparaît après délai écoulé) :
[Demander à devenir Membre 🎮]
Quand cliqué :

Guardian ouvre un modal "Bio"
Si bio_required : demande 15+ mots minimum
Valide et envoie la demande dans #demandes (modération)

Stockage : channels.[userid]_devenir_membre (dynamique par utilisateur)

3.3.2 — Channel Privé #présentation-serveur
#présentation-serveur (privé par Invité)
Visible par : L'Invité uniquement
Description : Présentation dynamique du serveur
Guardian y poste (message dynamique) :
🎮 BIENVENUE SUR GAMING ZONE !

[Logo du serveur]

Voici ce qu'on propose :

📋 FEATURES ACTIVÉES :
✅ Opt-in des jeux (vois uniquement ce que tu joues)
✅ Vocaux temporaires (crée un vocal à la demande)
✅ Changelogs automatiques (news des jeux en temps réel)
✅ Système de modération (serveur sain)
✅ Leaderboards (top joueurs)
...et plus !

👥 NOTRE COMMUNAUTÉ :
• XXX Membres actifs
• XX Jeux suivis
• XX Serveurs de jeu disponibles

🎯 COMMENT DÉMARRER ?
1. Deviens Membre (48h d'attente)
2. Va dans #mes-channels et choisis tes jeux
3. Crée des vocaux dans #créer-un-channel
4. Rejoins la communauté ! 🚀

À bientôt ! 💙
Note : Message pré-généré une seule fois, peut être modifié par Owner.

3.4 — Résumé Configuration Membres
✅ Configuration Gestion des Membres :

⏱️ Délai promotion : 48 heures
📝 Bio obligatoire : OUI (15+ mots)
👥 Parrain obligatoire : NON
💬 Message custom : [message personnalisé]

📁 Channels créés :
✅ Chaque Invité a son channel privé #devenir-membre
✅ Chaque Invité a son channel privé #présentation-serveur

Continuer ?
Interaction : Boutons

✅ Continuer
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 4 : MODULES OPTIONNELS
Durée estimée : 10 min
Objectif : Activer/désactiver les modules principaux.
4.1 — VocalGames (Vocaux Temporaires)
Étape 5/7 : Modules

🔊 VOCAL GAMES — Créer des vocaux temporaires

Voulez-vous activer la création de vocaux à la demande ?

Exemple :
• Membre clique sur "Créer un vocal"
• Choisit "Valorant"
• Un vocal "🎮 Valorant (username)" se crée automatiquement
• Quand vide → se supprime tout seul
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Si activé, stockage :

modules.vocal_games_enabled = true
vocal_config.prefix = "🎮 " (customizable plus tard)
vocal_config.suffix = " ({username})" (customizable)
vocal_config.max_users = 0 (illimité, customizable)
vocal_config.auto_delete_delay = 300 (5 min vide, customizable)


4.2 — GameUpdates (Changelogs Steam)
🎮 GAME UPDATES — Changelogs automatiques

Voulez-vous recevoir les mises à jour Steam automatiquement ?

Exemple :
• Vous suivez Valorant
• Une mise à jour sort sur Steam
• Guardian poste le changelog dans #game-updates
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Si activé, stockage :

modules.game_updates_enabled = true
game_updates_config.check_interval = 3600 (1h, customizable)


4.3 — GameList (Opt-in Jeux)
🎮 GAMELIST — Sélectionner ses jeux

Voulez-vous que les membres choisissent les jeux qu'ils suivent ?

Exemple :
• Membre va dans #mes-channels
• Clique sur les jeux qu'il joue
• Les channels des jeux apparaissent/disparaissent
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Si activé, stockage :

modules.gamelist_enabled = true


4.4 — Suggestions (Forum)
💡 SUGGESTIONS — Forum des idées

Déjà activé (#suggestions) lors de l'étape 2.
(Vous pouvez le désactiver maintenant si vous préférez)
Interaction : Boutons

✅ Garder activé
❌ Désactiver


4.5 — Résumé Modules
✅ Modules configurés :

🔊 Vocal Games : ✅ ACTIVÉ
🎮 Game Updates : ✅ ACTIVÉ
🎮 GameList : ✅ ACTIVÉ
💡 Suggestions : ✅ ACTIVÉ

(D'autres modules seront disponibles après)

Continuer ?
Interaction : Boutons

✅ Continuer
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 5 : CONFIGURATION AVANCÉE (Modération & Logs)
Durée estimée : 10-15 min
Objectif : Paramétrer la modération et les logs.
5.1 — Logs Guardian
Étape 6/7 : Configuration Avancée

📋 LOGS GUARDIAN — Tracer les actions du bot

Voulez-vous que Guardian enregistre ses actions ?

Exemple :
• Un Invité devient Membre → log
• Un membre est sanctionné → log
• Un channel est créé → log
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Si activé :
5.1.1 — Niveau de Logs
Quel niveau de détail voulez-vous ?
Interaction : Select Menu

🔴 Minimal — Seulement erreurs graves
🟡 Normal — Actions principales (défaut)
🟢 Verbose — Tout, très détaillé

Défaut : Normal.
5.1.2 — Channel de Logs
Où envoyer les logs Guardian ?
Interaction : Select Menu

✅ Channel existant (recommandé : #logs-modération privé)
➕ Créer un nouveau channel privé #logs-guardian

Note : Ce channel doit être privé (Modérateur+ uniquement).
Stockage : 

logs_config.enabled = true/false
logs_config.level = "minimal|normal|verbose"
logs_config.channel_id = xxxxx


5.2 — Modération Automatique
🛡️ MODÉRATION AUTOMATIQUE

Voulez-vous que Guardian modère automatiquement ?
Info : Anti-spam, anti-flood, filtres de mots, etc.
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Si activé :
5.2.1 — Anti-spam
Anti-spam : Combien de messages par 10 secondes ?
Interaction : Modal

Input : nombre (défaut : 5)
Si dépassé : mute 5 min auto

Stockage : automod_config.spam_threshold = 5

5.2.2 — Slow Mode
Slow mode : Délai minimum entre 2 messages par utilisateur ?
Interaction : Modal

Input : secondes (défaut : 0 = désactivé)
Exemple : 5 = 1 message max par 5 secondes

Stockage : automod_config.slowmode_delay = 0

5.2.3 — Blacklist de Mots
Blacklist : Ajouter des mots interdits ?
Interaction : Modal texte multi-ligne

Chaque mot sur une ligne
Vide = pas de blacklist

Exemple :
badword1
badword2
spam_link.com
Stockage : automod_config.word_blacklist = [...]

5.2.4 — Comportement Blacklist
Quand un message contient un mot interdit :
Interaction : Select Menu

🤫 Supprimer silencieusement (message supprimé, utilisateur ne sait pas)
⚠️ Avertir et supprimer (DM à l'utilisateur, puis supprimer)

Défaut : Avertir et supprimer.
Stockage : automod_config.blacklist_behavior = "silent|warn"

5.3 — Scoring de Comportement
⚖️ SCORING DE COMPORTEMENT

Voulez-vous utiliser un système de score comportement ?

Exemple :
• Warn = -10 pts
• Mute = -25 pts
• -50 pts = mute 24h auto
• -100 pts = kick auto
Interaction : Boutons

✅ Activer
❌ Désactiver

Défaut : Activé.
Note : Configuration détaillée des seuils se fait dans #comportement après setup.
Stockage : score_config.enabled = true/false

5.4 — Résumé Configuration Avancée
✅ Configuration avancée :

📋 Logs Guardian : ✅ ACTIVÉ (Normal)
   → Channel : #logs-guardian

🛡️ Modération auto : ✅ ACTIVÉ
   → Anti-spam : 5 messages/10s
   → Slow mode : désactivé
   → Blacklist : [vide pour le moment]
   → Comportement : Avertir et supprimer

⚖️ Score comportement : ✅ ACTIVÉ

Continuer ?
Interaction : Boutons

✅ Continuer
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 6 : PERMISSIONS & ACCÈS
Durée estimée : 10 min
Objectif : Configurer qui a accès aux channels de configuration.
6.1 — Permissions par Grade
Étape 7/7 : Permissions

Guardian a déjà configuré les permissions par grade :

Grade 5 - Owner : Accès TOTAL
Grade 4 - Manager : Gestion channels & config
Grade 3 - Modérateur : Gestion membres & modération
Grade 2 - Membre : Features du bot (opt-in, vocaux)
Grade 1 - Invité : Accès limité (vocaux publics)
Info : Permissions détaillées modifiables après dans les config channels.

6.2 — Vérification Access
Vérification des accès :
Guardian vérifie que :

✅ Les Owner ont accès à tous les channels
✅ Les Managers ont accès aux channels de config
✅ Les Modos ont accès aux channels de modération
✅ Les Membres ont accès aux features
✅ Les Invités ont accès limité

Si problème :
⚠️ Permissions incomplètes détectées.
Guardian les corrigera automatiquement.

Voulez-vous continuer ?

6.3 — Résumé Permissions
✅ Permissions configurées :

Owner (Grade 5) → ACCÈS TOTAL ✅
Manager (Grade 4) → Configuration ✅
Modérateur (Grade 3) → Modération ✅
Membre (Grade 2) → Features ✅
Invité (Grade 1) → Accès limité ✅

Continuer vers la finalisation ?
Interaction : Boutons

✅ Finaliser
🔙 Retour
❌ Annuler


🔧 SETUP — ÉTAPE 7 : FINALISATION
Durée estimée : 5 min
Étape 8/8 : FINALISATION

Vérification finale en cours...
7.1 — Checklist de Validation
Guardian vérifie tous les éléments configurés :
CONFIGURATION GÉNÉRALE
✅ Langue : Français
✅ Grades & Rôles : 5 grades mappés

CHANNELS GÉNÉRIQUES
✅ #règles, #annonces, #bienvenue, #faq : créés
✅ #général, #game-updates, #suggestions : créés
✅ 🔊 Général, AFK : créés
✅ #statut-bot : créé

GESTION MEMBRES
✅ Délai promotion : 48h
✅ Bio obligatoire : OUI
✅ Messages de bienvenue : configurés
✅ Channels privés : seront créés à chaque nouvelle arrivée

MODULES
✅ Vocal Games : activé
✅ Game Updates : activé
✅ GameList : activé
✅ Suggestions : activé

MODÉRATION
✅ Logs Guardian : activé (Normal)
✅ Modération auto : activé
✅ Score comportement : activé

PERMISSIONS
✅ Owner/Manager/Modérateur/Membre/Invité : configurés

BASE DE DONNÉES
✅ Configuration sauvegardée en SQLite
7.2 — Activation de Guardian
🚀 Activation en cours...
Guardian exécute :

Création des structures BD
✅ Tables SQLite créées/mises à jour

Marquage de l'installation
✅ Installation enregistrée (hash audit logs)

Nettoyage du setup
✅ Channel #guardian-setup supprimé
✅ Catégorie guardian-setup supprimée

Post du résumé final
Guardian poste dans #bienvenue :


🎉 INSTALLATION RÉUSSIE !

Guardian Bot a été configuré avec succès sur votre serveur.

📊 RÉSUMÉ DE VOTRE CONFIGURATION :

📁 Channels créés
  └─ 15 channels d'information et communauté
  └─ 2 channels privés de modération
  └─ Channels jeux seront créés dynamiquement

👥 Grades
  └─ Owner : 1 personne
  └─ Manager : N personnes
  └─ Modérateur : N personnes
  └─ Membre : à configurer
  └─ Invité : à configurer

🎮 Modules activés
  └─ ✅ Gestion des nouveaux membres (48h)
  └─ ✅ Vocaux temporaires
  └─ ✅ Changelogs automatiques
  └─ ✅ Suggestions forum
  └─ ✅ Modération auto

⚙️ PROCHAINES ÉTAPES :

1️⃣ Va dans #mes-channels → configure tes jeux
2️⃣ Va dans #règles → lis les règles (important!)
3️⃣ Va dans #faq → consulte les questions fréquentes
4️⃣ Si tu es Manager/Owner, va dans #configuration pour affiner les paramètres

📚 RESSOURCES :

• #faq — Questions fréquentes
• #suggestions — Propose tes idées
• /help — Aide sur les commandes (si /help disponible)

Bienvenue sur la nouvelle ère de Gaming Zone ! 🚀

Questions ? Demande aux Modérateurs ! 💙

7.3 — Fin du Setup
✅ INSTALLATION TERMINÉE !

Guardian Bot est maintenant actif sur votre serveur.

📝 Notes importantes :
• Les channels de modération et configuration sont privés
• Les managers/owners peuvent affiner les paramètres dans #configuration
• La FAQ a été pré-remplie (customizable)
• Le bot enregistre toutes ses actions dans #logs-guardian

À partir de maintenant :
✅ Nouveaux membres sont Invités (auto)
✅ Après 48h : peuvent demander à devenir Membre
✅ Les channels jeux sont opt-in
✅ Les vocaux se créent à la demande

Bonne chance ! 🎮
Interaction : Bouton

✅ Fermer cette fenêtre


📊 Résumé du Setup (Infographie)
SETUP GUARDIAN — 7 ÉTAPES

1️⃣ Language & Vérification (5 min)
   └─ Détection installation, scan channels

2️⃣ Grades & Rôles (10 min)
   └─ Mapping 5 grades → rôles Discord

3️⃣ Channels Génériques (15 min)
   └─ Création/liaison channels publics & privés

4️⃣ Gestion des Membres (10 min)
   └─ Accueil Invité → Membre (48h)

5️⃣ Modules Optionnels (10 min)
   └─ Activation vocaux, changelogs, suggestions

6️⃣ Configuration Avancée (15 min)
   └─ Modération auto, logs, scoring

7️⃣ Permissions & Accès (10 min)
   └─ Vérification permissions par grade

8️⃣ FINALISATION (5 min)
   └─ Activation, nettoyage, résumé

TOTAL : ~80 minutes pour une installation complète

🎯 Structure Finale Post-Setup
Après le setup, le serveur a cette structure :
📁 INFORMATIONS (Publique)
├─ #règles
├─ #annonces
├─ #bienvenue
├─ #faq
└─ #statut-bot

📁 COMMUNAUTÉ (Membre+)
├─ #général
├─ #game-updates
├─ #suggestions
└─ #liste-serveurs

🎙️ VOCAUX
├─ 🔊 Général
├─ 🔊 AFK
└─ 🔊 [Temporaires]

🎮 JEUX (Dynamique, opt-in)
├─ #[jeu-1]
├─ #[jeu-1]-galerie
├─ #[jeu-1]-changelogs
├─ #[jeu-2]
└─ ...

⚙️ CONFIGURATION (Privée, par grade)
├─ #mes-channels (Membre+)
├─ #ma-gamelist (Membre+)
├─ #statut-bot (Modérateur+)
├─ #bot (Modérateur+)
├─ [... 18 autres channels privés Manager/Owner]
└─ #logs (Owner)

🔒 MODÉRATION (Privée, Modérateur+)
├─ #demandes (validation promos)
├─ #logs-modération
└─ [privée au staff]

🔄 Re-Setup (Reconfiguration Existante)
Si un serveur a déjà Guardian installé et clique /guardian setup :
Guardian a détecté une installation existante.

Que voulez-vous faire ?

Options :
1️⃣ 🔄 RECONFIGURER
   → Revoit les paramètres existants
   → Propose modifications sans rien supprimer
   → Crée les channels manquants

2️⃣ 🗑️ RÉINITIALISER COMPLÈTEMENT
   → ⚠️ Suppression de toute la config
   → Recommencer du début
   → ⚠️ Les données membres/jeux seront perdues

3️⃣ ❌ ANNULER
   → Quitter sans rien changer
```
