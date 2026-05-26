# Logo Asset Restore Point

This folder contains the logo and app icon assets that were replaced by `npm run generate-icons`.

To manually revert this logo change from the repository root:

```bash
cp -R public/logo-archive/2026-05-26T14-19-07-917Z/logo public/logo
cp public/logo-archive/2026-05-26T14-19-07-917Z/android-chrome-192x192.png public/android-chrome-192x192.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/android-chrome-512x512.png public/android-chrome-512x512.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/apple-touch-icon.png public/apple-touch-icon.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/logo-with-text.png public/logo-with-text.png
rm -f public/logo-with-text-dark.png public/spliit_forked_icon_with_text_dark.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/logo.svg public/logo.svg
cp public/logo-archive/2026-05-26T14-19-07-917Z/spliit_forked_icon.png public/spliit_forked_icon.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/spliit_forked_icon_with_text.png public/spliit_forked_icon_with_text.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/src-app/apple-icon.png src/app/apple-icon.png
cp public/logo-archive/2026-05-26T14-19-07-917Z/src-app/favicon.ico src/app/favicon.ico
cp public/logo-archive/2026-05-26T14-19-07-917Z/src-app/icon.svg src/app/icon.svg
```
