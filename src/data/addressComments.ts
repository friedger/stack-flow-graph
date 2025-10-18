/**
 * Address comments module
 * Maps blockchain addresses to human-readable descriptions
 */

export const addressComments: Record<string, string> = {
  "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-vault": "Zest",
  "SP3YBY0BH4ANC0Q35QB6PD163F943FVFVDFM1SH7S.gl-core": "Velar PerpDex",
};

/**
 * Get comment for a given address
 * @param address - The blockchain address
 * @returns The comment string or undefined if not found
 */
export const getAddressComment = (address: string): string | undefined => {
  return addressComments[address];
};
