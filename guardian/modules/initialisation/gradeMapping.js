const { GRADE_NAMES } = require('../../config');
const { getDb } = require('../../database/db');

const ORDERED_GRADES = Object.freeze([
  GRADE_NAMES.invite,
  GRADE_NAMES.membre,
  GRADE_NAMES.moderateur,
  GRADE_NAMES.manager,
  GRADE_NAMES.owner
]);

const REQUIRED_GRADES = Object.freeze([GRADE_NAMES.membre, GRADE_NAMES.owner]);

function setGradeRole(guildId, gradeName, roleId) {
  const db = getDb();
  db.prepare(
    `INSERT INTO grades (guild_id, grade_name, role_id)
     VALUES (?, ?, ?)
     ON CONFLICT(guild_id, grade_name)
     DO UPDATE SET role_id = excluded.role_id`
  ).run(guildId, gradeName, roleId);
}

function getGradeMappings(guildId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT grade_name, role_id FROM grades WHERE guild_id = ?')
    .all(guildId);

  return rows.reduce((acc, row) => {
    acc[row.grade_name] = row.role_id;
    return acc;
  }, {});
}

function validateStepOneMappings(guild) {
  const mappings = getGradeMappings(guild.id);

  const missingGrades = REQUIRED_GRADES.filter((grade) => !mappings[grade]);
  if (missingGrades.length) {
    return {
      ok: false,
      reason: 'missing_mappings',
      details: { missingGrades },
      mappings
    };
  }

  const mappedIds = ORDERED_GRADES.map((grade) => mappings[grade]).filter(Boolean);
  const uniqueRoleCount = new Set(mappedIds).size;
  if (uniqueRoleCount !== mappedIds.length) {
    return {
      ok: false,
      reason: 'duplicate_roles',
      mappings
    };
  }

  const ownerRoleId = mappings[GRADE_NAMES.owner];
  const ownerRole = guild.roles.cache.get(ownerRoleId);
  if (!ownerRole) {
    return {
      ok: false,
      reason: 'owner_role_missing',
      mappings
    };
  }

  const ownerCount = ownerRole.members.size;
  if (ownerCount !== 1) {
    return {
      ok: false,
      reason: 'owner_cardinality',
      details: { ownerCount },
      mappings
    };
  }

  return {
    ok: true,
    reason: null,
    mappings
  };
}

module.exports = {
  ORDERED_GRADES,
  REQUIRED_GRADES,
  setGradeRole,
  getGradeMappings,
  validateStepOneMappings
};
