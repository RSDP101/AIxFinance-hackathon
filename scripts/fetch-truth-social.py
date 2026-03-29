#!/usr/bin/env python3
"""
Truth Social sidecar — fetches posts from monitored accounts
and writes them to a JSON file for the Express server to consume.

Usage:
  python3 scripts/fetch-truth-social.py          # runs in loop (every 2 min)
  python3 scripts/fetch-truth-social.py --once    # single fetch then exit

Environment variables:
  TRUTHSOCIAL_USERNAME  — Truth Social username or email
  TRUTHSOCIAL_PASSWORD  — Truth Social password
  TRUTHSOCIAL_TOKEN     — alternatively, a pre-obtained Bearer token
"""

import json
import os
import re
import sys
import time
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent.parent / "server" / "data" / "truth-social.json"
POLL_INTERVAL = 120  # seconds
MONITORED_ACCOUNTS = ["realDonaldTrump"]


def check_credentials():
    has_user = bool(os.environ.get("TRUTHSOCIAL_USERNAME"))
    has_pass = bool(os.environ.get("TRUTHSOCIAL_PASSWORD"))
    has_token = bool(os.environ.get("TRUTHSOCIAL_TOKEN"))

    if has_token:
        return True
    if has_user and has_pass:
        return True

    print("[TruthSocial Sidecar] No credentials found.")
    print("  Set TRUTHSOCIAL_USERNAME + TRUTHSOCIAL_PASSWORD")
    print("  Or set TRUTHSOCIAL_TOKEN")
    return False


def strip_html(html: str) -> str:
    """Remove HTML tags from Mastodon content."""
    text = re.sub(r"<br\s*/?>", " ", html)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&quot;", '"')
    text = text.replace("&#39;", "'")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fetch_posts():
    """Fetch recent posts from all monitored accounts."""
    from truthbrush.api import Api

    api = Api()
    all_posts = []

    for account in MONITORED_ACCOUNTS:
        try:
            print(f"[TruthSocial Sidecar] Fetching posts from @{account}...")
            count = 0
            for status in api.pull_statuses(account, replies=False):
                post = {
                    "id": str(status.get("id", "")),
                    "author": status.get("account", {}).get("display_name", account),
                    "handle": f"@{status.get('account', {}).get('acct', account)}",
                    "content": strip_html(status.get("content", "")),
                    "timestamp": int(
                        time.mktime(
                            time.strptime(
                                status.get("created_at", "")[:19],
                                "%Y-%m-%dT%H:%M:%S",
                            )
                        )
                    )
                    if status.get("created_at")
                    else int(time.time()),
                    "url": status.get("url", ""),
                }

                if post["content"]:
                    all_posts.append(post)
                    count += 1

                if count >= 20:
                    break

            print(f"[TruthSocial Sidecar] Got {count} posts from @{account}")

        except Exception as e:
            print(f"[TruthSocial Sidecar] Error fetching @{account}: {e}")

    return all_posts


def write_posts(posts):
    """Write posts to JSON file atomically."""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = OUTPUT_FILE.with_suffix(".tmp")
    with open(tmp_file, "w") as f:
        json.dump(posts, f, indent=2)
    tmp_file.rename(OUTPUT_FILE)
    print(f"[TruthSocial Sidecar] Wrote {len(posts)} posts to {OUTPUT_FILE}")


def main():
    if not check_credentials():
        sys.exit(1)

    once = "--once" in sys.argv

    while True:
        try:
            posts = fetch_posts()
            write_posts(posts)
        except Exception as e:
            print(f"[TruthSocial Sidecar] Poll error: {e}")

        if once:
            break

        print(f"[TruthSocial Sidecar] Sleeping {POLL_INTERVAL}s...")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
