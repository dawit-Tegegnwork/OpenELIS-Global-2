import React, { useState, useCallback } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  TextArea,
  NumberInput,
  RadioButtonGroup,
  RadioButton,
  FileUploader,
  Button,
  InlineNotification,
  Loading,
  Grid,
  Column,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { FormattedMessage, useIntl } from "react-intl";
import PropTypes from "prop-types";
import { postToOpenElisServerJsonResponse } from "../../../utils/Utils";
import ShipmentListTable from "./ShipmentListTable";

/**
 * ShipmentReceptionForm - Form for receiving incoming shipments
 * Sub-stage 1a of the Biorepository Intake workflow
 *
 * Features:
 * - View existing shipments in a table
 * - Receive new shipments
 * - Select existing shipment to continue workflow
 *
 * @param {Object} props
 * @param {Function} props.onShipmentCreated - Callback when shipment is successfully created
 * @param {Function} props.onShipmentSelected - Callback when an existing shipment is selected
 * @param {Function} props.onCancel - Callback to cancel the form
 */
function ShipmentReceptionForm({
  onShipmentCreated,
  onShipmentSelected,
  onCancel,
  selectedShipmentId,
  refreshKey = 0,
}) {
  const intl = useIntl();

  // View state: 'list' or 'form'
  const [viewMode, setViewMode] = useState("list");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    deliveryReference: "",
    senderName: "",
    senderOrganization: "",
    packagingCondition: "INTACT",
    packagingConditionNotes: "",
    transportTemperature: null,
    expectedSampleCount: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Validation state
  const [errors, setErrors] = useState({});

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.deliveryReference.trim()) {
      newErrors.deliveryReference = intl.formatMessage({
        id: "biorepository.shipment.error.deliveryReference.required",
        defaultMessage: "Delivery reference is required",
      });
    }

    if (!formData.senderName.trim()) {
      newErrors.senderName = intl.formatMessage({
        id: "biorepository.shipment.error.senderName.required",
        defaultMessage: "Sender name is required",
      });
    }

    if (
      formData.packagingCondition === "DAMAGED" &&
      !formData.packagingConditionNotes.trim()
    ) {
      newErrors.packagingConditionNotes = intl.formatMessage({
        id: "biorepository.shipment.error.packagingNotes.required",
        defaultMessage: "Please describe the packaging damage",
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, intl]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setError(null);

      const shipmentData = {
        deliveryReference: formData.deliveryReference.trim(),
        senderName: formData.senderName.trim(),
        senderOrganization: formData.senderOrganization.trim() || null,
        packagingCondition: formData.packagingCondition,
        packagingConditionNotes:
          formData.packagingConditionNotes.trim() || null,
        transportTemperature: formData.transportTemperature,
        expectedSampleCount: formData.expectedSampleCount,
      };

      postToOpenElisServerJsonResponse(
        "/rest/biorepository/shipment/receive",
        JSON.stringify(shipmentData),
        (response) => {
          setLoading(false);
          if (response.error) {
            setError(response.error);
          } else {
            setListRefreshKey((k) => k + 1);
            setViewMode("list");
            setFormData({
              deliveryReference: "",
              senderName: "",
              senderOrganization: "",
              packagingCondition: "INTACT",
              packagingConditionNotes: "",
              transportTemperature: null,
              expectedSampleCount: null,
            });
            if (onShipmentCreated) {
              onShipmentCreated(response);
            }
          }
        },
      );
    },
    [formData, validateForm, onShipmentCreated],
  );

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  }, []);

  const handleSelectShipment = useCallback(
    (shipment) => {
      if (onShipmentSelected) {
        onShipmentSelected(shipment);
      }
    },
    [onShipmentSelected],
  );

  // List view with existing shipments
  if (viewMode === "list") {
    return (
      <div className="shipment-reception-list">
        <Grid>
          <Column lg={16} md={8} sm={4}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h4>
                <FormattedMessage
                  id="biorepository.shipment.list.title"
                  defaultMessage="Recent Shipments"
                />
              </h4>
              <Button
                kind="primary"
                size="md"
                renderIcon={Add}
                onClick={() => setViewMode("form")}
              >
                <FormattedMessage
                  id="biorepository.shipment.button.newShipment"
                  defaultMessage="Receive New Shipment"
                />
              </Button>
            </div>
          </Column>

          <Column lg={16} md={8} sm={4}>
            <ShipmentListTable
              onSelect={handleSelectShipment}
              selectedShipmentId={selectedShipmentId}
              showDocStatus
              refreshKey={refreshKey + listRefreshKey}
            />
          </Column>
        </Grid>
      </div>
    );
  }

  // Form view for receiving new shipment
  return (
    <Form onSubmit={handleSubmit} className="shipment-reception-form">
      {loading && <Loading withOverlay description="Processing..." />}

      <Grid>
        <Column lg={16} md={8} sm={4}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h4>
              <FormattedMessage
                id="biorepository.shipment.form.title"
                defaultMessage="Receive New Shipment"
              />
            </h4>
            <Button kind="ghost" size="sm" onClick={() => setViewMode("list")}>
              <FormattedMessage
                id="biorepository.shipment.button.backToList"
                defaultMessage="Back to List"
              />
            </Button>
          </div>
        </Column>
      </Grid>

      {error && (
        <InlineNotification
          kind="error"
          title={intl.formatMessage({
            id: "biorepository.shipment.error.title",
            defaultMessage: "Error",
          })}
          subtitle={error}
          lowContrast
          onClose={() => setError(null)}
        />
      )}

      <Grid>
        <Column lg={8} md={4} sm={4}>
          <FormGroup legendText="">
            <TextInput
              id="deliveryReference"
              labelText={intl.formatMessage({
                id: "biorepository.shipment.field.deliveryReference",
                defaultMessage: "Delivery Reference *",
              })}
              placeholder={intl.formatMessage({
                id: "biorepository.shipment.field.deliveryReference.placeholder",
                defaultMessage: "Enter tracking number or delivery reference",
              })}
              value={formData.deliveryReference}
              onChange={(e) =>
                handleInputChange("deliveryReference", e.target.value)
              }
              invalid={!!errors.deliveryReference}
              invalidText={errors.deliveryReference}
            />
          </FormGroup>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <FormGroup legendText="">
            <TextInput
              id="senderName"
              labelText={intl.formatMessage({
                id: "biorepository.shipment.field.senderName",
                defaultMessage: "Sender Name *",
              })}
              placeholder={intl.formatMessage({
                id: "biorepository.shipment.field.senderName.placeholder",
                defaultMessage: "Enter sender's name",
              })}
              value={formData.senderName}
              onChange={(e) => handleInputChange("senderName", e.target.value)}
              invalid={!!errors.senderName}
              invalidText={errors.senderName}
            />
          </FormGroup>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <FormGroup legendText="">
            <TextInput
              id="senderOrganization"
              labelText={intl.formatMessage({
                id: "biorepository.shipment.field.senderOrganization",
                defaultMessage: "Sender Organization",
              })}
              placeholder={intl.formatMessage({
                id: "biorepository.shipment.field.senderOrganization.placeholder",
                defaultMessage: "Enter sending organization (optional)",
              })}
              value={formData.senderOrganization}
              onChange={(e) =>
                handleInputChange("senderOrganization", e.target.value)
              }
            />
          </FormGroup>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <FormGroup legendText="">
            <NumberInput
              id="expectedSampleCount"
              label={intl.formatMessage({
                id: "biorepository.shipment.field.expectedSampleCount",
                defaultMessage: "Expected Sample Count",
              })}
              min={0}
              value={formData.expectedSampleCount || ""}
              onChange={(e, { value }) =>
                handleInputChange("expectedSampleCount", value)
              }
              allowEmpty
            />
          </FormGroup>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <FormGroup legendText="">
            <NumberInput
              id="transportTemperature"
              label={intl.formatMessage({
                id: "biorepository.shipment.field.transportTemperature",
                defaultMessage: "Transport Temperature (°C)",
              })}
              step={0.1}
              value={formData.transportTemperature || ""}
              onChange={(e, { value }) =>
                handleInputChange("transportTemperature", value)
              }
              allowEmpty
            />
          </FormGroup>
        </Column>

        <Column lg={16} md={8} sm={4}>
          <FormGroup
            legendText={intl.formatMessage({
              id: "biorepository.shipment.field.packagingCondition",
              defaultMessage: "Packaging Condition *",
            })}
          >
            <RadioButtonGroup
              name="packagingCondition"
              valueSelected={formData.packagingCondition}
              onChange={(value) =>
                handleInputChange("packagingCondition", value)
              }
              orientation="horizontal"
            >
              <RadioButton
                id="packaging-intact"
                labelText={intl.formatMessage({
                  id: "biorepository.shipment.packagingCondition.intact",
                  defaultMessage: "Intact",
                })}
                value="INTACT"
              />
              <RadioButton
                id="packaging-damaged"
                labelText={intl.formatMessage({
                  id: "biorepository.shipment.packagingCondition.damaged",
                  defaultMessage: "Damaged",
                })}
                value="DAMAGED"
              />
            </RadioButtonGroup>
          </FormGroup>
        </Column>

        {formData.packagingCondition === "DAMAGED" && (
          <>
            <Column lg={16} md={8} sm={4}>
              <FormGroup legendText="">
                <TextArea
                  id="packagingConditionNotes"
                  labelText={intl.formatMessage({
                    id: "biorepository.shipment.field.packagingNotes",
                    defaultMessage: "Packaging Damage Description *",
                  })}
                  placeholder={intl.formatMessage({
                    id: "biorepository.shipment.field.packagingNotes.placeholder",
                    defaultMessage: "Describe the packaging damage in detail",
                  })}
                  value={formData.packagingConditionNotes}
                  onChange={(e) =>
                    handleInputChange("packagingConditionNotes", e.target.value)
                  }
                  invalid={!!errors.packagingConditionNotes}
                  invalidText={errors.packagingConditionNotes}
                  rows={3}
                />
              </FormGroup>
            </Column>

            <Column lg={16} md={8} sm={4}>
              <FormGroup legendText="">
                <FileUploader
                  labelTitle={intl.formatMessage({
                    id: "biorepository.shipment.field.packagingPhoto",
                    defaultMessage: "Packaging Photo",
                  })}
                  labelDescription={intl.formatMessage({
                    id: "biorepository.shipment.field.packagingPhoto.description",
                    defaultMessage:
                      "Upload a photo of the damaged packaging (optional)",
                  })}
                  buttonLabel={intl.formatMessage({
                    id: "biorepository.shipment.field.packagingPhoto.button",
                    defaultMessage: "Add file",
                  })}
                  accept={[".jpg", ".jpeg", ".png"]}
                  multiple={false}
                  onChange={handleFileChange}
                />
              </FormGroup>
            </Column>
          </>
        )}

        <Column lg={16} md={8} sm={4}>
          <div
            className="form-actions"
            style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}
          >
            <Button type="submit" disabled={loading}>
              <FormattedMessage
                id="biorepository.shipment.button.receive"
                defaultMessage="Receive Shipment"
              />
            </Button>
            <Button
              kind="secondary"
              onClick={() => setViewMode("list")}
              disabled={loading}
            >
              <FormattedMessage
                id="biorepository.button.cancel"
                defaultMessage="Cancel"
              />
            </Button>
          </div>
        </Column>
      </Grid>
    </Form>
  );
}

ShipmentReceptionForm.propTypes = {
  onShipmentCreated: PropTypes.func,
  onShipmentSelected: PropTypes.func,
  onCancel: PropTypes.func,
  selectedShipmentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  refreshKey: PropTypes.number,
};

export default ShipmentReceptionForm;
