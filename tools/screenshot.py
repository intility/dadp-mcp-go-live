#!/usr/bin/env python3
"""
General-purpose Playwright screenshot tool for capturing frontend state.

Usage:
    python screenshot.py <url> <output_path> [--wait=<seconds>] [--width=<px>] [--height=<px>]

Examples:
    python screenshot.py http://localhost:3000 frontend.png
    python screenshot.py http://localhost:3000 frontend.png --wait=2 --width=1920 --height=1080
"""

import sys
import argparse
from playwright.sync_api import sync_playwright


def capture_screenshot(url: str, output_path: str, wait_seconds: int = 1, width: int = 1920, height: int = 1080):
    """Capture a screenshot of a webpage using Playwright."""
    print(f"📸 Capturing screenshot of {url}...")

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        try:
            # Navigate to URL
            print(f"🌐 Navigating to {url}...")
            page.goto(url, wait_until='networkidle', timeout=30000)

            # Wait for specified time
            if wait_seconds > 0:
                print(f"⏳ Waiting {wait_seconds} seconds for page to stabilize...")
                page.wait_for_timeout(wait_seconds * 1000)

            # Capture screenshot
            print(f"💾 Saving screenshot to {output_path}...")
            page.screenshot(path=output_path, full_page=True)

            print(f"✅ Screenshot saved successfully!")

            # Get page console logs
            console_messages = []
            page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

            # Get any errors
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))

            if console_messages:
                print(f"\n📋 Console messages:")
                for msg in console_messages:
                    print(f"  {msg}")

            if errors:
                print(f"\n❌ Page errors:")
                for error in errors:
                    print(f"  {error}")

        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser(
        description='Capture screenshot of a webpage using Playwright'
    )
    parser.add_argument('url', help='URL to capture')
    parser.add_argument('output', help='Output path for screenshot (e.g., screenshot.png)')
    parser.add_argument('--wait', type=int, default=1, help='Seconds to wait before screenshot (default: 1)')
    parser.add_argument('--width', type=int, default=1920, help='Viewport width (default: 1920)')
    parser.add_argument('--height', type=int, default=1080, help='Viewport height (default: 1080)')

    args = parser.parse_args()

    capture_screenshot(
        url=args.url,
        output_path=args.output,
        wait_seconds=args.wait,
        width=args.width,
        height=args.height
    )


if __name__ == '__main__':
    main()
