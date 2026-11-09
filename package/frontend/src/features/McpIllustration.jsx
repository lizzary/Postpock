import { useId } from 'react'

const keyProfile = `M48-10h20l5-5h16l5 5h128q10 0 10 10t-10 10h-7v21h-14V20h-12v11h-15V10H94l-5 5H73l-5-5H48
  C42 24 31 28 21 23 16 34 7 41-4 39-18 37-27 26-24 15-36 13-42 6-42-4c0-11 9-19 21-20
  0-12 8-22 20-23 13-1 22 6 26 16 12-3 20 3 23 21Z
  M29-2c0-8-8-13-16-10-1-9-7-15-15-14-9 1-12 8-10 17-10-2-17 2-17 8 0 7 7 11 16 8
  -2 9 3 16 11 17 8 1 14-5 15-14 9 3 16-3 16-12Z`

const green = 'var(--mcp-art-green, color-mix(in srgb, var(--success, #3d7054) 80%, var(--ink, #2d2540)))'
const gold = 'var(--mcp-art-gold, color-mix(in srgb, #b58148 68%, var(--ink, #2d2540)))'
const paper = 'var(--paper, #fffdf8)'

export function McpIllustration() {
  const id = useId()

  return (
    <svg className="mcp-illustration" viewBox="0 0 400 176" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="-42" x2="12" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor={paper} />
          <stop offset=".47" stopColor={gold} stopOpacity=".27" />
          <stop offset="1" stopColor={green} stopOpacity=".22" />
        </linearGradient>
        <pattern id={`${id}-engraving`} width="3.8" height="3.8" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
          <path d="M0 0v3.8" stroke={gold} strokeWidth=".62" opacity=".5" />
        </pattern>
      </defs>

      <g stroke={green} strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 94c30-40 104-59 167-57 84 1 161 25 170 52 9 31-72 65-181 61-75-3-139-18-155-40" opacity=".29" />
        <path d="M45 115c39 21 91 29 145 30 72 2 137-17 163-39M44 83c35-27 104-39 152-39 82 1 146 22 159 43" opacity=".28" strokeDasharray="1 4.5" />
      </g>

      <g stroke={green} strokeLinecap="round" strokeLinejoin="round">
        <path d="M132 163C120 161 109 157 99 153S84 145 77 141 63 133 57 131" strokeOpacity=".76" />
        <path d="M288 49c4-2 8-5 13-9 3-3 7-6 11-9s7-5 12-7" strokeOpacity=".76" />
        <g fill={`color-mix(in srgb, var(--mcp-wash, #edf0e5) 91%, ${green})`} strokeWidth=".85" strokeOpacity=".74">
          <path d="M57 131C44 133 33 125 27 116c14 0 25 6 30 15Z" />
          <path d="M77 141C65 136 58 123 60 109c12 7 20 19 17 32Z" />
          <path d="M99 153c-13-5-28 0-35 10 14 5 28-1 35-10Z" />
          <path d="M113 158c-11-7-15-19-9-32 11 8 15 20 9 32Z" />
          <path d="M301 40c-11-2-18-10-19-21 11 3 19 11 19 21Z" />
          <path d="M312 31c11-2 24 4 31 14-13 2-26-4-31-14Z" />
          <path d="M324 24c4-10 14-15 26-14-6 10-16 16-26 14Z" />
        </g>
        <g strokeWidth=".55">
          <path d="M32 118q13 5 25 13M62 113q10 12 15 28M69 162q16-2 30-9M105 130q9 13 8 28" opacity=".66" />
          <path d="M43 123l-3-3M49 126l-5 .5 M68 121l-4-2M71 126l1-4M74 133l-4.5-1
            M78 160l-4-2M85 159l-3 3M92 156l-4-1 M109 137l-4-1M112 144l2.5-4M113 150l-4-2.5" opacity=".42" />
          <path d="M285 22q8 5 16 18M312 31q13 4 27 12M324 24q12-6 22-12" opacity=".66" />
          <path d="M290 26l-3-.7M295 32l.4-3.6M298 35.5l-3.5-1
            M320 33.8l4-1.4M326 36.2l1 3.1M332 38.9l3.8 .2 M329 21.5l1-4M336 17.6l4 .4M342 14.3l.7-2.8" opacity=".42" />
        </g>
      </g>

      <g stroke={gold} strokeLinecap="round" opacity=".83">
        <path d="M188 26h28m-14-7v14m-6-7 6-6 6 6-6 6-6-6Z" />
        <path d="M361 47v16m-8-8h16M41 44v12m-6-6h12M338 130v10m-5-5h10M264 153v8m-4-4h8" />
        <path d="M182 26h.1m39.9 0h.1M29 91h.1m331.9 1h.1M85 158h.1m57.9-7h.1M345 67h.1m25.9 58h.1" strokeWidth="2.6" />
      </g>

      <g className="mcp-illustration-key" transform="translate(97 69) rotate(12)">
        <path d={keyProfile} transform="translate(1 4)" fill={green} fillRule="evenodd" opacity=".24" />
        <path d={keyProfile} fill={paper} fillRule="evenodd" />
        <path d={keyProfile} fill={`url(#${id}-metal)`} stroke={green} strokeWidth="1.5" fillRule="evenodd" strokeLinejoin="round" />
        <path d={keyProfile} fill={`url(#${id}-engraving)`} fillRule="evenodd" />
        <g stroke={gold} strokeLinecap="round" strokeLinejoin="round">
          <path d="M42-9C38-21 29-26 21-23 15-36 5-40-4-39-16-38-21-29-18-20-30-20-37-14-37-4m2 11c4 6 10 6 16 5-3 12 3 19 14 21 11 1 19-4 23-15 9 5 20 0 24-11" />
          <path d="M46-5h21l9-6m-30 16h21l9 6m20-16h124m-124 9h126M178 10v16h8m19-7v8h6" />
          <path d="M77-14v28m8-27v26m-4-17v8" />
          <path d="m111-5 6 4-6 4m10-8 6 4-6 4m42-8-6 4 6 4m-10-8-6 4 6 4m-19-4 3-3 3 3-3 3Z" />
        </g>
        <g fill={green} opacity=".82">
          <circle cx="-25" cy="-16" r="1.4" />
          <circle cx="25" cy="-18" r="1.4" />
          <circle cx="24" cy="17" r="1.4" />
          <circle cx="-8" cy="30" r="1.4" />
        </g>
      </g>
    </svg>
  )
}
