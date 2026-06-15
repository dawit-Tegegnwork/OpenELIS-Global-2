import {
  extractApiErrorMessage,
  reportModalSaveFailure,
  reportModalSaveSuccess,
} from "./mntdModalErrorHelpers";

describe("mntdModalErrorHelpers", () => {
  describe("extractApiErrorMessage", () => {
    it("returns response.error when present", () => {
      expect(
        extractApiErrorMessage({ error: "Duplicate sample" }, "fallback"),
      ).toBe("Duplicate sample");
    });

    it("returns response.message when error is absent", () => {
      expect(
        extractApiErrorMessage({ message: "Validation failed" }, "fallback"),
      ).toBe("Validation failed");
    });

    it("returns first entry from response.errors array", () => {
      expect(
        extractApiErrorMessage(
          { errors: ["First error", "Second error"] },
          "fallback",
        ),
      ).toBe("First error");
    });

    it("returns fallback for empty response", () => {
      expect(extractApiErrorMessage(null, "Save failed.")).toBe("Save failed.");
      expect(extractApiErrorMessage({}, "Save failed.")).toBe("Save failed.");
    });

    it("returns trimmed string responses", () => {
      expect(extractApiErrorMessage("  Network error  ", "fallback")).toBe(
        "Network error",
      );
    });
  });

  describe("reportModalSaveFailure", () => {
    it("reopens modal, sets modal error, and notifies", () => {
      const reopenModal = jest.fn();
      const setModalError = jest.fn();
      const notifyError = jest.fn();

      reportModalSaveFailure({
        message: "Failed to save extraction data.",
        reopenModal,
        setModalError,
        notifyError,
      });

      expect(reopenModal).toHaveBeenCalledTimes(1);
      expect(setModalError).toHaveBeenCalledWith(
        "Failed to save extraction data.",
      );
      expect(notifyError).toHaveBeenCalledWith(
        "Failed to save extraction data.",
      );
    });

    it("uses default message when message is empty", () => {
      const setModalError = jest.fn();

      reportModalSaveFailure({
        message: "   ",
        setModalError,
      });

      expect(setModalError).toHaveBeenCalledWith("Save failed.");
    });
  });

  describe("reportModalSaveSuccess", () => {
    it("calls notifySuccess with the message", () => {
      const notifySuccess = jest.fn();

      reportModalSaveSuccess({
        message: "Successfully routed 2 samples.",
        notifySuccess,
      });

      expect(notifySuccess).toHaveBeenCalledWith(
        "Successfully routed 2 samples.",
      );
    });

    it("uses default message when message is empty", () => {
      const notifySuccess = jest.fn();

      reportModalSaveSuccess({
        message: "   ",
        notifySuccess,
      });

      expect(notifySuccess).toHaveBeenCalledWith("Saved successfully.");
    });
  });
});
