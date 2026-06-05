import { getRolesForLabUnitKey } from "./routeAccess";

describe("getRolesForLabUnitKey", () => {
  const map = {
    "CTD Department": ["Sample Collector", "Laboratory Technician"],
    AllLabUnits: ["Lab Manager"],
  };

  it("matches CTD aliases when login lab unit is CTD", () => {
    expect(getRolesForLabUnitKey(map, "CTD")).toEqual([
      "Sample Collector",
      "Laboratory Technician",
    ]);
  });

  it("returns direct key when present", () => {
    expect(getRolesForLabUnitKey(map, "AllLabUnits")).toEqual(["Lab Manager"]);
  });
});
