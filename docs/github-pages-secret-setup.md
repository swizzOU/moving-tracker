# GitHub Pages Secret Setup

This repo is configured to inject the Firebase Web API key during GitHub Pages deployment.

## Why

- The key is not committed to Git history.
- Deployment still works by replacing a placeholder in index.html.

## One-time setup

1. In GitHub, open this repository.
2. Go to Settings -> Secrets and variables -> Actions.
3. Create a new repository secret:
   - Name: FIREBASE_WEB_API_KEY
   - Value: your Firebase Web API key
4. Go to Settings -> Pages.
5. Set Source to GitHub Actions.

## Deploy flow

- Commit and push to main.
- Workflow .github/workflows/deploy-pages.yml runs.
- It replaces __FIREBASE_WEB_API_KEY__ in index.html inside a temporary deploy artifact.
- The deployed site gets the real key; the repo does not store it.

## Key restrictions (recommended)

In Google Cloud Console for your key:

- Application restriction: HTTP referrers (web sites)
- Allowed referrers:
  - https://swizzou.github.io/*
  - https://swizzou.github.io/moving-tracker/*
- API restriction: only Firebase APIs your app needs
