import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { applyBrowserChrome, BROWSER_CHROME } from '../src/browserChrome.mjs'

test('saved modes and unavailable storage use the same toolbar color before and after React starts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  for (const [saved, systemDark, expected, blocked] of [
    ['light', true, 'light', false], ['dark', false, 'dark', false],
    ['sunset', true, 'sunset', false], ['sunset', false, 'sunset', false],
    ['invalid', true, 'dark', false], [null, false, 'light', false],
    [null, true, 'dark', true],
  ]) {
    const properties = {}, attributes = {}
    const doc = {
      documentElement: { dataset: {}, style: { setProperty: (key, value) => { properties[key] = value } } },
      querySelector: () => ({ setAttribute: (key, value) => { attributes[key] = value } }),
    }
    runInNewContext(bootstrap, {
      document: doc,
      localStorage: { getItem: () => { if (blocked) throw new Error('Storage unavailable'); return saved } },
      matchMedia: () => ({ matches: systemDark }),
    })
    assert.equal(doc.documentElement.dataset.theme, expected)
    assert.equal(properties['--browser-chrome'], BROWSER_CHROME[expected])
    assert.equal(attributes.content, BROWSER_CHROME[expected])
    for (const selected of ['dark', 'sunset', 'light', expected]) {
      applyBrowserChrome(selected, doc)
      assert.equal(properties['--browser-chrome'], BROWSER_CHROME[selected])
      assert.equal(doc.documentElement.style.colorScheme, selected === 'light' ? 'light' : 'dark')
      assert.equal(attributes.content, properties['--browser-chrome'], 'legacy metadata and Safari background stay synchronized')
    }
  }
})
