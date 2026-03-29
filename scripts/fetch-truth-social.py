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
HISTORY_DAYS = 30  # how far back to fetch on startup


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


def fetch_posts(days_back=HISTORY_DAYS):
    """Fetch posts from all monitored accounts, going back `days_back` days."""
    from truthbrush.api import Api

    api = Api()
    all_posts = []
    cutoff = int(time.time()) - days_back * 86400

    for account in MONITORED_ACCOUNTS:
        try:
            print(f"[TruthSocial Sidecar] Fetching up to {days_back} days of posts from @{account}...")
            count = 0
            for status in api.pull_statuses(account, replies=False):
                created_at = status.get("created_at", "")
                if created_at:
                    try:
                        ts = int(
                            time.mktime(
                                time.strptime(created_at[:19], "%Y-%m-%dT%H:%M:%S")
                            )
                        )
                    except ValueError:
                        ts = int(time.time())
                else:
                    ts = int(time.time())

                # Stop once we've gone past the cutoff
                if ts < cutoff:
                    print(f"[TruthSocial Sidecar] Reached {days_back}-day cutoff, stopping")
                    break

                post = {
                    "id": str(status.get("id", "")),
                    "author": status.get("account", {}).get("display_name", account),
                    "handle": f"@{status.get('account', {}).get('acct', account)}",
                    "content": strip_html(status.get("content", "")),
                    "timestamp": ts,
                    "url": status.get("url", ""),
                }

                if post["content"]:
                    all_posts.append(post)
                    count += 1

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

    # First run: fetch full history (30 days)
    print(f"[TruthSocial Sidecar] Initial fetch: last {HISTORY_DAYS} days...")
    try:
        posts = fetch_posts(days_back=HISTORY_DAYS)
        write_posts(posts)
    except Exception as e:
        print(f"[TruthSocial Sidecar] Initial fetch error: {e}")
        posts = []

    if once:
        return

    # Subsequent runs: only fetch last 1 day and merge with existing
    while True:
        print(f"[TruthSocial Sidecar] Sleeping {POLL_INTERVAL}s...")
        time.sleep(POLL_INTERVAL)

        try:
            new_posts = fetch_posts(days_back=1)
            # Merge: add new posts, deduplicate by id
            existing_ids = {p["id"] for p in posts}
            for p in new_posts:
                if p["id"] not in existing_ids:
                    posts.append(p)
                    existing_ids.add(p["id"])
            # Sort newest first
            posts.sort(key=lambda p: p["timestamp"], reverse=True)
            write_posts(posts)
        except Exception as e:
            print(f"[TruthSocial Sidecar] Poll error: {e}")


if __name__ == "__main__":
    main()
