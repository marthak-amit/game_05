# Sling Sprite 🟡

One-touch grapple-swing arcade for mobile. **Hold** to shoot a rope at the glowing star, **release** at ~45° for a PERFECT launch,
grab gems, dodge mines / saws / lasers, and don't touch the sea. Five biomes, power-ups, chain multiplier, close-call bonuses.

Tech: plain HTML5 Canvas + JS (zero dependencies, no build step, 100% free). Runs in any browser, installable as a PWA,
and wraps into an Android/iOS app with Capacitor (free).

## Run locally
```
python3 -m http.server 8000   # open http://localhost:8000 with phone emulation
```
Controls: touch/mouse hold & release, or Space.

## Retention loops
- Skill ceiling + 10-second restarts; PERFECT launch and chain multiplier reward mastery.
- Daily gift (7-day streak, day 7 = exclusive skin), 3 daily missions, lucky wheel every 8h.
- 12 collectible skins (coins / rewarded ad / streak / IAP), new biome every 450 m.

## Monetisation (wired, MOCKED in browser — see `js/monet.js`)
| Source | Where | Notes |
|---|---|---|
| Rewarded ads | Revive, Double coins, Daily x2, Extra wheel spin, Shadow skin (5 ads) | Opt-in, high eCPM |
| Interstitial | Every 3rd run, >=100 s apart, skipped for first 2 runs | Tunable in `SS.CFG` (`js/data.js`) |
| IAP | Remove Ads Rs149, VIP Rs299 (no ads + 2x coins), Starter Pack Rs99, coin packs Rs49/199/499 | |
| Banner | `SS.Ads.showBanner()` | Off by default |

Reaching Rs10 L/month realistically needs roughly 100-150k DAU (rewarded-ad ARPDAU about Rs2-3 plus ~2% IAP payers). The game provides the retention engine; growth comes from UA/creative testing and live-ops (events, new skins every 2 weeks).

## Test ads
`js/monet.js` has `TEST_MODE = true`: in the browser you get a fake ad overlay; in the Android build (Capacitor + AdMob) you get Google's official **test** ad units (interstitial, rewarded, banner on menu). Run the GitHub Action *Android debug APK* (or `npm i && npm run build:web && npx cap add android && npx cap sync`) to get an installable test APK. Not yet verified on a physical device.
When your AdMob account is ready: set `TEST_MODE=false`, fill `REAL` ids in `js/monet.js`, and replace the test App ID in the manifest.

## Going native (when accounts are ready)
```
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/admob
npx cap init "Sling Sprite" com.yourstudio.slingsprite --web-dir .
npx cap add android && npx cap sync && npx cap open android
```
1. Put your AdMob app id in AndroidManifest and unit ids in `IDS` in `js/monet.js` (currently Google *test* ids). The AdMob bridge is written for `@capacitor-community/admob` but **not tested on a device yet**.
2. Implement the `TODO(native)` in `SS.IAP.purchase` with a billing plugin, using product ids from `SS.PRODUCTS`.
3. Replace `SS.track` with Firebase Analytics / GameAnalytics. Add privacy policy + consent (UMP) before release.
4. Replace the placeholder `icon.svg` with real icons/splash.

## Files
`js/game.js` engine/rendering · `js/ui.js` menus & meta · `js/monet.js` ads+IAP · `js/data.js` tuning · `js/audio.js` procedural sound · `sw.js` offline.
