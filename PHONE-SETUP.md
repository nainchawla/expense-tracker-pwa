# Put My Budget on your phone

## The short answer

Yes — for this app to behave as an installable PWA on your phone, it needs to be hosted at an **HTTPS web address**. GitHub Pages is a good free choice and works perfectly with this vanilla HTML/CSS/JavaScript app.

“Vanilla” only means there is no React, Node build, or compilation step. It does **not** mean the app must be hosted from your computer. Once published on GitHub Pages, you open the link on your phone and install it from the browser.

Do **not** use the `python -m http.server` command from the main README for phone use. That is only a temporary development server on your computer; it does not make the app available to your phone unless both devices are configured on the same network, and it is not HTTPS.

## Before you begin

You need:

- A GitHub account.
- This project folder: `expense-tracker-pwa`.
- Git installed on your computer. If you used GitHub Pages for another PWA, you likely already have it.

The folder you will publish contains `index.html`, `manifest.json`, `service-worker.js`, `css/`, `js/`, and `icons/`. Publish the **contents of this folder**, not its parent `outputs` folder.

## Option A — publish with GitHub Desktop (easiest)

1. Open **GitHub Desktop**.
2. Choose **File → Add local repository**.
3. Select this folder:

   ```text
   C:\Users\naing\Documents\Codex\2026-09-02\files-mentioned-by-the-user-expense\outputs\expense-tracker-pwa
   ```

4. If GitHub Desktop says this folder is not a Git repository, choose **create a repository**. Use a name such as `my-budget` and keep it private or public as you prefer.
5. Enter a summary such as `Initial My Budget PWA` and click **Commit to main**.
6. Click **Publish repository**. You may keep the repository private, but GitHub Pages availability for private repositories depends on your GitHub plan; a public repository works on every free account.
7. In your browser, open the repository on GitHub.
8. Go to **Settings → Pages**.
9. Under **Build and deployment**, choose:

   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**

10. Click **Save**. Wait one or two minutes, then refresh the Pages settings screen. GitHub displays the live address, usually:

    ```text
    https://YOUR-GITHUB-USERNAME.github.io/my-budget/
    ```

11. Open that address on your computer first and confirm the app loads.

## Option B — publish using the terminal

Open PowerShell in the `expense-tracker-pwa` folder and run the following commands. Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.

```powershell
git init
git branch -M main
git add .
git commit -m "Initial My Budget PWA"
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/my-budget.git
git push -u origin main
```

Before the `git remote add` command, create an empty repository named `my-budget` on [GitHub](https://github.com/new). Do not select the options to add a README, `.gitignore`, or license there; this project already has its own files.

Then enable GitHub Pages exactly as described in steps 7–10 above.

## Install it on Android

1. On your Android phone, open the GitHub Pages address in **Chrome**.
2. Wait for the page to load completely. If Chrome offers an **Install** button or banner, tap it.
3. If it does not appear, tap Chrome’s three-dot menu (`⋮`) and choose **Install app** or **Add to Home screen**.
4. Confirm the app name and tap **Install** / **Add**.
5. Open **My Budget** from the new home-screen icon.

After the first full load, the app shell works offline. Your expenses and income are stored locally in the browser/app on that particular phone.

## Install it on iPhone / iPad

1. Open the GitHub Pages address in **Safari**. Do not use Chrome for the installation step on iPhone.
2. Tap the **Share** button (the square with an upward arrow).
3. Scroll down and choose **Add to Home Screen**.
4. Keep the name as **My Budget**, then tap **Add**.
5. Open it using the new home-screen icon.

## Important: your data stays on the phone

This app deliberately has no account and no cloud database. That means:

- The GitHub Pages site delivers the app files; it does **not** receive or store your financial entries.
- Each phone/browser has its own separate data.
- Reinstalling the app, clearing browser/site data, or switching phones can remove local records.
- Use **History → Export JSON** regularly. Keep the downloaded backup somewhere safe, such as a private cloud drive or computer.
- On a new phone, install the app first, then use **Settings → Import backup** to restore the JSON file.

## Updating the app later

When you change files in the project:

1. Commit and push the changes with GitHub Desktop, or run:

   ```powershell
   git add .
   git commit -m "Describe the update"
   git push
   ```

2. GitHub Pages redeploys automatically, usually within a few minutes.
3. Open the installed app while connected to the internet, then close and reopen it. The service worker will fetch the newer version.

This project uses an offline cache. If you make future edits, change the cache version in `service-worker.js` (for example, `my-budget-v3` to `my-budget-v4`) before publishing; otherwise a phone may continue using old cached files.

## Can it work without GitHub Pages?

It can, but an HTTPS host is still needed for normal phone installation and reliable offline caching. Alternatives include Netlify, Cloudflare Pages, Vercel, or your own HTTPS web host. GitHub Pages is the simplest option because this is a static site: there is no server code, database, Node runtime, or build command to configure.

You could run the app only from your computer on a local network for testing, but that is not a good replacement for hosting: the phone would need to stay on the same Wi-Fi, your computer would need to remain running, and the PWA installation/offline features would be limited without HTTPS.
