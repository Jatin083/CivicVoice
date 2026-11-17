// Mirrors ALLOWED_TRANSITIONS in server/src/constants.js (Section 5.1). The server is the authority.
export const ALLOWED = {
  draft: ['published'],
  published: ['under_review', 'rejected', 'closed'],
  under_review: ['approved', 'rejected'],
  approved: ['closed'],
  rejected: [],
  closed: [],
};
