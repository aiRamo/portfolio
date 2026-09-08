// Match the sky rather than the reading-panel palette. Keep index.html's
// pre-paint colors in sync so a saved mode never starts with a daylight toolbar.
export const BROWSER_CHROME = {
  light: '#a0c7e1',
  dark: '#091223',
  sunset: '#84478f',
}

export function applyBrowserChrome(mode, doc = document) {
  const color = BROWSER_CHROME[mode] || BROWSER_CHROME.light
  doc.documentElement.style.setProperty('--browser-chrome', color)
  doc.documentElement.style.colorScheme = mode === 'dark' || mode === 'sunset' ? 'dark' : 'light'
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}
