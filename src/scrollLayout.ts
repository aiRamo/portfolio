/** Document position without the content's animated reveal translation. */
export function layoutTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
  return top
}

export function readingOffset() {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 110
}
