/**
 * Helpers for surfacing save/API failures inside MNTD modals instead of
 * page-level banners that are hidden behind closed popups.
 */

/**
 * Normalize API error payloads into a user-visible string.
 */
export function extractApiErrorMessage(response, fallback = "Save failed.") {
  if (response == null) {
    return fallback;
  }

  if (typeof response === "string" && response.trim()) {
    return response.trim();
  }

  if (typeof response === "number") {
    return fallback;
  }

  if (typeof response === "object") {
    const direct =
      response.error ?? response.message ?? response.detail ?? response.title;
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }

    if (Array.isArray(response.errors) && response.errors.length > 0) {
      const first = response.errors[0];
      if (typeof first === "string" && first.trim()) {
        return first.trim();
      }
      if (first && typeof first.message === "string" && first.message.trim()) {
        return first.message.trim();
      }
    }
  }

  return fallback;
}

/**
 * Reopen a modal, set its in-modal error, and optionally show a toast.
 */
export function reportModalSaveFailure({
  message,
  reopenModal,
  setModalError,
  notifyError,
}) {
  const resolvedMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : "Save failed.";

  if (typeof reopenModal === "function") {
    reopenModal();
  }

  if (typeof setModalError === "function") {
    setModalError(resolvedMessage);
  }

  if (typeof notifyError === "function") {
    notifyError(resolvedMessage);
  }
}

/**
 * Show a transient success toast (auto-dismisses; does not block modals).
 */
export function reportModalSaveSuccess({ message, notifySuccess }) {
  const resolvedMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : "Saved successfully.";

  if (typeof notifySuccess === "function") {
    notifySuccess(resolvedMessage);
  }
}
