import { useId, useLayoutEffect, useRef } from 'react'

const strokes = [
  // The cover is one broad stroke, just outside the page block.
  {
    beats: 1.75, width: 12,
    guide: 'M 126 267 C 115 284 102 301 89 314 C 172 301 254 317 319 341 C 386 318 475 300 558 314 Q 552 297 544 281',
    ink: 'M 126 267 C 116 286 105 302 98 311 C 180 297 254 313 319 338 C 392 314 470 298 551 311 Q 548 295 544 281 Q 553 298 559 314 Q 560 316 557 316 C 472 303 392 319 321 343 Q 319 344 317 343 C 245 317 169 306 89 316 Q 86 316 89 313 C 101 301 116 284 126 267 Z',
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
    guide: 'M 118 277 C 116 287 117 298 120 304 C 199 297 257 310 315 331 Q 322 334 330 330 C 392 308 472 293 541 304 Q 546 296 544 277',
    ink: 'M 118 277 C 117 287 118 298 121 303 C 193 295 253 307 316 330 Q 322 332 329 329 C 393 307 473 292 541 303 Q 544 296 544 277 Q 547 296 542 305 C 474 296 391 310 330 331 Q 323 335 314 332 C 253 312 194 299 120 306 Q 117 305 117 300 Q 115 288 118 277 Z',
  },
  {
    beats: 0.27, width: 4, tone: 'detail',
    guide: 'M 122 283 C 175 278 242 290 302 310',
    ink: 'M 122 283 C 177 276 243 288 302 310 C 239 291 175 280 122 283 Z',
  },
  {
    beats: 0.26, width: 4, tone: 'detail',
    guide: 'M 128 296 C 174 290 259 305 308 322',
    ink: 'M 128 296 C 178 288 255 302 308 322 C 256 306 175 291 128 296 Z',
  },
  {
    beats: 0.25, width: 4, tone: 'detail',
    guide: 'M 334 313 C 397 290 472 277 535 283',
    ink: 'M 334 313 C 395 289 473 275 535 283 C 472 279 396 292 334 313 Z',
  },
  {
    beats: 0.25, width: 4, tone: 'detail',
    guide: 'M 349 321 C 407 301 482 291 538 297',
    ink: 'M 349 321 C 407 299 483 289 538 297 C 481 292 407 302 349 321 Z',
  },
  {
    beats: 0.23, width: 4, tone: 'detail',
    guide: 'M 322 268 C 322 278 321 288 320 297',
    ink: 'M 322 268 C 323 278 322 290 320 297 C 320 285 320 277 322 268 Z',
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
    guide: 'M 322 265 C 329 231 316 205 316 177 C 316 157 324 140 335 125',
    ink: 'M 322 265 C 324 231 309 206 312 177 C 313 154 324 136 335 125 C 327 142 321 157 321 179 C 320 199 333 233 322 265 Z',
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
