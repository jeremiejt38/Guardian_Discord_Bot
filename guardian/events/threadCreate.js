'use strict';

const { handleNewSuggestionThread } = require('../modules/suggestions/suggestions');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'threadCreate',
  async execute(client, thread, newlyCreated) {
    if (!newlyCreated) return;
    await handleNewSuggestionThread(thread).catch((err) =>
      logger.warn('threadCreate: suggestions handler failed', { error: err?.message })
    );
  }
};
