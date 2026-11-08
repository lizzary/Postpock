import { useId, useLayoutEffect, useRef } from 'react'

const strokes = [
  // The cover is one broad stroke, just outside the page block.
  {
    beats: 1.75, width: 12,
    guide: 'M 126 267 C 115 279 102 289 89 299 C 172 286 254 301 319 325 C 386 302 475 285 558 299 Q 552 289 544 281',
    ink: 'M 126 267 C 116 280 105 290 98 296 C 180 282 254 297 319 322 C 392 298 470 283 551 296 Q 548 287 544 281 Q 553 289 559 299 Q 560 301 557 301 C 472 288 392 303 321 327 Q 319 328 317 327 C 245 301 169 291 89 301 Q 86 301 89 298 C 101 288 116 277 126 267 Z',
  },
  // Top leaves of the book.
  {
    beats: 1.05, width: 7,
    guide: 'M 319 230 C 276 209 221 204 170 213 C 153 239 140 259 118 276 C 187 269 252 280 314 300',
    ink: 'M 319 230 C 270 211 224 207 171 215 C 155 240 143 259 122 274 C 193 267 250 280 314 300 C 247 282 184 272 118 278 Q 115 278 117 275 C 138 259 151 237 168 213 Q 169 211 172 211 C 224 203 279 209 319 230 Z',
  },
  {
    beats: 1.08, width: 7,
    guide: 'M 329 230 C 374 206 443 200 495 211 C 513 236 526 260 544 274 C 474 265 391 278 328 299',
    ink: 'M 329 230 C 378 205 444 198 496 210 C 513 233 528 258 545 273 Q 547 276 544 276 C 473 266 391 280 328 299 C 386 277 472 263 540 272 C 523 257 510 234 494 213 C 440 202 375 209 329 230 Z',
  },
  {
    beats: 0.54, width: 6, tone: 'page',
    guide: 'M 118 277 C 117 282 118 287 120 290 C 199 283 257 295 315 315 Q 322 318 330 314 C 392 293 472 279 541 289 Q 545 284 544 277',
    ink: 'M 118 277 C 118 283 119 286 121 289 C 193 281 253 292 316 314 Q 322 316 329 313 C 393 291 473 277 541 288 Q 543 285 544 277 Q 546 284 542 290 C 474 281 391 294 330 315 Q 323 319 314 316 C 253 296 194 285 120 292 Q 117 292 117 287 Q 116 282 118 277 Z',
  },
  {
    beats: 0.27, width: 4, tone: 'detail',
    guide: 'M 122 280 C 175 275 242 284 302 303',
    ink: 'M 122 280 C 177 273 243 282 302 303 C 239 285 175 277 122 280 Z',
  },
  {
    beats: 0.26, width: 4, tone: 'detail',
    guide: 'M 128 286 C 174 280 259 295 308 310',
    ink: 'M 128 286 C 178 278 255 292 308 310 C 256 296 175 281 128 286 Z',
  },
  {
    beats: 0.25, width: 4, tone: 'detail',
    guide: 'M 334 305 C 397 283 472 272 535 278',
    ink: 'M 334 305 C 395 282 473 270 535 278 C 472 274 396 285 334 305 Z',
  },
  {
    beats: 0.25, width: 4, tone: 'detail',
    guide: 'M 349 307 C 407 289 482 280 538 285',
    ink: 'M 349 307 C 407 287 483 278 538 285 C 481 281 407 290 349 307 Z',
  },
  {
    beats: 0.23, width: 4, tone: 'detail',
    guide: 'M 321 244 C 321 258 321 280 320 297',
    ink: 'M 321 244 C 322 259 323 281 320 297 C 320 278 319 263 321 244 Z',
  },
  {
    beats: 0.24, width: 4, tone: 'detail',
    guide: 'M 168 246 C 190 241 216 242 238 246',
    ink: 'M 168 246 C 191 239 217 240 238 246 C 214 243 190 243 168 246 Z',
  },
  {
    beats: 0.21, width: 4, tone: 'detail',
    guide: 'M 165 254 C 177 252 190 251 201 252',
    ink: 'M 165 254 C 177 250 192 250 201 252 C 191 252 176 254 165 254 Z',
  },
  {
    beats: 0.26, width: 4, tone: 'detail',
    guide: 'M 421 247 C 442 240 468 238 490 239',
    ink: 'M 421 247 C 443 238 469 237 490 239 C 468 240 442 241 421 247 Z',
  },
  // The firmer stem and the light contours split where the pen lifts.
  {
    beats: 1.1, width: 15,
    guide: 'M 323 242 C 326 219 315 199 316 177 C 316 157 324 140 335 125',
    ink: 'M 323 242 C 325 220 310 199 312 177 C 313 154 324 136 335 125 C 327 142 321 157 321 179 C 320 198 332 221 323 242 Z',
  },
  {
    beats: 0.66, width: 9,
    guide: 'M 318 156 C 305 122 265 94 210 85',
    ink: 'M 318 156 C 304 123 262 96 210 85 C 262 91 307 117 318 156 Z',
  },
  {
    beats: 0.63, width: 8,
    guide: 'M 210 87 C 218 123 262 157 318 164',
    ink: 'M 210 87 C 222 122 261 153 318 164 C 263 160 215 126 210 87 Z',
  },
  {
    beats: 0.38, width: 5, tone: 'page',
    guide: 'M 315 159 C 289 144 264 117 229 96',
    ink: 'M 315 159 C 286 146 263 118 229 96 C 264 115 289 143 315 159 Z',
  },
  {
    beats: 0.24, width: 4, tone: 'detail',
    guide: 'M 287 141 Q 273 143 257 136',
    ink: 'M 287 141 Q 272 145 257 136 Q 274 141 287 141 Z',
  },
  {
    beats: 0.67, width: 9,
    guide: 'M 327 146 C 342 105 388 72 445 65',
    ink: 'M 327 146 C 340 103 389 69 445 65 C 388 75 345 108 327 146 Z',
  },
  {
    beats: 0.73, width: 9,
    guide: 'M 444 67 C 438 106 389 145 333 152',
    ink: 'M 444 67 C 442 104 389 147 333 152 C 389 142 434 105 444 67 Z',
  },
  {
    beats: 0.41, width: 5, tone: 'page',
    guide: 'M 333 149 C 357 128 392 102 424 80',
    ink: 'M 333 149 C 355 127 392 101 424 80 C 393 104 357 130 333 149 Z',
  },
  {
    beats: 0.43, width: 4, tone: 'detail',
    guide: 'M 371 120 C 369 112 372 102 380 95',
    ink: 'M 371 120 C 367 110 371 101 380 95 C 373 102 370 111 371 120 Z',
  },
]

const loopDuration = 16800
const totalBeats = strokes.reduce((total, stroke) => total + stroke.beats, 0)

export default function ArchiveSketch() {
  const id = useId()
  const svg = useRef(null)

  useLayoutEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const guides = svg.current.querySelectorAll('.archive-sketch-guide')
    let animations = []

    function stop() {
      animations.forEach((animation) => animation.cancel())
      animations = []
    }

    function update() {
      stop()
      if (preference.matches) return

      const startTime = document.timeline.currentTime
      let elapsed = 0
      animations = Array.from(guides, (guide, index) => {
        const from = elapsed / totalBeats
        elapsed += strokes[index].beats
        const to = elapsed / totalBeats
        const easing = 'cubic-bezier(.42, 0, .58, 1)'
        // Reveal the tapered ink through its guide, then erase from the same end.
        const animation = guide.animate([
          { offset: 0, strokeDashoffset: '1' },
          { offset: from * .49, strokeDashoffset: '1', easing },
          { offset: to * .49, strokeDashoffset: '0' },
          { offset: .64 + from * .36, strokeDashoffset: '0', easing },
          { offset: .64 + to * .36, strokeDashoffset: '-1' },
          { offset: 1, strokeDashoffset: '-1' },
        ], { duration: loopDuration, iterations: Infinity })
        animation.startTime = startTime
        return animation
      })
    }

    update()
    preference.addEventListener('change', update)
    return () => {
      stop()
      preference.removeEventListener('change', update)
    }
  }, [])

  return <svg ref={svg} className="archive-sketch" viewBox="43 30 560 330" aria-hidden="true" focusable="false">
    <defs>
      {strokes.map(({ guide, width }, index) => <mask key={guide} id={`${id}-stroke-${index}`}>
        <path className="archive-sketch-guide" d={guide} pathLength="1" stroke="white" strokeWidth={width}
          strokeLinejoin="round" fill="none" />
      </mask>)}
    </defs>
    {strokes.map(({ ink, tone }, index) => <path key={ink} d={ink} fill="currentColor"
      className={tone ? `archive-sketch-${tone}` : undefined} mask={`url(#${id}-stroke-${index})`} />)}
  </svg>
}
