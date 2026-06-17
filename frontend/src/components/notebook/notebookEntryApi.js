import config from "../../config.json";

/**
 * List notebook_entry rows for a lab instance.
 */
export function fetchEntriesByNotebook(instanceId) {
  return fetch(
    `${config.serverBaseUrl}/rest/notebook-entry/by-notebook/${instanceId}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "X-CSRF-Token": localStorage.getItem("CSRF"),
      },
    },
  ).then(async (response) => {
    const text = await response.text();
    let data = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch (e) {
      data = [];
    }
    if (!response.ok) {
      const message =
        data?.error || `Failed to load entries (HTTP ${response.status})`;
      throw new Error(message);
    }
    return Array.isArray(data) ? data : [];
  });
}

/**
 * Create a notebook_entry under a lab instance.
 */
export function createNotebookEntry(instanceId, title) {
  const params = new URLSearchParams({ notebookId: String(instanceId) });
  if (title && title.trim()) {
    params.set("title", title.trim());
  }

  return fetch(
    `${config.serverBaseUrl}/rest/notebook-entry/create?${params.toString()}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": localStorage.getItem("CSRF"),
      },
    },
  ).then(async (response) => {
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = {};
    }
    if (!response.ok) {
      throw new Error(
        data.error || `Failed to create entry (HTTP ${response.status})`,
      );
    }
    return data;
  });
}

export function buildAutoEntryTitle(entryCount, intl) {
  return intl.formatMessage(
    { id: "notebook.entry.number" },
    { number: entryCount + 1 },
  );
}

export function isNotebookChildInstance(notebook, isParent) {
  if (!notebook || isParent) {
    return false;
  }
  return (
    notebook.isChildInstance === true ||
    notebook.childInstance === true ||
    notebook.parentNotebookId != null
  );
}

export function normalizeNotebookSelection(notebook, isParent) {
  if (!notebook) {
    return notebook;
  }
  if (isParent) {
    return notebook;
  }
  return {
    ...notebook,
    isChildInstance: isNotebookChildInstance(notebook, isParent),
    parentNotebookId:
      notebook.parentNotebookId ?? notebook.parentNotebook?.id ?? null,
  };
}
