import { useCallback, useRef } from "react";

/**
 * Tracks e-signature save context so async API failures can reopen the
 * originating modal after the work modal was closed for signing.
 */
const useMntdEsigSave = () => {
  const pendingAction = useRef(null);

  const triggerEsigForSave = useCallback(
    (callback, reopenModal, closeModals, openSignatureModal) => {
      pendingAction.current = { callback, reopenModal };
      if (typeof closeModals === "function") {
        closeModals();
      }
      window.setTimeout(openSignatureModal, 0);
    },
    [],
  );

  const handleSignAndSave = useCallback(
    // eslint-disable-next-line no-unused-vars
    (signature) => {
      if (pendingAction.current?.callback) {
        pendingAction.current.callback(pendingAction.current.reopenModal);
      }
      pendingAction.current = null;
    },
    [],
  );

  const handleSignCancelled = useCallback(() => {
    if (pendingAction.current?.reopenModal) {
      pendingAction.current.reopenModal();
    }
    pendingAction.current = null;
  }, []);

  const getPendingReopenModal = useCallback(() => {
    return pendingAction.current?.reopenModal ?? null;
  }, []);

  return {
    triggerEsigForSave,
    handleSignAndSave,
    handleSignCancelled,
    getPendingReopenModal,
  };
};

export default useMntdEsigSave;
