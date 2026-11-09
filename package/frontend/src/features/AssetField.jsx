import { useState } from 'react'
import { Icon } from '../components/UI.jsx'
import { readLocalFile } from '../data/localFiles.js'

export default function AssetField({ label, value, onChange, accept, language, placeholder, validate = true }) {
  const en = language === 'en'
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [fileName, setFileName] = useState('')
  const isLocal = value?.startsWith('data:')
  const isFixture = value?.startsWith('./') || value?.startsWith('/')
  const sourceLabel = isLocal ? fileName || (en ? 'Local file' : '本地文件') : isFixture ? value.split('/').pop() : value

  async function chooseFile(event) {
    const file = event.target.files[0]
    if (!file) return
    event.target.value = ''
    setError('')
    setPending(true)
    let source
    try {
      source = await readLocalFile(file)
    } catch {
      setError(en ? 'This file could not be read.' : '无法读取此文件。')
      return
    } finally {
      setPending(false)
    }
    setFileName(file.name)
    onChange(source, file)
  }

  return <div className="asset-field field">
    <label><span>{label}</span>
      <input className="input" type={validate && !isLocal && !isFixture ? 'url' : 'text'} value={sourceLabel || ''}
        readOnly={isLocal || isFixture} inputMode="url"
        placeholder={placeholder ?? (en ? 'https://…' : '输入网址或选取本地文件')}
        pattern={validate && !isLocal && !isFixture ? 'https?://.+' : undefined}
        onChange={(event) => onChange(event.target.value)} />
    </label>
    <label className="button button-soft file-picker"><Icon name="folder" size={16} />{pending ? (en ? 'Reading…' : '读取中…') : (en ? 'Browse' : '浏览')}
      <input type="file" accept={accept} onChange={chooseFile} disabled={pending} />
    </label>
    {value && <button className="icon-button" type="button" onClick={() => { setFileName(''); onChange('') }}
      aria-label={en ? 'Remove file' : '移除文件'}><Icon name="x" size={16} /></button>}
    {error && <p className="field-error" role="status">{error}</p>}
  </div>
}
