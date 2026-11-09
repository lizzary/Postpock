import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { AuthorPicker } from '../components/AuthorPicker.jsx'
import { Dialog, Icon } from '../components/UI.jsx'
import { local } from '../data/library.js'
import { MCP_PERMISSIONS, createMcpKey, deleteMcpKey, listMcpKeys, updateMcpKey } from '../data/mcp.js'
import { McpIllustration } from './McpIllustration.jsx'
import './mcp.css'

const copy = {
  zh: {
    settings: '返回设置', title: 'MCP 配置', eyebrow: '收藏馆 · 访问管理',
    hero: '接入管理Agent', intro: '让Agent管理库存。',
    keys: '馆藏密钥', count: (n) => `${n} 把`, create: '新建密钥', search: '按名称或密钥前缀查找',
    empty: '钥匙匣还是空的', emptyHint: '从新建一把密钥开始。', noMatch: '没有找到匹配的密钥。',
    back: '返回密钥列表', name: '密钥名称', placeholder: '例如：插画归档助手',
    scope: '访问域', permissions: '访问权限', rule: '作者在访问域内，且操作已获授权时才会放行。',
    author: '作者', post: '投稿', operation: '操作',
    actions: { read: '查询', create: '创建', update: '修改', delete: '删除' },
    permissionName: (group, action) => `${action}${group}`,
    authorCount: (n) => `${n} 位作者`, permissionCount: (n) => `${n} 项权限`,
    noAuthors: '馆藏中暂无作者。', removed: (n) => `${n} 位作者已不在馆藏中`,
    createdAt: '创建于', updatedAt: '更新于', edit: '编辑密钥', save: '保存更改',
    delete: '删除密钥', deleteQuestion: (name) => `删除「${name}」？`,
    deleteHint: '这把密钥及其访问配置将从当前收藏馆移除。', cancel: '取消',
    created: '密钥已创建', secretHint: '完整密钥仅在此处显示一次。离开前可以复制留存。', secret: '完整密钥',
    copy: '复制密钥', copied: '已复制', copyFailed: '无法自动复制，请选中密钥后手动复制。',
    done: '完成', saved: '访问配置已更新。', deleted: '密钥已删除。', retry: '重试',
    errors: {
      nameRequired: '请填写密钥名称。', nameTooLong: '密钥名称最多 80 个字符。',
      authorsRequired: '请至少选择一位作者。', permissionsRequired: '请至少选择一项权限。',
      invalidPermissions: '有权限选项已失效，请重新选择。', notFound: '这把密钥已被移除。',
      storageUnavailable: '无法读取或保存本地密钥，请重试。', randomUnavailable: '当前浏览器无法生成密钥。',
    },
  },
  en: {
    settings: 'Back to settings', title: 'MCP access', eyebrow: 'ARCHIVE ACCESS',
    hero: 'Connect a management agent', intro: 'Let the agent manage your inventory.',
    keys: 'Collection keys', count: (n) => `${n} ${n === 1 ? 'key' : 'keys'}`, create: 'New key', search: 'Find by name or key prefix',
    empty: 'The key case is empty', emptyHint: 'Create a key to get started.', noMatch: 'No matching keys.',
    back: 'Back to keys', name: 'Key name', placeholder: 'e.g. Illustration archive assistant',
    scope: 'Creator scope', permissions: 'Permissions', rule: 'An action must be granted and its creator must be in scope.',
    author: 'Creator', post: 'Post', operation: 'Action',
    actions: { read: 'Read', create: 'Create', update: 'Edit', delete: 'Delete' },
    permissionName: (group, action) => `${action} ${group.toLowerCase()}`,
    authorCount: (n) => `${n} ${n === 1 ? 'creator' : 'creators'}`, permissionCount: (n) => `${n} ${n === 1 ? 'permission' : 'permissions'}`,
    noAuthors: 'There are no creators in this collection.', removed: (n) => `${n} ${n === 1 ? 'creator is' : 'creators are'} no longer in the collection`,
    createdAt: 'Created', updatedAt: 'Updated', edit: 'Edit key', save: 'Save changes',
    delete: 'Delete key', deleteQuestion: (name) => `Delete “${name}”?`,
    deleteHint: 'This key and its access settings will be removed from the current collection.', cancel: 'Cancel',
    created: 'Key created', secretHint: 'The full key appears here once. Copy it before leaving this screen.', secret: 'Full key',
    copy: 'Copy key', copied: 'Copied', copyFailed: 'Automatic copy is unavailable. Select and copy the key manually.',
    done: 'Done', saved: 'Access settings updated.', deleted: 'Key deleted.', retry: 'Retry',
    errors: {
      nameRequired: 'Enter a key name.', nameTooLong: 'Use a key name of 80 characters or fewer.',
      authorsRequired: 'Select at least one creator.', permissionsRequired: 'Select at least one permission.',
      invalidPermissions: 'A permission is unavailable. Select your permissions again.', notFound: 'This key has been removed.',
      storageUnavailable: 'Unable to read or save local keys. Try again.', randomUnavailable: 'This browser could not generate a key.',
    },
  },
}

const resources = Object.keys(MCP_PERMISSIONS)
const actions = ['read', 'create', 'update', 'delete']
const blankDraft = { name: '', authorIds: [], permissions: [] }

function ErrorMessage({ message }) {
  return message && <p className="mcp-error" role="alert"><Icon name="alert" size={16} />{message}</p>
}

function KeyList({ records, authors, query, setQuery, onCreate, onSelect, onRetry, loadError, t }) {
  const term = query.trim().toLocaleLowerCase()
  const matches = records.filter(({ name, prefix }) => [name, prefix].some((value) => value.toLocaleLowerCase().includes(term)))
  const creatorIds = new Set(authors.map(({ id }) => id))

  return <>
    <section className="mcp-hero">
      <div className="mcp-hero-copy">
        <h3>{t.hero}</h3>
        <p>{t.intro}</p>
      </div>
      <McpIllustration />
    </section>
    <section className="mcp-shelf">
      <div className="mcp-shelf-heading">
        <div><h3>{t.keys}</h3><span>{t.count(records.length)}</span></div>
        <button type="button" className="button mcp-primary" onClick={onCreate} disabled={Boolean(loadError) || !authors.length}>
          <Icon name="plus" size={17} />{t.create}
        </button>
      </div>
      {loadError ? <div className="mcp-load-error">
        <ErrorMessage message={loadError} />
        <button className="button button-quiet" type="button" onClick={onRetry}><Icon name="refresh" size={16} />{t.retry}</button>
      </div> : records.length ? <>
        <div className="mcp-search">
          <Icon name="search" size={17} />
          <input className="input" type="search" value={query} aria-label={t.search} placeholder={t.search}
            onChange={(event) => setQuery(event.target.value)} />
        </div>
        {matches.length ? <ul className="mcp-key-list">
          {matches.map((record) => <li key={record.id}>
            <button type="button" className="mcp-key-row" onClick={() => onSelect(record.id)}>
              <span className="mcp-key-mark"><Icon name="key" size={19} /></span>
              <span className="mcp-key-label"><strong>{record.name}</strong><span>{record.prefix}…</span></span>
              <span className="mcp-key-meta">
                {t.authorCount(record.authorIds.filter((id) => creatorIds.has(id)).length)}
                <span>{t.permissionCount(record.permissions.length)}</span>
              </span>
              <Icon name="chevron-right" className="mcp-row-arrow" size={17} />
            </button>
          </li>)}
        </ul> : <p className="mcp-no-match" role="status">{t.noMatch}</p>}
      </> : <div className="mcp-empty">
        <span className="mcp-key-mark"><Icon name="key" size={23} /></span>
        <div><strong>{t.empty}</strong><p>{authors.length ? t.emptyHint : t.noAuthors}</p></div>
      </div>}
    </section>
  </>
}

function PermissionTable({ value, onChange, t }) {
  return <table className="mcp-matrix">
    <thead><tr><th scope="col">{t.operation}</th>
      {resources.map((resource) => <th key={resource} scope="col">
        <Icon name={resource === 'author' ? 'bookmark' : 'file'} size={15} />{t[resource]}
      </th>)}
    </tr></thead>
    <tbody>{actions.map((action) => <tr key={action}>
      <th scope="row">{t.actions[action]}</th>
      {resources.map((resource) => {
        const permission = `${resource}:${action}`
        const checked = value.includes(permission)
        return <td key={resource}>
          <label className="mcp-permission">
            <input className="archive-check" type="checkbox" checked={checked}
              aria-label={t.permissionName(t[resource], t.actions[action])}
              onChange={() => onChange(checked ? value.filter((item) => item !== permission) : [...value, permission])} />
          </label>
        </td>
      })}
    </tr>)}</tbody>
  </table>
}

function KeyForm({ record, authors, lang, t, formId, onSave, onChange }) {
  const name = useRef(null)
  const [draft, setDraft] = useState(() => record
    ? { ...record, authorIds: record.authorIds.filter((id) => authors.some((author) => author.id === id)) }
    : blankDraft)
  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    onChange()
  }

  useLayoutEffect(() => { name.current.focus({ preventScroll: true }) }, [])

  return <form id={formId} className="mcp-form" onSubmit={(event) => {
    event.preventDefault()
    onSave(draft)
  }}>
    <label className="field mcp-name">
      {t.name}<input className="input" ref={name} value={draft.name} maxLength={80} autoComplete="off"
        placeholder={t.placeholder} onChange={(event) => update('name', event.target.value)} />
    </label>
    <div className="mcp-form-grid">
      <section className="mcp-form-section">
        <div className="mcp-section-heading"><span aria-hidden="true">01</span><h3>{t.scope}</h3></div>
        <AuthorPicker authors={authors} selectedIds={draft.authorIds} language={lang}
          onChange={(value) => update('authorIds', value)} />
      </section>
      <section className="mcp-form-section">
        <div className="mcp-section-heading"><span aria-hidden="true">02</span><h3>{t.permissions}</h3></div>
        <PermissionTable value={draft.permissions} onChange={(value) => update('permissions', value)} t={t} />
        <p className="mcp-rule"><Icon name="info" size={17} />{t.rule}</p>
      </section>
    </div>
  </form>
}

function KeyDetail({ record, authors, lang, t }) {
  const scopedAuthors = authors.filter(({ id }) => record.authorIds.includes(id))
  const removedCount = record.authorIds.length - scopedAuthors.length
  const date = new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'zh-CN', { dateStyle: 'medium' })

  return <>
    <div className="mcp-key-stub">
      <span className="mcp-key-mark"><Icon name="key" size={23} /></span>
      <div><strong>{record.prefix}…</strong>
        <p>{t.createdAt} {date.format(new Date(record.createdAt))}
          {record.updatedAt !== record.createdAt && <span>{t.updatedAt} {date.format(new Date(record.updatedAt))}</span>}
        </p>
      </div>
    </div>
    <div className="mcp-form-grid mcp-detail-grid">
      <section className="mcp-form-section">
        <div className="mcp-section-heading"><span aria-hidden="true">01</span><h3>{t.scope}</h3></div>
        {scopedAuthors.length > 0 && <ul className="mcp-creator-list">
          {scopedAuthors.map((author) => <li key={author.id}>
            {author.avatar && <img src={author.avatar} width="27" height="27" alt="" />}
            <span>{local(author.name, lang)}</span>
          </li>)}
        </ul>}
        {removedCount > 0 && <p className="mcp-detail-note">{t.removed(removedCount)}</p>}
      </section>
      <section className="mcp-form-section">
        <div className="mcp-section-heading"><span aria-hidden="true">02</span><h3>{t.permissions}</h3></div>
        <div className="mcp-grants">
          {resources.map((resource) => {
            const granted = actions.filter((action) => record.permissions.includes(`${resource}:${action}`))
            return <div key={resource}><strong>{t[resource]}</strong>
              {granted.length ? <ul>{granted.map((action) => <li key={action}>{t.actions[action]}</li>)}</ul> : <span aria-hidden="true">—</span>}
            </div>
          })}
        </div>
      </section>
    </div>
  </>
}

function KeySecret({ secret, t }) {
  const input = useRef(null)
  const [status, setStatus] = useState('')

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(secret)
      setStatus('copied')
    } catch {
      input.current?.select()
      setStatus('failed')
    }
  }

  return <section className="mcp-secret">
    <span className="mcp-key-mark"><Icon name="key" size={24} /></span>
    <p>{t.secretHint}</p>
    <div className="mcp-secret-controls">
      <input className="input" ref={input} type="text" readOnly value={secret} aria-label={t.secret}
        autoComplete="off" spellCheck={false} onFocus={(event) => event.target.select()} />
      <button type="button" className="button button-soft" onClick={copyKey}>
        <Icon name={status === 'copied' ? 'check' : 'file'} size={17} />{status === 'copied' ? t.copied : t.copy}
      </button>
    </div>
    <p className="mcp-secret-status" role="status">{status === 'copied' ? t.copied : status === 'failed' ? t.copyFailed : ''}</p>
  </section>
}

function loadKeys(databasePath) {
  try {
    return { records: listMcpKeys(databasePath), error: '' }
  } catch (error) {
    return { records: [], error: error.code ?? 'storageUnavailable' }
  }
}

export function Mcp({ lang, authors, databasePath, onBack, onClose }) {
  const t = copy[lang] ?? copy.zh
  const formId = useId()
  const viewport = useRef(null)
  const navigation = useRef(null)
  const [{ records, error: loadError }, setLibrary] = useState(() => loadKeys(databasePath))
  const [screen, setScreen] = useState({ type: 'list' })
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { type, id, secret } = screen
  const record = records.find((entry) => entry.id === id)
  const editing = type === 'edit'
  const form = type === 'create' || editing

  useLayoutEffect(() => {
    viewport.current.scrollTop = 0
    if (!form) navigation.current?.focus({ preventScroll: true })
  }, [type, form])

  useEffect(() => {
    if (type !== 'list') return
    const refresh = () => setLibrary(loadKeys(databasePath))
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [databasePath, type])

  function go(type, id, secret) {
    setError('')
    setNotice('')
    setScreen({ type, id, secret })
    if (type === 'list') setLibrary(loadKeys(databasePath))
  }

  function leaveStep() {
    if (type === 'list') onBack()
    else if (editing || type === 'delete') go('detail', id)
    else go('list')
  }

  function save(draft) {
    try {
      if (editing) {
        updateMcpKey(id, draft, databasePath)
        go('detail', id)
        setNotice(t.saved)
      } else {
        const result = createMcpKey(draft, databasePath)
        setQuery('')
        go('secret', result.key.id, result.secret)
      }
      setLibrary(loadKeys(databasePath))
    } catch (failure) {
      setError(t.errors[failure.code] ?? t.errors.storageUnavailable)
    }
  }

  function remove() {
    try {
      deleteMcpKey(id, databasePath)
      go('list')
      setNotice(t.deleted)
    } catch (failure) {
      setError(t.errors[failure.code] ?? t.errors.storageUnavailable)
    }
  }

  const title = { list: t.title, create: t.create, edit: t.edit, detail: record?.name, delete: t.delete, secret: t.created }[type]
  const backLabel = type === 'list' ? t.settings : editing || type === 'delete' ? t.cancel : t.back

  return <Dialog title={title} eyebrow={t.eyebrow} className="mcp-dialog" wide onClose={onClose}>
    <div className="mcp-body" ref={viewport}>
      <div className="mcp-body-inner" key={type}>
        {type === 'list' && <KeyList records={records} authors={authors} query={query} setQuery={setQuery} t={t}
          loadError={loadError && (t.errors[loadError] ?? t.errors.storageUnavailable)}
          onRetry={() => setLibrary(loadKeys(databasePath))} onCreate={() => go('create')} onSelect={(id) => go('detail', id)} />}
        {form && <KeyForm record={record} authors={authors} lang={lang} t={t} formId={formId}
          onSave={save} onChange={() => setError('')} />}
        {type === 'detail' && record && <KeyDetail record={record} authors={authors} lang={lang} t={t} />}
        {type === 'delete' && record && <div className="mcp-confirm">
          <span className="mcp-key-mark"><Icon name="trash" size={23} /></span>
          <h3>{t.deleteQuestion(record.name)}</h3><p>{t.deleteHint}</p>
        </div>}
        {type === 'secret' && <KeySecret secret={secret} t={t} />}
        <div className="mcp-notice" role="status">{notice && <><Icon name="check-circle" size={17} />{notice}</>}</div>
      </div>
    </div>
    <footer className="mcp-footer">
      <ErrorMessage message={error} />
      <button ref={navigation} type="button" className="button button-quiet mcp-back" onClick={leaveStep}>
        <Icon name="arrow-left" size={17} />{backLabel}
      </button>
      {form && <button type="submit" form={formId} className="button mcp-primary">
        <Icon name={editing ? 'check' : 'key'} size={17} />{editing ? t.save : t.create}
      </button>}
      {type === 'detail' && <div className="mcp-footer-actions">
        <button type="button" className="button button-danger" onClick={() => go('delete', id)}><Icon name="trash" size={16} />{t.delete}</button>
        <button type="button" className="button mcp-primary" onClick={() => go('edit', id)}><Icon name="edit" size={16} />{t.edit}</button>
      </div>}
      {type === 'delete' && <button type="button" className="button button-danger button-danger-solid" onClick={remove}>
        <Icon name="trash" size={17} />{t.delete}
      </button>}
      {type === 'secret' && <button type="button" className="button mcp-primary" onClick={() => go('list')}><Icon name="check" size={17} />{t.done}</button>}
    </footer>
  </Dialog>
}
