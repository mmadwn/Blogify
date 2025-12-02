from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Verify Homepage (Search)
        page.goto("http://localhost:3000/")
        page.fill('input[name="search"]', 'AI')
        page.click('button.search-button')
        page.wait_for_load_state('networkidle')
        page.screenshot(path="verification/search_results.png")

        # 2. Verify Article Page (Comments)
        page.goto("http://localhost:3000/article/1")
        page.screenshot(path="verification/article_comments.png")

        # 3. Add a comment
        page.fill('#name', 'Playwright Tester')
        page.fill('#email', 'tester@playwright.com')
        page.fill('#content', 'Comment from Playwright')
        page.click('button[type="submit"]')
        page.wait_for_load_state('networkidle')
        page.screenshot(path="verification/comment_added.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
