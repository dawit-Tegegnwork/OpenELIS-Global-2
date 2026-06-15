#!/usr/bin/env python3
"""Verify AHRI go-live department users across all four go-live departments."""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import urllib3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

urllib3.disable_warnings()

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = REPO_ROOT / "docs" / "golive-department-user-uat-results.json"
BACTERIOLOGY_TEMPLATE_CSV = REPO_ROOT / "src/main/resources/templates/bacteriology-sample-import-template.csv"

BASE_URL = os.environ.get("UAT_BASE_URL", "https://localhost")
API = f"{BASE_URL.rstrip('/')}/OpenELIS-Global"

MNTD_MAPPING_JSON = json.dumps(
    {
        "projectNameColumn": "projectName",
        "sampleIdTagColumn": "sampleIdTag",
        "numberOfSamplesColumn": "numberOfSamples",
        "sampleSourceLocationColumn": "sampleSourceLocation",
        "broughtByColumn": "broughtBy",
        "receivedDateTimeColumn": "receivedDateTime",
        "receptionistNameColumn": "receptionistName",
        "sampleTypeColumn": "sampleType",
    }
)

MNTD_CSV = (
    "projectName,sampleType,sampleIdTag,numberOfSamples,"
    "sampleSourceLocation,broughtBy,receivedDateTime,receptionistName\n"
    "UAT Project,Whole Blood,UAT-TAG-001,1,Jimma Zone,Dr UAT,2024-06-15 09:30,Receiver\n"
)

BACTERIOLOGY_MAPPING_JSON = json.dumps(
    {
        "projectNameColumn": "project_name",
        "studyIdColumn": "study_id",
        "participantIdColumn": "participant_id",
        "barcodeColumn": "barcode",
        "collectionSiteColumn": "collection_site",
        "sampleTypeColumn": "sample_type",
        "collectionDateTimeColumn": "collection_date_time",
        "sampleReceivedDateColumn": "sample_received_date",
        "sampleArrivalTimeColumn": "sample_arrival_time",
        "receivedByColumn": "received_by",
        "storageContainerTypeColumn": "storage_container_type",
        "storageTemperatureOnArrivalColumn": "storage_temperature_on_arrival",
        "consentStatusColumn": "consent_status",
        "crfStatusColumn": "crf_status",
        "sampleOriginColumn": "sample_origin",
        "sourceLocationFacilityColumn": "source_location_facility",
    }
)

DEPARTMENT_WORKFLOWS: dict[str, dict[str, Any]] = {
    "mntd": {
        "manifest_path": "/rest/notebook/mntd/entry/{entry_id}/samples/preview-manifest",
        "min_pages": 10,
        "required_page_titles": ["Sample Intake / Sample Creation"],
    },
    "bacteriology": {
        "manifest_path": "/rest/notebook/bacteriology/entry/{entry_id}/samples/preview-manifest",
        "min_pages": 9,
        "required_page_titles": ["Sample Reception", "Isolate Creation"],
    },
    "pathology": {
        "min_pages": 10,
        "required_page_titles": ["Sample Creation & Metadata Capture"],
    },
    "biorepository": {
        "min_pages": 7,
        "required_page_titles": ["Sample Intake & Registration"],
    },
}

GOLIVE_USERS: list[dict[str, str]] = [
    {"username": "tegbar", "password": "tegbarGoLive!", "department": "Malaria and Neglected Tropical Disease (MNTD) Laboratory", "hint": "MNTD", "workflow": "mntd"},
    {"username": "amanuel.shimelis", "password": "amanuel.shimelisGoLive!", "department": "Malaria and Neglected Tropical Disease (MNTD) Laboratory", "hint": "MNTD", "workflow": "mntd"},
    {"username": "saron.fekadu", "password": "saron.fekaduGoLive!", "department": "Malaria and Neglected Tropical Disease (MNTD) Laboratory", "hint": "MNTD", "workflow": "mntd"},
    {"username": "wubalech.temesgen", "password": "wubalech.temesgenGoLive!", "department": "Bacteriology", "hint": "Bacteriology", "workflow": "bacteriology"},
    {"username": "miraf.mekonnen", "password": "miraf.mekonnenGoLive!", "department": "Bacteriology", "hint": "Bacteriology", "workflow": "bacteriology"},
    {"username": "rahel.gebeyehu", "password": "rahel.gebeyehuGoLive!", "department": "Bacteriology", "hint": "Bacteriology", "workflow": "bacteriology"},
    {"username": "mekdes.alemu", "password": "mekdes.alemuGoLive!", "department": "Bacteriology", "hint": "Bacteriology", "workflow": "bacteriology"},
    {"username": "sofia.yimam", "password": "sofia.yimamGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "endegena.abebe", "password": "endegena.abebeGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "hana.beliye", "password": "hana.beliyeGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "ehite.getu", "password": "ehite.getuGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "guta.negewo", "password": "guta.negewoGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "bethelihem.nigussie", "password": "bethelihem.nigussieGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "menal.hassen", "password": "menal.hassenGoLive!", "department": "Pathology Laboratory", "hint": "Pathology", "workflow": "pathology"},
    {"username": "muhidin.awol", "password": "muhidin.awolGoLive!", "department": "Biorepository Laboratory", "hint": "Biorepository", "workflow": "biorepository"},
    {"username": "abay.atnafu", "password": "abay.atnafuGoLive!", "department": "Biorepository Laboratory", "hint": "Biorepository", "workflow": "biorepository"},
]

USER_BY_NAME = {u["username"]: u for u in GOLIVE_USERS}
SPOT_CHECK_USERS = {"tegbar", "wubalech.temesgen", "sofia.yimam", "muhidin.awol"}

EXPECTED_PROJECT_ROLES = {"Principal Investigator"}
EXPECTED_GLOBAL_ROLES = {"Audit Trail"}
EXPECTED_LAB_ROLE_COUNT = 6


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class UserReport:
    username: str
    department: str
    checks: list[CheckResult] = field(default_factory=list)
    passed: bool = False


@dataclass
class UatReport:
    started: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    base_url: str = BASE_URL
    users: list[dict[str, Any]] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"started": self.started, "base_url": self.base_url, "users": self.users, "summary": self.summary}


def login(session: requests.Session, username: str, password: str) -> CheckResult:
    response = session.post(f"{API}/ValidateLogin?apiCall=true", data={"loginName": username, "password": password}, timeout=90)
    if response.status_code != 200:
        return CheckResult("login", False, f"HTTP {response.status_code}")
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("login", False, "Non-JSON login response")
    if not payload.get("success"):
        return CheckResult("login", False, str(payload)[:200])
    return CheckResult("login", True, "success")


def set_login_lab_unit(session: requests.Session, test_section_id: str) -> CheckResult:
    response = session.post(f"{API}/rest/setUserLoginLabUnit/{test_section_id}", timeout=90)
    if response.status_code != 200:
        return CheckResult("set_login_lab_unit", False, f"HTTP {response.status_code}")
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("set_login_lab_unit", False, "Non-JSON response")
    if not payload.get("success"):
        return CheckResult("set_login_lab_unit", False, str(payload)[:200])
    return CheckResult("set_login_lab_unit", True, str(payload.get("loginLabUnit", test_section_id)))


def resolve_test_section_id(session: requests.Session, department_name: str) -> str | None:
    response = session.get(f"{API}/rest/displayList/TEST_SECTION_ACTIVE", timeout=90)
    if response.status_code != 200:
        return None
    try:
        rows = response.json()
    except json.JSONDecodeError:
        return None
    best_id, best_score = None, -1
    for row in rows or []:
        value = (row.get("value") or "").strip()
        row_id = str(row.get("id") or "").strip()
        if not row_id:
            continue
        score = 100 if value == department_name else 80 if department_name.lower() in value.lower() else 70 if value.lower() in department_name.lower() else -1
        if score > best_score:
            best_score, best_id = score, row_id
    return best_id


def fetch_session(session: requests.Session) -> dict[str, Any] | None:
    response = session.get(f"{API}/session", timeout=90)
    if response.status_code != 200:
        return None
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return None
    return payload if payload.get("authenticated") else None


def check_session_roles(session_payload: dict[str, Any] | None) -> CheckResult:
    if not session_payload:
        return CheckResult("session_roles", False, "Session not authenticated")
    roles = {str(role).strip() for role in (session_payload.get("roles") or [])}
    missing_project = sorted(EXPECTED_PROJECT_ROLES - roles)
    missing_global = sorted(EXPECTED_GLOBAL_ROLES - roles)
    if missing_project or missing_global:
        parts = []
        if missing_project:
            parts.append(f"missing project roles: {', '.join(missing_project)}")
        if missing_global:
            parts.append(f"missing global roles: {', '.join(missing_global)}")
        return CheckResult("session_roles", False, "; ".join(parts))
    return CheckResult("session_roles", True, ", ".join(sorted(EXPECTED_PROJECT_ROLES | EXPECTED_GLOBAL_ROLES)))


def check_lab_unit_roles(session_payload: dict[str, Any] | None, test_section_id: str) -> CheckResult:
    if not session_payload:
        return CheckResult("lab_unit_roles", False, "Session not authenticated")
    lab_map = session_payload.get("userLabRolesMap") or {}
    role_names: list[str] = []
    for key, values in lab_map.items():
        if str(key).strip() == str(test_section_id).strip():
            role_names = [str(value).strip() for value in values or []]
            break
    if not role_names:
        return CheckResult("lab_unit_roles", False, f"No lab roles for test section {test_section_id}")
    unique_roles = sorted({name for name in role_names if name})
    if len(unique_roles) < EXPECTED_LAB_ROLE_COUNT:
        return CheckResult("lab_unit_roles", False, f"Expected {EXPECTED_LAB_ROLE_COUNT}, got {len(unique_roles)}: {unique_roles}")
    return CheckResult("lab_unit_roles", True, f"{len(unique_roles)} roles on section {test_section_id}")


def check_hierarchy(session: requests.Session, hint: str) -> tuple[CheckResult, int | None]:
    response = session.get(f"{API}/rest/notebook/hierarchy", timeout=90)
    if response.status_code != 200:
        return CheckResult("notebook_hierarchy", False, f"HTTP {response.status_code}"), None
    try:
        hierarchy = response.json()
    except json.JSONDecodeError:
        return CheckResult("notebook_hierarchy", False, "Non-JSON hierarchy"), None
    matches = [n for n in hierarchy or [] if hint.lower() in (n.get("title") or "").lower()]
    if not matches:
        titles = [n.get("title") for n in hierarchy or []]
        return CheckResult("notebook_hierarchy", False, f"No notebook matching '{hint}'. Visible: {titles[:8]}"), None
    notebook_id = matches[0].get("id")
    return CheckResult("notebook_hierarchy", True, matches[0].get("title", hint)), int(notebook_id) if notebook_id is not None else None


def check_create_instance(session: requests.Session, notebook_id: int | None) -> tuple[CheckResult, int | None]:
    if notebook_id is None:
        return CheckResult("create_lab_instance", False, "No notebook id"), None
    response = session.post(
        f"{API}/rest/notebook/{notebook_id}/instances",
        json={"title": f"UAT Go-Live {notebook_id}"},
        timeout=90,
    )
    if response.status_code == 403:
        return CheckResult("create_lab_instance", False, "HTTP 403"), None
    if response.status_code not in (200, 201):
        return CheckResult("create_lab_instance", False, f"HTTP {response.status_code}"), None
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("create_lab_instance", False, "Non-JSON response"), None
    child_id = payload.get("id")
    if child_id:
        return CheckResult("create_lab_instance", True, f"id={child_id}"), int(child_id)
    return CheckResult("create_lab_instance", False, str(payload)[:200]), None


def ensure_notebook_entry(session: requests.Session, child_notebook_id: int) -> tuple[CheckResult, int | None]:
    response = session.get(f"{API}/rest/notebook-entry/by-notebook/{child_notebook_id}", timeout=90)
    if response.status_code == 200:
        try:
            entries = response.json()
        except json.JSONDecodeError:
            entries = []
        if isinstance(entries, list) and entries and entries[0].get("id") is not None:
            return CheckResult("ensure_notebook_entry", True, f"existing id={entries[0]['id']}"), int(entries[0]["id"])

    create_response = session.post(
        f"{API}/rest/notebook-entry/create",
        params={"notebookId": child_notebook_id, "title": "UAT Entry"},
        timeout=90,
    )
    if create_response.status_code not in (200, 201):
        return CheckResult("ensure_notebook_entry", False, f"HTTP {create_response.status_code}"), None
    try:
        payload = create_response.json()
    except json.JSONDecodeError:
        return CheckResult("ensure_notebook_entry", False, "Non-JSON response"), None
    entry_id = payload.get("id")
    if entry_id is None:
        return CheckResult("ensure_notebook_entry", False, str(payload)[:200]), None
    return CheckResult("ensure_notebook_entry", True, f"created id={entry_id}"), int(entry_id)


def check_workflow_pages(session: requests.Session, child_notebook_id: int | None, workflow: str) -> CheckResult:
    if child_notebook_id is None:
        return CheckResult("workflow_pages", False, "No child notebook id")
    cfg = DEPARTMENT_WORKFLOWS.get(workflow, {})
    response = session.get(f"{API}/rest/notebook/view/{child_notebook_id}", timeout=90)
    if response.status_code != 200:
        return CheckResult("workflow_pages", False, f"HTTP {response.status_code}")
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("workflow_pages", False, "Non-JSON response")
    pages = payload.get("pages") or []
    titles = [str(page.get("title") or "").strip() for page in pages]
    min_pages = int(cfg.get("min_pages", 1))
    if len(pages) < min_pages:
        return CheckResult("workflow_pages", False, f"Expected >= {min_pages} pages, got {len(pages)}")
    missing = [title for title in cfg.get("required_page_titles", []) if title not in titles]
    if missing:
        return CheckResult("workflow_pages", False, f"Missing pages: {missing}")
    return CheckResult("workflow_pages", True, f"{len(pages)} pages including {', '.join(cfg.get('required_page_titles', []))}")


def _manifest_csv(workflow: str) -> str:
    if workflow == "bacteriology" and BACTERIOLOGY_TEMPLATE_CSV.exists():
        lines = BACTERIOLOGY_TEMPLATE_CSV.read_text(encoding="utf-8").splitlines()
        return "\n".join(lines[:2]) + "\n"
    return MNTD_CSV


def _manifest_mapping(workflow: str) -> str:
    return BACTERIOLOGY_MAPPING_JSON if workflow == "bacteriology" else MNTD_MAPPING_JSON


def check_manifest_preview(session: requests.Session, entry_id: int | None, workflow: str) -> CheckResult:
    if entry_id is None:
        return CheckResult("manifest_preview", False, "No notebook entry id")
    cfg = DEPARTMENT_WORKFLOWS.get(workflow, {})
    manifest_path = cfg.get("manifest_path")
    if not manifest_path:
        return CheckResult("manifest_preview", True, "skipped (no manifest endpoint)")
    files = {
        "file": (f"{workflow}-uat.csv", io.BytesIO(_manifest_csv(workflow).encode("utf-8")), "text/csv"),
        "mapping": ("mapping.json", io.BytesIO(_manifest_mapping(workflow).encode("utf-8")), "application/json"),
    }
    response = session.post(f"{API}{manifest_path.format(entry_id=entry_id)}", files=files, timeout=120)
    if response.status_code == 403:
        return CheckResult("manifest_preview", False, "HTTP 403 — check workflow registry and login lab unit")
    if response.status_code != 200:
        return CheckResult("manifest_preview", False, f"HTTP {response.status_code}")
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("manifest_preview", False, "Non-JSON response")
    if payload.get("error"):
        return CheckResult("manifest_preview", False, str(payload.get("error"))[:200])
    return CheckResult("manifest_preview", True, f"entry={entry_id} rows={payload.get('totalRows', 0)}")


def verify_user(user_cfg: dict[str, str], *, full_workflow: bool) -> UserReport:
    report = UserReport(username=user_cfg["username"], department=user_cfg["department"])
    session = requests.Session()
    session.verify = False
    report.checks.append(login(session, user_cfg["username"], user_cfg["password"]))
    if not report.checks[-1].ok:
        report.passed = False
        return report

    section_id = resolve_test_section_id(session, user_cfg["department"])
    if not section_id:
        report.checks.append(CheckResult("resolve_test_section", False, f"Could not resolve test section for {user_cfg['department']}"))
        report.passed = False
        return report
    report.checks.append(CheckResult("resolve_test_section", True, section_id))

    session_payload = fetch_session(session)
    report.checks.append(check_session_roles(session_payload))
    report.checks.append(check_lab_unit_roles(session_payload, section_id))
    report.checks.append(set_login_lab_unit(session, section_id))

    hierarchy_check, notebook_id = check_hierarchy(session, user_cfg["hint"])
    report.checks.append(hierarchy_check)

    if full_workflow and notebook_id is not None:
        workflow = user_cfg.get("workflow", "")
        create_check, child_id = check_create_instance(session, notebook_id)
        report.checks.append(create_check)
        if child_id is not None:
            report.checks.append(check_workflow_pages(session, child_id, workflow))
            entry_check, entry_id = ensure_notebook_entry(session, child_id)
            report.checks.append(entry_check)
            if workflow in ("mntd", "bacteriology"):
                report.checks.append(check_manifest_preview(session, entry_id, workflow))

    report.passed = all(check.ok for check in report.checks)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify AHRI go-live department users")
    parser.add_argument("--user", help="Verify one username only")
    parser.add_argument("--all", action="store_true", help="Verify all 16 go-live users (basic checks only)")
    parser.add_argument("--spot-check", action="store_true", help="One user per department with full workflow checks")
    parser.add_argument("--full", action="store_true", help="Run full workflow checks for every selected user")
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="JSON report path")
    args = parser.parse_args()

    if args.user:
        if args.user not in USER_BY_NAME:
            print(f"Unknown user: {args.user}", file=sys.stderr)
            return 1
        users = [USER_BY_NAME[args.user]]
    elif args.spot_check:
        users = [u for u in GOLIVE_USERS if u["username"] in SPOT_CHECK_USERS]
    else:
        users = GOLIVE_USERS

    full_workflow = args.full or args.spot_check or bool(args.user)

    uat = UatReport(base_url=BASE_URL)
    passed_count = 0
    for user_cfg in users:
        result = verify_user(user_cfg, full_workflow=full_workflow)
        uat.users.append(
            {
                "username": result.username,
                "department": result.department,
                "passed": result.passed,
                "checks": [{"name": c.name, "ok": c.ok, "detail": c.detail} for c in result.checks],
            }
        )
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.username}")
        for check in result.checks:
            print(f"  - {check.name}: {'ok' if check.ok else 'FAIL'} ({check.detail})")
        if result.passed:
            passed_count += 1

    uat.summary = {"total": len(users), "passed": passed_count, "failed": len(users) - passed_count, "full_workflow": full_workflow}
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(uat.to_dict(), indent=2) + "\n", encoding="utf-8")
    print(f"\nReport written to {report_path}")
    print(f"Summary: {passed_count}/{len(users)} passed")
    return 0 if passed_count == len(users) else 1


if __name__ == "__main__":
    raise SystemExit(main())
