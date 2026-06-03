import React from "react";
import PropTypes from "prop-types";
import { Button, InlineNotification } from "@carbon/react";
import { FormattedMessage } from "react-intl";

class WorkflowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Workflow page render error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleReload = () => {
    this.setState({ error: null });
    if (this.props.onReload) {
      this.props.onReload();
    }
  };

  render() {
    const { error } = this.state;
    const { children, pageTitle } = this.props;

    if (error) {
      const title = pageTitle
        ? `Unable to load ${pageTitle}`
        : "Unable to load workflow page";

      return (
        <div className="workflow-error-boundary" style={{ padding: "1rem" }}>
          <InlineNotification
            kind="error"
            title={title}
            subtitle={
              error?.message ||
              "An unexpected error occurred while rendering this page."
            }
            lowContrast
            hideCloseButton
          />
          <Button
            kind="secondary"
            size="sm"
            style={{ marginTop: "1rem" }}
            onClick={this.handleReload}
          >
            <FormattedMessage
              id="notebook.workflow.pageError.reload"
              defaultMessage="Try again"
            />
          </Button>
        </div>
      );
    }

    return children;
  }
}

WorkflowErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  pageTitle: PropTypes.string,
  resetKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onReload: PropTypes.func,
};

export default WorkflowErrorBoundary;
