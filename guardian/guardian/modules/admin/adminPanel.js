const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../../database/db');

const VIEWS = {
  main: 'main',
  stats: 'stats',
  moderation: 'moderation',
  games: 'games',
  recap: 'recap'
};

function buildMainView() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_stats')
        .setLabel('Statistiques')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_moderation')
        .setLabel('Modération')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_games')
        .setLabel('Jeux')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_recap')
        .setLabel('Récapitulatif')
        .setStyle(ButtonStyle.Danger)
    );

  return {
    content: 'Bienvenue dans le panneau d\'administration Guardian !',
    components: [row]
  };
}

function buildStatsView() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Retour')
        .setStyle(ButtonStyle.Secondary)
    );

  return {
    content: 'Statistiques détaillées',
    components: [row]
  };
}

function buildModerationView() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Retour')
        .setStyle(ButtonStyle.Secondary)
    );

  return {
    content: 'Gestion de la modération',
    components: [row]
  };
}

function buildGamesView() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Retour')
        .setStyle(ButtonStyle.Secondary)
    );

  return {
    content: 'Gestion des jeux',
    components: [row]
  };
}

async function buildRecapView() {
  const db = getDatabase();
  
  try {
    // Récupération des statistiques pour les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Compte des nouveaux membres
    const newMembersCount = await db.get(
      'SELECT COUNT(*) as count FROM members WHERE join_date >= ?',
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );
    
    // Compte des jeux actifs
    const activeGamesCount = await db.get(
      'SELECT COUNT(*) as count FROM games WHERE last_played >= ?',
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );
    
    // Compte des incidents de modération
    const moderationIncidentsCount = await db.get(
      'SELECT COUNT(*) as count FROM moderation_logs WHERE timestamp >= ?',
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );
    
    const embed = new EmbedBuilder()
      .setTitle('Récapitulatif des statistiques (30 derniers jours)')
      .setColor('#0099ff')
      .addFields(
        { name: 'Nouveaux membres', value: newMembersCount.count.toString(), inline: true },
        { name: 'Jeux actifs', value: activeGamesCount.count.toString(), inline: true },
        { name: 'Incidents de modération', value: moderationIncidentsCount.count.toString(), inline: true }
      )
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('admin_back')
          .setLabel('Retour')
          .setStyle(ButtonStyle.Secondary)
      );
    
    return {
      embeds: [embed],
      components: [row]
    };
  } catch (error) {
    console.error('Erreur lors de la construction de la vue de récapitulatif:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('Erreur')
      .setDescription('Impossible de récupérer les statistiques.')
      .setColor('#ff0000');
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('admin_back')
          .setLabel('Retour')
          .setStyle(ButtonStyle.Secondary)
      );
    
    return {
      embeds: [embed],
      components: [row]
    };
  }
}

module.exports = {
  VIEWS,
  buildMainView,
  buildStatsView,
  buildModerationView,
  buildGamesView,
  buildRecapView
};
