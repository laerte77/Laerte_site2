/**
 * Utility to normalize email addresses for consistent database storage and querying.
 * Converts to lowercase and removes leading/trailing whitespace.
 */
export const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};