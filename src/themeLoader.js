// Injects a license theme's palette into CSS custom properties on <html>,
// allowing styles.css to reference --color-primary / --color-secondary /
// --color-background / --color-accent regardless of the active license.
import { LICENSE_THEMES } from './examRouter.js'

const VARS = {
  primary:    '--color-primary',
  secondary:  '--color-secondary',
  background: '--color-background',
  accent:     '--color-accent',
}

export function applyTheme(theme) {
  const root = document.documentElement
  Object.entries(VARS).forEach(([key, cssVar]) => {
    if (theme?.[key]) root.style.setProperty(cssVar, theme[key])
  })
}

export function resetTheme() {
  applyTheme(LICENSE_THEMES.cosmetology)
}
