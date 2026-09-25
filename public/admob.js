/*
 * AdMob demo wrapper for the Capacitor Android build.
 * The web browser safely ignores this module because the native plugin is absent.
 * Replace the test IDs below with your real AdMob IDs before publishing.
 */
(function createAdMobDemo() {
  const testIds = {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  };

  function getPlugin() {
    return window.Capacitor?.Plugins?.AdMob || null;
  }

  async function init() {
    const adMob = getPlugin();
    if (!adMob) return false;
    await adMob.initialize({
      testingDevices: [],
      initializeForTesting: true,
    });
    return true;
  }

  async function showBanner() {
    const adMob = getPlugin();
    if (!adMob) return false;
    await adMob.showBanner({
      adId: testIds.banner,
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
    });
    return true;
  }

  async function showInterstitial() {
    const adMob = getPlugin();
    if (!adMob) return false;
    await adMob.prepareInterstitial({ adId: testIds.interstitial });
    await adMob.showInterstitial();
    return true;
  }

  window.DigitalDokandarAds = {
    init,
    showBanner,
    showInterstitial,
    testIds,
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (await init()) await showBanner();
    } catch (error) {
      console.warn('AdMob demo is unavailable:', error);
    }
  });
})();
