# Candidate palette contrast checks

1 November 2026. Computed from specified sRGB hex values using relative luminance. These checks cover chosen text/button and input-edge pairs, not complete component/application accessibility. Decorative swatches have no text overlay.

| Direction | Pair | Ratio | Target | Result |
|---|---|---|---|---|
| daylight | ink / canvas | 13.41:1 | 4.5:1 | Pass |
| daylight | muted / canvas | 5.52:1 | 4.5:1 | Pass |
| daylight | ink / surface | 14.62:1 | 4.5:1 | Pass |
| daylight | muted / surface | 6.02:1 | 4.5:1 | Pass |
| daylight | onPrimary / primary | 6.42:1 | 4.5:1 | Pass |
| daylight | primary / canvas | 5.89:1 | 4.5:1 | Pass |
| daylight | controlEdge / surface | 3.69:1 | 3:1 | Pass |
| cobalt | ink / canvas | 14.14:1 | 4.5:1 | Pass |
| cobalt | muted / canvas | 5.70:1 | 4.5:1 | Pass |
| cobalt | ink / surface | 15.43:1 | 4.5:1 | Pass |
| cobalt | muted / surface | 6.22:1 | 4.5:1 | Pass |
| cobalt | onPrimary / primary | 6.12:1 | 4.5:1 | Pass |
| cobalt | primary / canvas | 5.61:1 | 4.5:1 | Pass |
| cobalt | controlEdge / surface | 3.71:1 | 3:1 | Pass |
| afterlight | ink / canvas | 15.46:1 | 4.5:1 | Pass |
| afterlight | muted / canvas | 8.17:1 | 4.5:1 | Pass |
| afterlight | ink / surface | 12.78:1 | 4.5:1 | Pass |
| afterlight | muted / surface | 6.76:1 | 4.5:1 | Pass |
| afterlight | onPrimary / primary | 13.15:1 | 4.5:1 | Pass |
| afterlight | primary / canvas | 13.15:1 | 4.5:1 | Pass |
| afterlight | controlEdge / surface | 3.57:1 | 3:1 | Pass |

Do not use pale illustration accents as small text on light surfaces. Validate focus, hover, disabled and semantic states after direction selection.
