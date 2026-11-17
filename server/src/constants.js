exports.ALLOWED_TRANSITIONS = {
  draft: ['published'],
  published: ['under_review', 'rejected', 'closed'],
  under_review: ['approved', 'rejected'],
  approved: ['closed'],
  rejected: [],
  closed: [],
};
// creator may only do these; admin may do any ALLOWED_TRANSITIONS move
exports.CREATOR_TRANSITIONS = { draft: ['published'], published: ['closed'], approved: ['closed'] };
exports.PUBLIC_STATUSES = ['published', 'under_review', 'approved', 'closed'];
exports.PETITION_STATUSES = ['draft', 'published', 'under_review', 'approved', 'rejected', 'closed'];
exports.EDITABLE_STATUSES = ['draft', 'published'];
exports.REPORT_REASONS = ['Spam', 'Abusive or hateful', 'Misleading', 'Duplicate petition', 'Other'];
exports.COMMENT_STATUSES = ['visible', 'hidden', 'removed'];
exports.REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'action_taken'];
exports.FEEDBACK_STATUSES = ['new', 'reviewed', 'resolved'];
