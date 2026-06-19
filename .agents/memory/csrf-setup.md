---
name: CSRF setup
description: How Flask-WTF CSRF protection is configured and where it applies
---

## Rule
CSRFProtect is initialized in create_app(). The entire `api_bp` blueprint is exempted. Only HTML form POST routes need CSRF tokens.

## Where CSRF tokens appear
- `backend/templates/login.html` — sign-in form and register form both have `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}"/>`
- No other templates have HTML form POSTs (all other interactions use JavaScript fetch() with JSON)

## Testing with CSRF
The Flask test client does NOT auto-include CSRF tokens. To test form endpoints:
1. GET /login to fetch the page
2. Extract token: `re.search(rb'name="csrf_token" value="([^"]+)"', r.data).group(1).decode()`
3. Include token in form data for POST

**Why:** JSON API routes are already protected by session auth (api_login_required). CSRF is only needed for traditional form submissions. Exempting api_bp keeps the API clean and avoids requiring X-CSRFToken headers in all frontend JS fetch() calls.
