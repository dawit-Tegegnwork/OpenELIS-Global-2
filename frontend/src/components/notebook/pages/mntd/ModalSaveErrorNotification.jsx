import React from "react";
import { InlineNotification } from "@carbon/react";
import PropTypes from "prop-types";

/**
 * Standard in-modal error banner for MNTD save flows.
 */
const ModalSaveErrorNotification = ({ message, onClose }) => {
  if (!message) {
    return null;
  }

  return (
    <InlineNotification
      kind="error"
      title={message}
      onClose={onClose}
      lowContrast
      hideCloseButton={false}
      style={{ marginBottom: "1rem" }}
    />
  );
};

ModalSaveErrorNotification.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
};

export default ModalSaveErrorNotification;
