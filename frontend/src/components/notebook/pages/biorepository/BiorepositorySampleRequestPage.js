import React, { useState, useCallback, useEffect } from "react";
import {
  Grid,
  Column,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
} from "@carbon/react";
import { Inbox, InProgress, Time, DocumentPdf } from "@carbon/icons-react";
import { FormattedMessage, useIntl } from "react-intl";
import PropTypes from "prop-types";
import { getFromOpenElisServer } from "../../../utils/Utils";
import IncomingRequestsTab from "./IncomingRequestsTab";
import ActiveRetrievalsTab from "./ActiveRetrievalsTab";
import RetrievalHistoryTab from "./RetrievalHistoryTab";
import RetrievalPrintTab from "./RetrievalPrintTab";

/**
 * BiorepositorySampleRequestPage - Sample Request & Retrieval workflow page
 * Stage 4 of the Biorepository workflow
 *
 * Tabs:
 * 1. New Request - Incoming department requests (Accept/Reject)
 * 2. Active Retrievals - Track checked-out samples
 * 3. History - Past requests
 * 4. Print - Export retrieval transactions to PDF
 */
function BiorepositorySampleRequestPage({
  entryId,
  pageData,
  progress,
  onProgressUpdate,
  notebookId,
}) {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    inProgress: 0,
    partiallyCompleted: 0,
    checkedOutCount: 0,
    overdueCount: 0,
  });

  const loadStats = useCallback(() => {
    getFromOpenElisServer("/rest/biorepository/retrieval/stats", (data) => {
      if (data && !data.error) {
        setStats(data);
      }
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = useCallback(() => {
    loadStats();
    setRefreshToken((token) => token + 1);
  }, [loadStats]);

  const activeQueueCount =
    Number(stats.approved ?? 0) +
    Number(stats.inProgress ?? 0) +
    Number(stats.partiallyCompleted ?? 0);

  return (
    <div className="biorepository-sample-request-page">
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <div className="page-header" style={{ marginBottom: "1rem" }}>
            <h3>
              <FormattedMessage
                id="biorepository.retrieval.title"
                defaultMessage="Sample Request & Retrieval"
              />
            </h3>
            <p style={{ color: "#525252", marginTop: "0.5rem" }}>
              <FormattedMessage
                id="biorepository.retrieval.description"
                defaultMessage="Review incoming sample requests from other departments and accept or reject them."
              />
            </p>
          </div>

          <Tabs
            selectedIndex={activeTab}
            onChange={({ selectedIndex }) => setActiveTab(selectedIndex)}
          >
            <TabList aria-label="Retrieval workflow tabs">
              <Tab renderIcon={Inbox}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FormattedMessage
                    id="biorepository.retrieval.tab.request"
                    defaultMessage="New Request"
                  />
                  {stats.pending > 0 && (
                    <Tag type="blue" size="sm">
                      {stats.pending}
                    </Tag>
                  )}
                </span>
              </Tab>
              <Tab renderIcon={InProgress}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FormattedMessage
                    id="biorepository.retrieval.tab.active"
                    defaultMessage="Active Retrievals"
                  />
                  {activeQueueCount > 0 && (
                    <Tag type="green" size="sm">
                      {activeQueueCount}
                    </Tag>
                  )}
                  {stats.overdueCount > 0 && (
                    <Tag type="red" size="sm">
                      {stats.overdueCount}{" "}
                      {intl.formatMessage({
                        id: "biorepository.retrieval.overdue",
                        defaultMessage: "overdue",
                      })}
                    </Tag>
                  )}
                </span>
              </Tab>
              <Tab renderIcon={Time}>
                <FormattedMessage
                  id="biorepository.retrieval.tab.history"
                  defaultMessage="History"
                />
              </Tab>
              <Tab renderIcon={DocumentPdf}>
                <FormattedMessage
                  id="biorepository.retrieval.tab.print"
                  defaultMessage="Print"
                />
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <IncomingRequestsTab
                  onActionComplete={handleRefresh}
                  onAccepted={() => setActiveTab(1)}
                />
              </TabPanel>

              <TabPanel>
                <ActiveRetrievalsTab
                  onActionComplete={handleRefresh}
                  refreshToken={refreshToken}
                />
              </TabPanel>

              <TabPanel>
                <RetrievalHistoryTab
                  onActionComplete={handleRefresh}
                  refreshToken={refreshToken}
                />
              </TabPanel>

              <TabPanel>
                <RetrievalPrintTab refreshToken={refreshToken} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Column>
      </Grid>
    </div>
  );
}

BiorepositorySampleRequestPage.propTypes = {
  entryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pageData: PropTypes.object,
  progress: PropTypes.object,
  onProgressUpdate: PropTypes.func,
  notebookId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default BiorepositorySampleRequestPage;
