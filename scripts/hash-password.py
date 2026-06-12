#!/usr/bin/env python3
"""Generate bcrypt password hashes compatible with OpenELIS login_user.password."""

from __future__ import annotations

import argparse
import sys

try:
    import bcrypt
except ImportError as exc:
    print("bcrypt package required: pip install bcrypt", file=sys.stderr)
    raise SystemExit(1) from exc


def hash_password(password: str, rounds: int = 12) -> str:
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Hash a password for OpenELIS login_user")
    parser.add_argument("password", help="Plain-text password to hash")
    parser.add_argument(
        "--rounds",
        type=int,
        default=12,
        help="bcrypt cost factor (default: 12)",
    )
    args = parser.parse_args()
    print(hash_password(args.password, rounds=args.rounds))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
