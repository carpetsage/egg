export let webpSupported = false;

export async function performWebpTest() {
  webpSupported = await checkWebpFeature('lossy');
}

// https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
async function checkWebpFeature(feature: 'lossy' | 'lossless' | 'alpha' | 'animation') {
  const kTestImages = {
    lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
    lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
    alpha:
      'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
    animation:
      'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA',
  } as const;
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = 'data:image/webp;base64,' + kTestImages[feature];
    });
  } catch (err) {
    return false;
  }
  return image.width > 0 && image.height > 0;
}
