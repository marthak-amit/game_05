// Monetisation layer: Ads + In-App Purchases behind one interface.
// In the browser it runs a MOCK (fake ad overlay / fake purchase) so every flow can be tested.
// In the native wrapper (Capacitor) it switches to AdMob / Google Play Billing -- see README.md.
(function () {
  const save = SS.save;
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const AdMob = native && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;

  // Replace with YOUR AdMob unit ids when the account is ready. (These are Google's public TEST ids.)
  const IDS = {
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    banner: 'ca-app-pub-3940256099942544/6300978111',
  };

  function mockAd(kind, done) {
    const el = document.createElement('div'); el.className = 'mockad';
    let t = kind === 'rewarded' ? 3 : 2;
    el.innerHTML = `<div class="mockad-box"><b>${kind === 'rewarded' ? 'REWARDED' : 'INTERSTITIAL'} AD (test)</b>
      <p>Your real ad plays here.</p><div class="mockad-t">${t}</div></div>`;
    document.body.appendChild(el);
    const iv = setInterval(() => {
      t--; el.querySelector('.mockad-t').textContent = t > 0 ? t : '✔';
      if (t <= 0) { clearInterval(iv); setTimeout(() => { el.remove(); done(true); }, 250); }
    }, 1000);
  }

  const noAds = () => save.adsRemoved || save.vip;
  SS.Ads = {
    ready: () => true,
    // Interstitial with frequency capping. cb always fires.
    maybeInterstitial(cb) {
      cb = cb || (() => {});
      save.runsSinceInter++;
      const ok = !noAds() && save.runs > SS.CFG.interstitialSkipFirstRuns &&
        save.runsSinceInter >= SS.CFG.interstitialEveryNRuns && Date.now() - save.lastInter > SS.CFG.interstitialMinGapMs;
      if (!ok) { SS.persist(); return cb(); }
      save.runsSinceInter = 0; save.lastInter = Date.now(); SS.persist(); SS.track('ad_interstitial');
      if (AdMob) {
        AdMob.prepareInterstitial({ adId: IDS.interstitial }).then(() => AdMob.showInterstitial()).then(() => cb()).catch(() => cb());
      } else mockAd('interstitial', () => cb());
    },
    // Rewarded: onReward fires only if the user earned it; onFail otherwise.
    rewarded(placement, onReward, onFail) {
      SS.track('ad_rewarded_request', placement);
      if (AdMob) {
        let rewarded = false;
        AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
        AdMob.prepareRewardVideoAd({ adId: IDS.rewarded }).then(() => AdMob.showRewardVideoAd())
          .then(() => (rewarded ? onReward() : onFail && onFail())).catch(() => onFail && onFail());
      } else mockAd('rewarded', ok => { if (ok) { SS.track('ad_rewarded_done', placement); onReward(); } else onFail && onFail(); });
    },
    showBanner() { if (AdMob && !noAds()) AdMob.showBanner({ adId: IDS.banner, position: 'BOTTOM_CENTER' }); },
    hideBanner() { if (AdMob) AdMob.hideBanner(); },
  };

  // ---------- IAP ----------
  function grant(id) {
    const p = SS.PRODUCTS.find(x => x.id === id); if (!p) return;
    if (p.coins) save.coins += p.coins;
    if (id === 'remove_ads') save.adsRemoved = true;
    if (id === 'vip') { save.vip = true; save.adsRemoved = true; if (!save.owned.includes('streak')) save.owned.push('streak'); }
    if (id === 'starter_pack') { save.coins += 5000; save.adsRemoved = true; if (!save.owned.includes('cosmo')) save.owned.push('cosmo'); }
    SS.persist(); SS.track('iap', id);
  }
  SS.IAP = {
    purchase(id, cb) {
      const p = SS.PRODUCTS.find(x => x.id === id);
      if (native && window.Capacitor.Plugins.InAppPurchase) {
        // TODO(native): call the billing plugin here, then grant(id) on success.
        return cb(false);
      }
      if (confirm(`TEST PURCHASE\n${p.title} for ${p.price}?\n(No real money is charged in the browser build.)`)) { grant(id); cb(true); } else cb(false);
    },
    restore() { /* native: re-query owned products and call grant() */ },
  };
})();
