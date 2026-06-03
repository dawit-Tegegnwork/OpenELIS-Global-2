import { useMemo } from "react";
import {
  NOTEBOOK_STAGE_ACTIONS,
  resolvePageAllowedRoles,
  resolvePageKey,
} from "../constants/ahriWorkflowRegistry";

/**
 * SRS workflow stage personas for the current notebook page.
 */
export function useStagePersonas(
  workflowType,
  pageData,
  action = NOTEBOOK_STAGE_ACTIONS.EDIT,
  pageIndex = null,
) {
  return useMemo(() => {
    if (!workflowType || !pageData) {
      return [];
    }
    const order =
      pageData.order ??
      pageData.pageOrder ??
      (pageIndex != null ? pageIndex + 1 : 1);
    return resolvePageAllowedRoles(
      workflowType,
      {
        ...pageData,
        order,
        pageOrder: order,
        pageKey: pageData.pageKey ?? resolvePageKey(pageData),
      },
      action,
    );
  }, [workflowType, pageData, action, pageIndex]);
}

export { NOTEBOOK_STAGE_ACTIONS };

export default useStagePersonas;
