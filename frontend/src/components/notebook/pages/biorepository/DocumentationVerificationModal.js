import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  Checkbox,
  Dropdown,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
  Loading,
  Tag,
  ProgressBar,
  Accordion,
  AccordionItem,
} from "@carbon/react";
import { Checkmark, Warning, WarningAlt } from "@carbon/icons-react";
import { FormattedMessage, useIntl } from "react-intl";
import PropTypes from "prop-types";
import {
  getFromOpenElisServer,
  postToOpenElisServerJsonResponse,
  putToOpenElisServerJsonResponse,
} from "../../../utils/Utils";
import {
  ESignatureModal,
  SignatureMeaning,
  useESign,
} from "../../../esignature";

/**
 * DocumentationVerificationModal - 6-point verification checklist modal
 * Sub-stage 1b of the Biorepository Intake workflow (linked to shipment)
 *
 * Per SRS Section 4.2.2: Documentation verification happens BEFORE sample
 * registration to ensure accompanying paperwork is complete and accurate.
 *
 * Checklist items:
 * 1. Sample Identifiers Match (shipment manifest matches labels)
 * 2. Ethics Approval (IRB/ethics reference on file)
 * 3. Biosafety Classification Match
 * 4. Packaging Integrity (manual inspection)
 * 5. Informed Consent Record (for human samples)
 * 6. MTA Documented (for external samples, N/A allowed)
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.shipment - The shipment being verified
 * @param {Function} props.onVerificationComplete - Callback when verification is complete
 */
function DocumentationVerificationModal({
  open,
  onClose,
  shipment,
  onVerificationComplete,
}) {
  const intl = useIntl();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [biosafetyClassification, setBiosafetyClassification] = useState(null);

  const biosafetyLevels = [
    {
      id: "BSL_1",
      text: intl.formatMessage({
        id: "biorepository.biosafety.level1",
        defaultMessage: "Level 1",
      }),
    },
    {
      id: "BSL_2",
      text: intl.formatMessage({
        id: "biorepository.biosafety.level2",
        defaultMessage: "Level 2",
      }),
    },
    {
      id: "BSL_3",
      text: intl.formatMessage({
        id: "biorepository.biosafety.level3",
        defaultMessage: "Level 3",
      }),
    },
    {
      id: "BSL_4",
      text: intl.formatMessage({
        id: "biorepository.biosafety.level4",
        defaultMessage: "Level 4",
      }),
    },
  ];

  // Checklist items configuration
  const checklistItems = [
    {
      id: "sampleIdentifiers",
      label: intl.formatMessage({
        id: "biorepository.verification.item.sampleIdentifiers",
        defaultMessage: "Sample Identifiers Match",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.sampleIdentifiers.description",
        defaultMessage:
          "Verify that sample identifiers on the tube match the manifest and system records",
      }),
      allowNA: false,
    },
    {
      id: "ethicsApproval",
      label: intl.formatMessage({
        id: "biorepository.verification.item.ethicsApproval",
        defaultMessage: "Ethics Approval",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.ethicsApproval.description",
        defaultMessage:
          "Verify ethics approval reference is documented and valid",
      }),
      allowNA: false,
    },
    {
      id: "biosafetyMatch",
      label: intl.formatMessage({
        id: "biorepository.verification.item.biosafetyMatch",
        defaultMessage: "Biosafety Classification Match",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.biosafetyMatch.description",
        defaultMessage: "Confirm biosafety level matches sample documentation",
      }),
      allowNA: false,
    },
    {
      id: "packagingIntegrity",
      label: intl.formatMessage({
        id: "biorepository.verification.item.packagingIntegrity",
        defaultMessage: "Packaging Integrity",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.packagingIntegrity.description",
        defaultMessage: "Manually verify sample packaging is intact and secure",
      }),
      allowNA: false,
      manual: true,
    },
    {
      id: "consentRecord",
      label: intl.formatMessage({
        id: "biorepository.verification.item.consentRecord",
        defaultMessage: "Informed Consent Record",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.consentRecord.description",
        defaultMessage: "Verify informed consent is documented for this sample",
      }),
      allowNA: true,
    },
    {
      id: "mtaDocumented",
      label: intl.formatMessage({
        id: "biorepository.verification.item.mtaDocumented",
        defaultMessage: "MTA Documented",
      }),
      description: intl.formatMessage({
        id: "biorepository.verification.item.mtaDocumented.description",
        defaultMessage:
          "Verify Material Transfer Agreement is in place if sample is from external source",
      }),
      allowNA: true,
    },
  ];

  // Load verification data for shipment
  useEffect(() => {
    if (open && shipment?.id) {
      setLoading(true);
      getFromOpenElisServer(
        `/rest/biorepository/verification/by-shipment/${shipment.id}`,
        (data) => {
          if (data && !data.error) {
            setVerification(data);
          } else {
            // Create new verification if none exists
            postToOpenElisServerJsonResponse(
              `/rest/biorepository/verification/create-for-shipment/${shipment.id}`,
              JSON.stringify({}),
              (response) => {
                if (response && !response.error) {
                  // Reload to get full verification object
                  getFromOpenElisServer(
                    `/rest/biorepository/verification/by-shipment/${shipment.id}`,
                    (newData) => {
                      setVerification(newData);
                      setLoading(false);
                    },
                  );
                } else {
                  setError(
                    response?.error || "Failed to create verification record",
                  );
                  setLoading(false);
                }
              },
            );
            return;
          }
          setLoading(false);
        },
      );
    }
  }, [open, shipment?.id]);

  useEffect(() => {
    setAdditionalInfo(verification?.verificationNotes || "");
  }, [verification?.verificationNotes]);

  useEffect(() => {
    setBiosafetyClassification(verification?.biosafetyClassification || null);
  }, [verification?.biosafetyClassification]);

  const handleBiosafetyClassificationChange = useCallback(
    (selectedLevel) => {
      if (!verification?.id || !selectedLevel) return;

      setSaving(true);
      setError(null);

      putToOpenElisServerJsonResponse(
        `/rest/biorepository/verification/${verification.id}/biosafety-classification`,
        JSON.stringify({ biosafetyClassification: selectedLevel }),
        (response) => {
          setSaving(false);
          if (response?.error) {
            setError(response.error);
          } else {
            setBiosafetyClassification(selectedLevel);
            setVerification((prev) => ({
              ...prev,
              biosafetyClassification: selectedLevel,
              completedCount: response.completedCount,
            }));
          }
        },
      );
    },
    [verification?.id],
  );

  const handleNotesBlur = useCallback(() => {
    if (!verification?.id) return;

    putToOpenElisServerJsonResponse(
      `/rest/biorepository/verification/${verification.id}/notes`,
      JSON.stringify({ notes: additionalInfo }),
      (response) => {
        if (response?.error) {
          setError(response.error);
        } else {
          setVerification((prev) => ({
            ...prev,
            verificationNotes: additionalInfo,
          }));
        }
      },
    );
  }, [verification?.id, additionalInfo]);

  const getItemStatus = useCallback(
    (itemId) => {
      if (!verification) return "PENDING";
      const statusField = `status${itemId.charAt(0).toUpperCase() + itemId.slice(1)}`;
      return verification[statusField] || "PENDING";
    },
    [verification],
  );

  const getItemChecked = useCallback(
    (itemId) => {
      if (!verification) return false;
      const checkField = `check${itemId.charAt(0).toUpperCase() + itemId.slice(1)}`;
      return verification[checkField] || false;
    },
    [verification],
  );

  const handleItemChange = useCallback(
    (itemId, verified, notApplicable = false, naJustification = "") => {
      if (!verification?.id) return;

      setSaving(true);
      setError(null);

      putToOpenElisServerJsonResponse(
        `/rest/biorepository/verification/${verification.id}/item`,
        JSON.stringify({
          itemName: itemId,
          verified,
          notApplicable,
          naJustification,
        }),
        (response) => {
          setSaving(false);
          if (response?.error) {
            setError(response.error);
          } else {
            // Update local state
            setVerification((prev) => ({
              ...prev,
              [`check${itemId.charAt(0).toUpperCase() + itemId.slice(1)}`]:
                verified,
              [`status${itemId.charAt(0).toUpperCase() + itemId.slice(1)}`]:
                notApplicable ? "N_A" : verified ? "VERIFIED" : "PENDING",
              overallStatus: response.status,
              completedCount: response.completedCount,
            }));
          }
        },
      );
    },
    [verification?.id],
  );

  const handleComplete = useCallback(() => {
    if (!verification?.id) return;

    setSaving(true);
    setError(null);

    postToOpenElisServerJsonResponse(
      `/rest/biorepository/verification/${verification.id}/complete`,
      JSON.stringify({}),
      (response) => {
        setSaving(false);
        if (response?.error) {
          setError(response.error);
        } else {
          if (onVerificationComplete) {
            onVerificationComplete(response);
          }
          onClose();
        }
      },
    );
  }, [verification?.id, onVerificationComplete, onClose]);

  const {
    openSignatureModal: openCompleteSignatureModal,
    signatureModalProps: completeSignatureModalProps,
    isCheckingEnabled: isCheckingCompleteSignature,
  } = useESign({
    meaning: SignatureMeaning.VALIDATED_AND_RELEASED,
    context: intl.formatMessage(
      {
        id: "biorepository.verification.esig.completeContext",
        defaultMessage:
          "Complete documentation verification for shipment {shipmentRef}",
      },
      {
        shipmentRef: shipment?.deliveryReference || shipment?.id || "-",
      },
    ),
    recordType: "NOTEBOOK_PAGE_SAMPLE",
    recordId: verification?.id || shipment?.id || 0,
    onSuccess: handleComplete,
  });

  const handleQuarantine = useCallback(
    (reason) => {
      if (!verification?.id) return;

      setSaving(true);
      setError(null);

      postToOpenElisServerJsonResponse(
        `/rest/biorepository/verification/${verification.id}/quarantine`,
        JSON.stringify({ reason }),
        (response) => {
          setSaving(false);
          if (response?.error) {
            setError(response.error);
          } else {
            if (onVerificationComplete) {
              onVerificationComplete(response);
            }
            onClose();
          }
        },
      );
    },
    [verification?.id, onVerificationComplete, onClose],
  );

  const completedCount = verification?.completedCount || 0;
  const totalItems = checklistItems.length;
  const progress = (completedCount / totalItems) * 100;
  const isComplete = completedCount === totalItems;

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={intl.formatMessage({
        id: "biorepository.verification.modal.title",
        defaultMessage: "Documentation Verification",
      })}
      primaryButtonText={
        isComplete
          ? intl.formatMessage({
              id: "biorepository.verification.button.complete",
              defaultMessage: "Complete Verification",
            })
          : undefined
      }
      primaryButtonDisabled={
        !isComplete || saving || isCheckingCompleteSignature
      }
      onRequestSubmit={openCompleteSignatureModal}
      secondaryButtonText={intl.formatMessage({
        id: "biorepository.button.cancel",
        defaultMessage: "Cancel",
      })}
      size="lg"
      passiveModal={!isComplete}
    >
      {loading && <Loading withOverlay description="Loading verification..." />}
      {saving && <Loading withOverlay description="Saving..." />}

      {error && (
        <InlineNotification
          kind="error"
          title={intl.formatMessage({
            id: "biorepository.verification.error.title",
            defaultMessage: "Error",
          })}
          subtitle={error}
          lowContrast
          onClose={() => setError(null)}
          style={{ marginBottom: "1rem" }}
        />
      )}

      {shipment && (
        <div style={{ marginBottom: "1rem" }}>
          <p>
            <strong>
              <FormattedMessage
                id="biorepository.verification.shipment"
                defaultMessage="Shipment:"
              />
            </strong>{" "}
            {shipment.deliveryReference || shipment.id}
          </p>
          {shipment.senderName && (
            <p style={{ fontSize: "0.875rem", color: "#525252" }}>
              <FormattedMessage
                id="biorepository.verification.sender"
                defaultMessage="From:"
              />{" "}
              {shipment.senderName}
            </p>
          )}
        </div>
      )}

      <ProgressBar
        label={intl.formatMessage(
          {
            id: "biorepository.verification.progress",
            defaultMessage: "Verification Progress: {completed} of {total}",
          },
          { completed: completedCount, total: totalItems },
        )}
        value={progress}
        status={isComplete ? "finished" : "active"}
        style={{ marginBottom: "1.5rem" }}
      />

      <Accordion>
        {checklistItems.map((item) => {
          const status = getItemStatus(item.id);
          const checked = getItemChecked(item.id);

          return (
            <AccordionItem
              key={item.id}
              title={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {status === "VERIFIED" && (
                    <Checkmark size={16} style={{ color: "green" }} />
                  )}
                  {status === "PENDING" && (
                    <WarningAlt size={16} style={{ color: "orange" }} />
                  )}
                  {status === "N_A" && <Tag size="sm">N/A</Tag>}
                  <span>{item.label}</span>
                </div>
              }
            >
              <p style={{ marginBottom: "1rem", color: "#525252" }}>
                {item.description}
              </p>

              {item.id === "biosafetyMatch" && (
                <div style={{ marginBottom: "1rem", maxWidth: "20rem" }}>
                  <Dropdown
                    id="verification-biosafety-classification"
                    titleText={intl.formatMessage({
                      id: "biorepository.verification.biosafetyClassification.label",
                      defaultMessage: "Biosafety Classification Level",
                    })}
                    helperText={intl.formatMessage({
                      id: "biorepository.verification.biosafetyClassification.helper",
                      defaultMessage:
                        "Select the classification level documented for this shipment (e.g. Marburg Virus → Level 3)",
                    })}
                    items={biosafetyLevels}
                    itemToString={(level) => (level ? level.text : "")}
                    selectedItem={
                      biosafetyLevels.find(
                        (level) => level.id === biosafetyClassification,
                      ) || null
                    }
                    onChange={({ selectedItem }) =>
                      handleBiosafetyClassificationChange(selectedItem?.id)
                    }
                  />
                </div>
              )}

              {item.allowNA ? (
                <RadioButtonGroup
                  name={`verification-${item.id}`}
                  valueSelected={status}
                  onChange={(value) => {
                    if (value === "VERIFIED") {
                      handleItemChange(item.id, true, false);
                    } else if (value === "N_A") {
                      handleItemChange(item.id, false, true, "Not applicable");
                    } else {
                      handleItemChange(item.id, false, false);
                    }
                  }}
                  orientation="horizontal"
                >
                  <RadioButton
                    id={`${item.id}-verified`}
                    labelText={intl.formatMessage({
                      id: "biorepository.verification.status.verified",
                      defaultMessage: "Verified",
                    })}
                    value="VERIFIED"
                  />
                  <RadioButton
                    id={`${item.id}-na`}
                    labelText={intl.formatMessage({
                      id: "biorepository.verification.status.na",
                      defaultMessage: "N/A",
                    })}
                    value="N_A"
                  />
                  <RadioButton
                    id={`${item.id}-pending`}
                    labelText={intl.formatMessage({
                      id: "biorepository.verification.status.pending",
                      defaultMessage: "Pending",
                    })}
                    value="PENDING"
                  />
                </RadioButtonGroup>
              ) : (
                <Checkbox
                  id={`verification-${item.id}`}
                  labelText={intl.formatMessage({
                    id: "biorepository.verification.checkbox.verified",
                    defaultMessage: "Verified",
                  })}
                  checked={checked}
                  disabled={
                    item.id === "biosafetyMatch" && !biosafetyClassification
                  }
                  onChange={(e, { checked }) =>
                    handleItemChange(item.id, checked)
                  }
                />
              )}
            </AccordionItem>
          );
        })}
      </Accordion>

      <TextArea
        id="verification-additional-info"
        labelText={intl.formatMessage({
          id: "biorepository.verification.additionalInfo.label",
          defaultMessage: "Additional Information",
        })}
        helperText={intl.formatMessage({
          id: "biorepository.verification.additionalInfo.helper",
          defaultMessage: "Optional — add any extra documentation notes",
        })}
        value={additionalInfo}
        onChange={(e) => setAdditionalInfo(e.target.value)}
        onBlur={handleNotesBlur}
        rows={3}
        style={{ marginTop: "1.5rem" }}
      />

      {!isComplete && (
        <div style={{ marginTop: "1.5rem" }}>
          <InlineNotification
            kind="warning"
            title={intl.formatMessage({
              id: "biorepository.verification.incomplete.title",
              defaultMessage: "Verification Incomplete",
            })}
            subtitle={intl.formatMessage({
              id: "biorepository.verification.incomplete.message",
              defaultMessage:
                "All checklist items must be verified before completing. If verification cannot be completed, consider quarantining the shipment.",
            })}
            lowContrast
            hideCloseButton
          />
        </div>
      )}

      <ESignatureModal {...completeSignatureModalProps} />
    </Modal>
  );
}

DocumentationVerificationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shipment: PropTypes.object,
  onVerificationComplete: PropTypes.func,
};

export default DocumentationVerificationModal;
