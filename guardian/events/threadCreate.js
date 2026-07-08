'use strict';

// @premium-start
const { handleNewSuggestionThread } = require('../modules/suggestions/suggestions');
// @premium-end
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'threadCreate',
  async execute(client, thread, newlyCreated) {
    if (!newlyCreated) return;
    // @premium-start
    await handleNewSuggestionThread(thread).catch((err) =>
      logger.warn('threadCreate: suggestions handler failed', { error: err?.message })
    );
    // @premium-end
  }
};
