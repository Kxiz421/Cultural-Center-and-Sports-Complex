export const HOLIDAY_BLOCK_TYPE = "Holiday";
export const MAINTENANCE_BLOCK_TYPE = "Maintenance";
export const BOOKABLE_HOLIDAY_BLOCK_TYPE = "Holiday (Bookable)";

/** Only a real closure blocks a date; a bookable holiday is informational. */
export function isBlockingBlockType(type) {
  return type !== BOOKABLE_HOLIDAY_BLOCK_TYPE;
}
