function memberHasAnyRole(member, roleIds) {
  if (!member?.roles?.cache || !Array.isArray(roleIds)) {
    return false;
  }

  return roleIds.some((roleId) => Boolean(roleId) && member.roles.cache.has(roleId));
}

module.exports = { memberHasAnyRole };
