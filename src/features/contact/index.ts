export { submitContactMessageAction } from "@/features/contact/application/submit-contact";
export { updateContactStatusAction } from "@/features/contact/application/update-contact-status";
export {
  getAdminContactMessageById,
  listAdminContactMessages,
} from "@/features/contact/application/queries";
export {
  canTransitionContactStatus,
  getEligibleContactStatuses,
  isContactStatus,
  CONTACT_STATUSES,
  type ContactStatus,
} from "@/features/contact/domain/contact-rules";
