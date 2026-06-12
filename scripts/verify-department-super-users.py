#!/usr/bin/env python3
"""Verify AHRI department super-users: login, notebook hierarchy, key APIs."""

from __future__ import annotations

import argparse
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
DEFAULT_REPORT = REPO_ROOT / "docs" / "department-super-user-uat-results.json"

BASE_URL = os.environ.get("UAT_BASE_URL", "https://localhost")
API = f"{BASE_URL.rstrip('/')}/OpenELIS-Global"

# username, password, test_section_name, notebook_title_hint, optional_api
SUPER_USERS: list[dict[str, str]] = [
    {
        "username": "newmntd",
        "password": "newmntdMNTD!",
        "department": "Malaria and Neglected Tropical Disease (MNTD) Laboratory",
        "hint": "MNTD",
        "api": "mntd_page",
    },
    {
        "username": "biorepository",
        "password": "biorepositoryBIO!",
        "department": "Biorepository Laboratory",
        "hint": "Biorepository",
        "api": "none",
    },
    {
        "username": "tblab",
        "password": "tblabTB!",
        "department": "Tuberculosis Laboratory",
        "hint": "Tuberculosis",
        "api": "none",
    },
    {
        "username": "bacteriology",
        "password": "bacteriologyBACTERIOLOGY!",
        "department": "Bacteriology",
        "hint": "Bacteriology",
        "api": "none",
    },
    {
        "username": "bioanalytical",
        "password": "bioanalyticalBIOANALYTICAL!",
        "department": "Bioanalytical Laboratory",
        "hint": "Bioanalytical",
        "api": "none",
    },
    {
        "username": "immunology",
        "password": "immunologyIMMUNOLOGY!",
        "department": "Immunology",
        "hint": "Immunology",
        "api": "none",
    },
    {
        "username": "pathology",
        "password": "pathologyPATHOLOGY!",
        "department": "Pathology Laboratory",
        "hint": "Pathology",
        "api": "none",
    },
    {
        "username": "pharma",
        "password": "pharmaPHARMA!",
        "department": "Pharmaceuticals Laboratory",
        "hint": "Pharmaceuticals",
        "api": "none",
    },
    {
        "username": "tmmd",
        "password": "tmmdTMMD!",
        "department": "Traditional & Modern Medicine Research Lab",
        "hint": "Traditional",
        "api": "none",
    },
    {
        "username": "viralvaccine",
        "password": "viralvaccineVIRAL!",
        "department": "Viral Vaccine",
        "hint": "Viral Vaccine",
        "api": "none",
    },
    {
        "username": "ctd",
        "password": "ctdCTD!",
        "department": "CTD",
        "hint": "CTD",
        "api": "medlab_orderable_tests",
    },
    {
        "username": "bioequivalence",
        "password": "bioequivalenceBIOEQ!",
        "department": "Bioequivalence Laboratory",
        "hint": "Bioequivalence",
        "api": "none",
    },
    {
        "username": "genomics",
        "password": "genomicsGENOMICS!",
        "department": "Genomics & Bioinformatics Laboratory",
        "hint": "Genomics",
        "api": "none",
    },
    {
        "username": "virology",
        "password": "virologyVIROLOGY!",
        "department": "Virology Laboratory",
        "hint": "Virology",
        "api": "none",
    },
]

USER_BY_NAME = {u["username"]: u for u in SUPER_USERS}


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
        return {
            "started": self.started,
            "base_url": self.base_url,
            "users": self.users,
            "summary": self.summary,
        }


def login(session: requests.Session, username: str, password: str) -> CheckResult:
    response = session.post(
        f"{API}/ValidateLogin?apiCall=true",
        data={"loginName": username, "password": password},
        timeout=90,
    )
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
    response = session.post(
        f"{API}/rest/setUserLoginLabUnit/{test_section_id}",
        timeout=90,
    )
    if response.status_code != 200:
        return CheckResult("set_login_lab_unit", False, f"HTTP {response.status_code}")
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return CheckResult("set_login_lab_unit", False, "Non-JSON response")
    if not payload.get("success"):
        return CheckResult("set_login_lab_unit", False, str(payload)[:200])
    return CheckResult(
        "set_login_lab_unit",
        True,
        payload.get("loginLabUnit", test_section_id),
    )


def resolve_test_section_id(session: requests.Session, department_name: str) -> str | None:
    response = session.get(
        f"{API}/rest/displayList/TEST_SECTION_ACTIVE",
        timeout=90,
    )
    if response.status_code != 200:
        return None
    try:
        rows = response.json()
    except json.JSONDecodeError:
        return None

    aliases = {department_name.lower()}
    if department_name == "Virology Laboratory":
        aliases.update({"virologie", "virology laboratory", "virology"})

    best_id = None
    best_score = -1
    for row in rows or []:
        value = (row.get("value") or "").strip()
        row_id = str(row.get("id") or "").strip()
        if not row_id:
            continue
        value_lower = value.lower()
        score = -1
        if value == department_name:
            score = 100
        elif value_lower in aliases:
            score = 90
        elif department_name.lower() in value_lower:
            score = 80
        elif value_lower in department_name.lower():
            score = 70
        if score > best_score:
            best_score = score
            best_id = row_id
    return best_id


def check_hierarchy(session: requests.Session, hint: str) -> CheckResult:
    response = session.get(f"{API}/rest/notebook/hierarchy", timeout=90)
    if response.status_code != 200:
        return CheckResult("notebook_hierarchy", False, f"HTTP {response.status_code}")
    try:
        hierarchy = response.json()
    except json.JSONDecodeError:
        return CheckResult("notebook_hierarchy", False, "Non-JSON hierarchy")

    hint_lower = hint.lower()
    matches = [
        node
        for node in hierarchy or []
        if hint_lower in (node.get("title") or "").lower()
    ]
    if not matches:
        titles = [node.get("title") for node in hierarchy or []]
        return CheckResult(
            "notebook_hierarchy",
            False,
            f"No notebook matching '{hint}'. Visible: {titles[:8]}",
        )
    return CheckResult(
        "notebook_hierarchy",
        True,
        matches[0].get("title", hint),
    )


def check_optional_api(session: requests.Session, api_name: str) -> CheckResult:
    if api_name == "medlab_orderable_tests":
        response = session.get(f"{API}/rest/medlab/orderable-tests", timeout=90)
        if response.status_code != 200:
            return CheckResult("medlab_orderable_tests", False, f"HTTP {response.status_code}")
        try:
            rows = response.json()
        except json.JSONDecodeError:
            return CheckResult("medlab_orderable_tests", False, "Non-JSON response")
        if not isinstance(rows, list) or len(rows) == 0:
            return CheckResult("medlab_orderable_tests", False, "Empty test list")
        return CheckResult("medlab_orderable_tests", True, f"{len(rows)} tests")

    if api_name == "mntd_page":
        response = session.get(f"{API}/rest/notebook/hierarchy", timeout=90)
        if response.status_code != 200:
            return CheckResult("mntd_hierarchy_pages", False, f"HTTP {response.status_code}")
        hierarchy = response.json()
        mntd = next(
            (n for n in hierarchy or [] if "mntd" in (n.get("title") or "").lower()),
            None,
        )
        if not mntd:
            return CheckResult("mntd_hierarchy_pages", False, "MNTD template not visible")
        notebook_id = mntd.get("id")
        view = session.get(f"{API}/rest/notebook/view/{notebook_id}", timeout=90)
        if view.status_code != 200:
            return CheckResult("mntd_hierarchy_pages", False, f"view HTTP {view.status_code}")
        page_rows = view.json().get("pages") or []
        count = len(page_rows) if isinstance(page_rows, list) else 0
        if count < 1:
            return CheckResult("mntd_hierarchy_pages", False, "No workflow pages")
        return CheckResult("mntd_hierarchy_pages", True, f"{count} pages")

    return CheckResult("optional_api", True, "skipped")


def verify_user(user_cfg: dict[str, str]) -> UserReport:
    report = UserReport(username=user_cfg["username"], department=user_cfg["department"])
    session = requests.Session()
    session.verify = False

    report.checks.append(login(session, user_cfg["username"], user_cfg["password"]))
    if not report.checks[-1].ok:
        report.passed = False
        return report

    section_id = resolve_test_section_id(session, user_cfg["department"])
    if not section_id:
        report.checks.append(
            CheckResult(
                "resolve_test_section",
                False,
                f"Could not resolve test section for {user_cfg['department']}",
            )
        )
        report.passed = False
        return report
    report.checks.append(
        CheckResult("resolve_test_section", True, section_id),
    )

    report.checks.append(set_login_lab_unit(session, section_id))
    report.checks.append(check_hierarchy(session, user_cfg["hint"]))
    report.checks.append(check_optional_api(session, user_cfg.get("api", "none")))

    report.passed = all(check.ok for check in report.checks)
    return report


def to_dict(report: UserReport) -> dict[str, Any]:
    return {
        "username": report.username,
        "department": report.department,
        "passed": report.passed,
        "checks": [
            {"name": c.name, "ok": c.ok, "detail": c.detail} for c in report.checks
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify AHRI department super-users")
    parser.add_argument("--user", help="Verify one username only")
    parser.add_argument("--all", action="store_true", help="Verify all super-users")
    parser.add_argument(
        "--report",
        default=str(DEFAULT_REPORT),
        help=f"JSON report path (default: {DEFAULT_REPORT})",
    )
    args = parser.parse_args()

    if not args.all and not args.user:
        args.all = True

    users = SUPER_USERS
    if args.user:
        if args.user not in USER_BY_NAME:
            print(f"Unknown user: {args.user}", file=sys.stderr)
            return 1
        users = [USER_BY_NAME[args.user]]

    uat = UatReport(base_url=BASE_URL)
    passed_count = 0

    for user_cfg in users:
        result = verify_user(user_cfg)
        uat.users.append(to_dict(result))
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.username}")
        for check in result.checks:
            mark = "ok" if check.ok else "FAIL"
            print(f"  - {check.name}: {mark} ({check.detail})")
        if result.passed:
            passed_count += 1

    uat.summary = {
        "total": len(users),
        "passed": passed_count,
        "failed": len(users) - passed_count,
    }

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(uat.to_dict(), indent=2) + "\n", encoding="utf-8")
    print(f"\nReport written to {report_path}")
    print(f"Summary: {passed_count}/{len(users)} passed")

    return 0 if passed_count == len(users) else 1


if __name__ == "__main__":
    raise SystemExit(main())
