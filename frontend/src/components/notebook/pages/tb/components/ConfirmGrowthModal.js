import { useState } from "react";
import {
  Modal,
  Select,
  SelectItem,
  TextArea,
  InlineNotification,
  Grid,
  Column,
  Tag,
} from "@carbon/react";
import { Warning } from "@carbon/react/icons";
import { FormattedMessage, useIntl } from "react-intl";

/**
 * ConfirmGrowthModal - Confirmation step for culture growth detection.
 *
 * Shown when a GROWTH_DETECTED observation is recorded. Forces the user to
 * explicitly select the confirmed result type and optionally add notes before
 * the culture is finalized.
 *
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Called when the modal is dismissed
 * @param {function} onConfirm - Called with { confirmedResult, confirmationNotes }
 * @param {object} sample - The sample being confirmed (accessionNumber, weekNumber)
 * @param {boolean} isSaving - Whether the confirmation is being saved
 */
function ConfirmGrowthModal({ open, onClose, onConfirm, sample, isSaving }) {
  const intl = useIntl();
  const [confirmedResult, setConfirmedResult] = useState("POSITIVE");
  const [confirmationNotes, setConfirmationNotes] = useState("");

  const handleSubmit = () => {
    onConfirm({ confirmedResult, confirmationNotes });
  };

  const handleClose = () => {
    setConfirmedResult("POSITIVE");
    setConfirmationNotes("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading={intl.formatMessage({
        id: "notebook.tb.incubation.confirmGrowth.title",
        defaultMessage: "Confirm Culture Growth",
      })}
      primaryButtonText={
        isSaving
          ? intl.formatMessage({
              id: "label.saving",
              defaultMessage: "Saving...",
            })
          : intl.formatMessage({
              id: "notebook.tb.incubation.confirmGrowth.confirm",
              defaultMessage: "Confirm Growth",
            })
      }
      secondaryButtonText={intl.formatMessage({
        id: "label.cancel",
        defaultMessage: "Cancel",
      })}
      onRequestSubmit={handleSubmit}
      onSecondarySubmit={handleClose}
      primaryButtonDisabled={isSaving}
      size="sm"
      danger
    >
      <div style={{ padding: "0 0 1rem 0" }}>
        {/* Warning banner */}
        <InlineNotification
          kind="warning"
          title={intl.formatMessage({
            id: "notebook.tb.incubation.confirmGrowth.warning.title",
            defaultMessage: "Growth Detected",
          })}
          subtitle={intl.formatMessage(
            {
              id: "notebook.tb.incubation.confirmGrowth.warning.subtitle",
              defaultMessage:
                "Growth was observed for sample {accession} at week {week}. Please confirm the final result before it is recorded.",
            },
            {
              accession: sample?.accessionNumber || "-",
              week: sample?.weekNumber || "-",
            },
          )}
          hideCloseButton
          lowContrast
          style={{ marginBottom: "1.5rem" }}
        />

        <Grid fullWidth>
          {/* Sample info */}
          <Column lg={16} md={8} sm={4} style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#525252" }}>
                <FormattedMessage
                  id="notebook.tb.incubation.confirmGrowth.sample"
                  defaultMessage="Sample:"
                />
              </span>
              <Tag type="blue" size="sm">
                {sample?.accessionNumber || "-"}
              </Tag>
              <Tag type="teal" size="sm">
                <Warning size={12} style={{ marginRight: "4px" }} />
                <FormattedMessage
                  id="notebook.tb.incubation.confirmGrowth.weekLabel"
                  defaultMessage="Week {week}"
                  values={{ week: sample?.weekNumber || "-" }}
                />
              </Tag>
            </div>
          </Column>

          {/* Confirmed result selector */}
          <Column lg={16} md={8} sm={4} style={{ marginBottom: "1rem" }}>
            <Select
              id="confirmedResult"
              labelText={intl.formatMessage({
                id: "notebook.tb.incubation.confirmGrowth.resultLabel",
                defaultMessage: "Confirmed Result *",
              })}
              value={confirmedResult}
              onChange={(e) => setConfirmedResult(e.target.value)}
            >
              <SelectItem
                value="POSITIVE"
                text={intl.formatMessage({
                  id: "notebook.tb.incubation.confirmGrowth.result.positive",
                  defaultMessage: "POSITIVE – MTB growth confirmed",
                })}
              />
              <SelectItem
                value="NTM"
                text={intl.formatMessage({
                  id: "notebook.tb.incubation.confirmGrowth.result.ntm",
                  defaultMessage: "NTM – Non-Tuberculous Mycobacteria",
                })}
              />
              <SelectItem
                value="CONTAMINATED"
                text={intl.formatMessage({
                  id: "notebook.tb.incubation.confirmGrowth.result.contaminated",
                  defaultMessage: "CONTAMINATED – Culture contaminated",
                })}
              />
            </Select>
          </Column>

          {/* Confirmation notes */}
          <Column lg={16} md={8} sm={4}>
            <TextArea
              id="confirmationNotes"
              labelText={intl.formatMessage({
                id: "notebook.tb.incubation.confirmGrowth.notesLabel",
                defaultMessage: "Confirmation Notes (optional)",
              })}
              placeholder={intl.formatMessage({
                id: "notebook.tb.incubation.confirmGrowth.notesPlaceholder",
                defaultMessage:
                  "Add any observations or remarks about this confirmation...",
              })}
              value={confirmationNotes}
              onChange={(e) => setConfirmationNotes(e.target.value)}
              rows={3}
            />
          </Column>
        </Grid>
      </div>
    </Modal>
  );
}

export default ConfirmGrowthModal;
