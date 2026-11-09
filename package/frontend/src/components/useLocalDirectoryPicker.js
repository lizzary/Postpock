import { useEffect, useRef, useState } from 'react'
import { chooseLocalDirectory } from '../data/localDirectory.js'

export function useLocalDirectoryPicker(onSelect, onUnavailable) {
  const request = useRef(null)
  const [choosing, setChoosing] = useState(false)

  useEffect(() => () => request.current?.abort(), [])

  async function chooseDirectory() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setChoosing(true)
    try {
      const path = await chooseLocalDirectory(controller.signal)
      if (path && !controller.signal.aborted) onSelect(path)
    } catch {
      if (!controller.signal.aborted) onUnavailable()
    } finally {
      request.current = null
      if (!controller.signal.aborted) setChoosing(false)
    }
  }

  return { choosing, chooseDirectory }
}
