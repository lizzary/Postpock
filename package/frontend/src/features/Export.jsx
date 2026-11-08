import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Icon, PlatformBadge } from '../components/UI.jsx';
import { local } from '../data/library.js';
import {
  buildExportTree, cleanFilenameInput, getAuthorPosts, getDatePosts, getExportDraft,
  getExportKeys, getExtensionOptions, isSingleDay, localDate, saveExportDraft,
} from '../data/export.js';
import './export.css';

const copy = {
  zh: {
    eyebrow: '档案工作台', title: '导出馆藏', description: '挑选收藏，按自己的方式整理到一个文件夹。',
    collection: '选择收藏', creators: '作者', allCreators: '所有作者', noCreators: '选择作者',
    dates: '发布日期', allDates: '不限日期', day: '单日', range: '日期范围', today: '今天',
    dateStart: '开始日期', dateEnd: '结束日期', dateError: '请选择有效的日期范围。',
    posts: '当日投稿', noPosts: '所选作者在当天没有投稿。',
    fileTypes: '文件类型', allTypes: '所有类型', noTypes: '选择类型', noExtension: '无扩展名',
    emptyTypes: '没有可选的文件类型。', selectAll: '全选', selectNone: '清除',
    organize: '整理文件', destination: '导出路径', browse: '选择目录',
    directorySuggestions: '示例目录', pathPlaceholder: '输入导出目录',
    pickedDirectory: '浏览器已填入目录名称。也可手动输入完整路径。',
    pattern: '文件名与相对路径', patternPlaceholder: '输入文字，或插入一个字段',
    patternHint: '用 / 划分目录。字段会替换为对应的档案信息。',
    aggregation: '聚合键', data: '数据键', removeKey: '移除字段',
    previewEyebrow: '文件夹预览', preview: '整理后的馆藏', fileLimit: '每层文件数',
    root: '导出目录', emptyPreview: '这个范围内暂无可导出的文件。',
    adjustPreview: '修正文件名后即可预览。', shownMore: (count) => `… 另有 ${count} 个文件`,
    files: (count) => `${count} 个文件`, selected: (count) => `已选 ${count} 项`,
    errors: { empty: '请填写文件名。', key: '当前作者范围内有字段不可用，请移除后再试。',
      characters: '文件名包含不允许的字符。', relative: '请使用有效的相对路径，避免空目录名、保留名称、. 和 ..。' },
    cancel: '取消', submit: '生成导出计划', exported: (count) => `已生成 ${count} 个文件的导出计划`,
  },
  en: {
    eyebrow: 'Archive studio', title: 'Export your collection', description: 'Choose what to keep and give it a folder structure of its own.',
    collection: 'Choose the contents', creators: 'Creators', allCreators: 'All creators', noCreators: 'Choose creators',
    dates: 'Publication date', allDates: 'All dates', day: 'One day', range: 'Date range', today: 'Today',
    dateStart: 'Start date', dateEnd: 'End date', dateError: 'Choose a valid date range.',
    posts: 'Posts on this day', noPosts: 'These creators have no posts on this day.',
    fileTypes: 'File types', allTypes: 'All types', noTypes: 'Choose file types', noExtension: 'No extension',
    emptyTypes: 'There are no file types to choose from.', selectAll: 'Select all', selectNone: 'Clear',
    organize: 'Arrange the files', destination: 'Destination', browse: 'Choose folder',
    directorySuggestions: 'Sample locations', pathPlaceholder: 'Enter an export folder',
    pickedDirectory: 'The browser filled in the folder name. You can also enter a full path.',
    pattern: 'Filename and relative path', patternPlaceholder: 'Type a name or insert a field',
    patternHint: 'Use / to create folders. Fields become names drawn from the archive.',
    aggregation: 'Grouping fields', data: 'Data fields', removeKey: 'Remove field',
    previewEyebrow: 'Folder preview', preview: 'Your arranged collection', fileLimit: 'Files per folder',
    root: 'Export folder', emptyPreview: 'There are no files in this selection.',
    adjustPreview: 'Adjust the filename to see a preview.', shownMore: (count) => `… ${count} more files`,
    files: (count) => `${count} ${count === 1 ? 'file' : 'files'}`, selected: (count) => `${count} selected`,
    errors: { empty: 'Enter a filename.', key: 'A field is unavailable for these creators. Remove it to continue.',
      characters: 'The filename contains an unsupported character.', relative: 'Use a relative path with valid folder names. Single and double dots are reserved.' },
    cancel: 'Cancel', submit: 'Create export plan', exported: (count) => `Export plan ready for ${count} ${count === 1 ? 'file' : 'files'}`,
  },
};

function toggleSelection(selection, options, value) {
  const next = new Set(selection ?? options);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next.size === options.length && options.every((option) => next.has(option)) ? null : [...next];
}

function OptionPicker({ label, summary, children }) {
  return (
    <div className="export-field">
      <span className="export-label">{label}</span>
      <details className="export-picker">
        <summary aria-label={`${label} · ${summary}`}><span>{summary}</span><Icon name="chevron-down" size={16} /></summary>
        <div className="export-picker-panel">{children}</div>
      </details>
    </div>
  );
}

function SelectionActions({ onAll, onNone, t }) {
  return (
    <div className="export-selection-actions">
      <button type="button" onClick={onAll}>{t.selectAll}</button>
      <button type="button" onClick={onNone}>{t.selectNone}</button>
    </div>
  );
}

function CreatorPicker({ authors, language, selection, onChange, t }) {
  const ids = authors.map(({ id }) => id);
  const chosen = authors.filter(({ id }) => selection?.includes(id));
  const summary = selection === null ? t.allCreators : chosen.length === 0 ? t.noCreators
    : chosen.length === 1 ? local(chosen[0].name, language) : t.selected(chosen.length);

  return (
    <OptionPicker label={t.creators} summary={summary}>
      <SelectionActions onAll={() => onChange(null)} onNone={() => onChange([])} t={t} />
      <div className="export-option-list">
        {authors.map((author) => (
          <label className="export-choice" key={author.id}>
            <input type="checkbox" checked={selection === null || selection.includes(author.id)}
              onChange={() => onChange(toggleSelection(selection, ids, author.id))} />
            <img className="export-choice-avatar" src={author.avatar} alt="" />
            <span>{local(author.name, language)}</span>
            <PlatformBadge platform={author.platform} showName={false} />
          </label>
        ))}
      </div>
    </OptionPicker>
  );
}

function ExtensionPicker({ extensions, selection, onChange, t }) {
  const chosen = extensions.filter((extension) => selection?.includes(extension));
  const summary = selection === null ? t.allTypes : chosen.length === 0 ? t.noTypes
    : chosen.length === 1 ? chosen[0] || t.noExtension : t.selected(chosen.length);

  return (
    <OptionPicker label={t.fileTypes} summary={summary}>
      {extensions.length ? <>
        <SelectionActions onAll={() => onChange(null)} onNone={() => onChange([])} t={t} />
        <div className="export-option-list export-option-columns">
          {extensions.map((extension) => (
            <label className="export-choice" key={extension}>
              <input type="checkbox" checked={selection === null || selection.includes(extension)}
                onChange={() => onChange(toggleSelection(selection, extensions, extension))} />
              <span>{extension ? `.${extension}` : t.noExtension}</span>
            </label>
          ))}
        </div>
      </> : <p className="export-panel-empty">{t.emptyTypes}</p>}
    </OptionPicker>
  );
}

function DateScope({ draft, datePosts, update, language, t }) {
  const dateError = draft.dateMode === 'range' && (!draft.start || !draft.end || draft.start > draft.end);
  const postOptions = datePosts.map(({ id }) => id);
  const selectedCount = draft.postIds === null ? datePosts.length : datePosts.filter(({ id }) => draft.postIds.includes(id)).length;

  return (
    <fieldset className="export-field export-date-scope">
      <legend className="export-label">{t.dates}</legend>
      <div className="export-date-toolbar">
        <div className="export-segments">
          {[['all', t.allDates], ['day', t.day], ['range', t.range]].map(([mode, label]) => (
            <button type="button" key={mode} aria-pressed={draft.dateMode === mode}
              onClick={() => draft.dateMode !== mode && update({ dateMode: mode, postIds: null })}>{label}</button>
          ))}
        </div>
        <button type="button" className="export-today" onClick={() => update({ dateMode: 'day', start: localDate(), postIds: null })}>
          <Icon name="calendar" size={14} />{t.today}
        </button>
      </div>
      {draft.dateMode !== 'all' && <div className="export-date-inputs">
        <input className="input" type="date" value={draft.start} aria-label={t.dateStart} aria-invalid={dateError}
          onChange={(event) => update({ start: event.target.value, postIds: null })} />
        {draft.dateMode === 'range' && <input className="input" type="date" value={draft.end} min={draft.start || undefined}
          aria-label={t.dateEnd} aria-invalid={dateError} onChange={(event) => update({ end: event.target.value, postIds: null })} />}
      </div>}
      {dateError && <p className="export-error" role="alert">{t.dateError}</p>}
      {isSingleDay(draft) && (
        <div className="export-posts">
          <div className="export-post-list-header">
            <span>{t.posts} <small>{t.selected(selectedCount)}</small></span>
            {datePosts.length > 0 && <SelectionActions onAll={() => update({ postIds: null })}
              onNone={() => update({ postIds: [] })} t={t} />}
          </div>
          <div className="export-option-list">
            {datePosts.length ? datePosts.map((post) => (
              <label className="export-choice" key={post.id}>
                <input type="checkbox" checked={draft.postIds === null || draft.postIds.includes(post.id)}
                  onChange={() => update({ postIds: toggleSelection(draft.postIds, postOptions, post.id) })} />
                <span>{local(post.title, language)}</span>
              </label>
            )) : <p className="export-panel-empty">{t.noPosts}</p>}
          </div>
        </div>
      )}
    </fieldset>
  );
}

function Destination({ path, onChange, t }) {
  const id = useId();
  const [pickedDirectory, setPickedDirectory] = useState(false);

  async function chooseDirectory(event) {
    if (!window.showDirectoryPicker) return;
    event.preventDefault();
    const menu = event.currentTarget.parentElement;
    if (menu.open) {
      menu.open = false;
      return;
    }
    try {
      const folder = await window.showDirectoryPicker();
      onChange(folder.name);
      setPickedDirectory(true);
    } catch (error) {
      if (error.name !== 'AbortError') menu.open = true;
    }
  }

  function editPath(value) {
    onChange(value);
    setPickedDirectory(false);
  }

  return (
    <div className="export-field">
      <label className="export-label" htmlFor={id}>{t.destination}</label>
      <div className="export-destination">
        <input id={id} className="input" value={path} placeholder={t.pathPlaceholder} autoComplete="off"
          aria-describedby={pickedDirectory ? `${id}-help` : undefined} onChange={(event) => editPath(event.target.value)} />
        <details className="export-directory-picker">
          <summary className="icon-button" aria-label={t.browse} title={t.browse} onClick={chooseDirectory}>
            <Icon name="folder" size={18} />
          </summary>
          <div className="export-picker-panel export-directory-options">
            <span>{t.directorySuggestions}</span>
            {['C:\\PostPock\\Exports', 'D:\\Archives\\PostPock'].map((suggestion) => (
              <button type="button" key={suggestion} onClick={(event) => {
                editPath(suggestion);
                event.currentTarget.closest('details').open = false;
              }}><Icon name="folder" size={15} />{suggestion}</button>
            ))}
          </div>
        </details>
      </div>
      {pickedDirectory && <p className="export-field-hint" id={`${id}-help`} role="status">{t.pickedDirectory}</p>}
    </div>
  );
}

function selectionRange(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.startContainer) && editor.contains(range.endContainer) ? range : null;
}

function selectRange(range) {
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function createToken(key) {
  const chip = document.createElement('span');
  chip.className = 'export-token';
  chip.dataset.key = key;
  chip.contentEditable = 'false';

  const label = document.createElement('span');
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'export-token-remove';
  chip.append(label, remove);
  return chip;
}

function labelToken(chip, labels, t) {
  const name = labels.get(chip.dataset.key);
  const label = name ?? chip.dataset.key.split(':').at(-1);
  chip.firstChild.textContent = label;
  chip.lastChild.setAttribute('aria-label', `${t.removeKey} · ${label}`);
  chip.classList.toggle('is-unavailable', !name);
}

function readPattern(editor) {
  const pattern = [];
  const range = selectionRange(editor);
  function read(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = cleanFilenameInput(node.data);
      if (text !== node.data) {
        const offset = range?.collapsed && range.startContainer === node
          ? cleanFilenameInput(node.data.slice(0, range.startOffset)).length : null;
        node.data = text;
        if (offset !== null) {
          range.setStart(node, offset);
          range.collapse(true);
        }
      }
      if (text && typeof pattern.at(-1) === 'string') pattern[pattern.length - 1] += text;
      else if (text) pattern.push(text);
    } else if (node instanceof HTMLElement && node.dataset.key) {
      pattern.push({ key: node.dataset.key });
    } else {
      node.childNodes.forEach(read);
    }
  }
  editor.childNodes.forEach(read);
  return pattern;
}

function adjacentToken(editor, range, before) {
  if (!range?.collapsed) return null;
  let { startContainer: node, startOffset: offset } = range;
  if (node.nodeType === Node.TEXT_NODE && (before ? offset > 0 : offset < node.length)) return null;
  const step = before ? 'previousSibling' : 'nextSibling';
  let neighbor = node.childNodes[offset - (before ? 1 : 0)];
  while (node && (!neighbor || (neighbor.nodeType === Node.TEXT_NODE && neighbor.length === 0))) {
    if (neighbor) node = neighbor;
    if (node === editor) return null;
    neighbor = node[step];
    if (!neighbor) node = node.parentNode;
  }
  return neighbor instanceof HTMLElement && neighbor.classList.contains('export-token') ? neighbor : null;
}

function FilenameEditor({ pattern, columns, labels, onChange, error, t }) {
  const id = useId();
  const wrapper = useRef(null);
  const editor = useRef(null);
  const initialPattern = useRef(pattern);
  const caret = useRef(null);
  const composing = useRef(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const element = editor.current;
    element.replaceChildren(...initialPattern.current.map((part) =>
      typeof part === 'string' ? document.createTextNode(part) : createToken(part.key)));

    function preventFormatting(event) {
      if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak' || event.inputType.startsWith('format')) {
        event.preventDefault();
      }
    }
    element.addEventListener('beforeinput', preventFormatting);
    return () => element.removeEventListener('beforeinput', preventFormatting);
  }, []);

  useLayoutEffect(() => {
    editor.current.querySelectorAll('.export-token').forEach((chip) => labelToken(chip, labels, t));
  }, [labels, t]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOutside(event) {
      if (!wrapper.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  function rememberCaret() {
    const range = selectionRange(editor.current);
    if (range) caret.current = range.cloneRange();
  }

  function syncPattern() {
    if (composing.current) return;
    onChange(readPattern(editor.current));
    rememberCaret();
  }

  function insert(node) {
    const range = selectionRange(editor.current) ?? caret.current ?? document.createRange();
    if (!editor.current.contains(range.startContainer)) {
      range.selectNodeContents(editor.current);
      range.collapse(false);
    }
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    editor.current.focus();
    selectRange(range);
    syncPattern();
  }

  function remove(chip) {
    const range = document.createRange();
    range.setStartBefore(chip);
    range.collapse(true);
    chip.remove();
    editor.current.focus();
    selectRange(range);
    syncPattern();
  }

  function insertKey(key) {
    const chip = createToken(key);
    labelToken(chip, labels, t);
    insert(chip);
  }

  function onKeyDown(event) {
    if (event.target !== editor.current || event.nativeEvent.isComposing) return;
    if (!['Backspace', 'Delete', 'Enter'].includes(event.key)) return;
    const range = selectionRange(editor.current);
    const chip = adjacentToken(editor.current, range, event.key !== 'Delete');
    if (event.key === 'Enter' || chip) event.preventDefault();
    if (chip) remove(chip);
  }

  return (
    <div className="export-field export-editor" ref={wrapper} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        editor.current.focus();
        setOpen(false);
      }
    }}>
      <span className="export-label" id={`${id}-label`}>{t.pattern}</span>
      <div className="export-pattern-wrap">
        <div ref={editor} className="input export-pattern" role="textbox" tabIndex={0} contentEditable
          suppressContentEditableWarning spellCheck={false} aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`} aria-invalid={Boolean(error)} data-empty={pattern.length === 0}
          data-placeholder={t.patternPlaceholder} onFocus={() => setOpen(true)} onPointerUp={rememberCaret}
          onKeyDown={onKeyDown} onKeyUp={rememberCaret} onInput={syncPattern} onDrop={(event) => event.preventDefault()}
          onClick={(event) => {
            setOpen(true);
            const removeButton = event.target.closest('.export-token-remove');
            if (removeButton) remove(removeButton.parentElement);
          }}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; syncPattern(); }}
          onPaste={(event) => {
            event.preventDefault();
            const value = cleanFilenameInput(event.clipboardData.getData('text'));
            if (value) insert(document.createTextNode(value));
          }} />
        <button type="button" className="icon-button export-open-keys" aria-label={`${t.aggregation} / ${t.data}`}
          aria-expanded={open} aria-controls={`${id}-keys`} onPointerDown={(event) => event.preventDefault()}
          onClick={() => setOpen((value) => !value)}><Icon name="plus" size={16} /></button>
      </div>
      {open && <div className="export-key-palette" id={`${id}-keys`}>
        {columns.map((keys, index) => (
          <section key={index} className="export-key-column">
            <h4>{index === 0 ? t.aggregation : t.data}</h4>
            <div className="export-key-options">
              {keys.map(({ id: key, label }) => (
                <button type="button" key={key} onPointerDown={(event) => event.preventDefault()}
                  onClick={() => insertKey(key)}>{label}</button>
              ))}
            </div>
          </section>
        ))}
      </div>}
      <p id={`${id}-help`} className={error ? 'export-error' : 'export-field-hint'} role={error ? 'alert' : undefined}>
        {error ? t.errors[error] : t.patternHint}
      </p>
    </div>
  );
}

function PreviewFolder({ folder, level, firstBranch, limit, t }) {
  const [open, setOpen] = useState(level === 0 || firstBranch);
  return (
    <details open={open} className="export-tree-folder" onToggle={(event) => {
      if (event.target === event.currentTarget) setOpen(event.currentTarget.open);
    }}>
      <summary className="export-tree-row">
        <Icon className="export-tree-caret" name="chevron-right" size={13} />
        <Icon className="export-folder-icon" name="folder" size={16} /><span title={folder.name}>{folder.name}</span>
      </summary>
      {open && <FolderContents folder={folder} level={level + 1} firstBranch={firstBranch} limit={limit} t={t} />}
    </details>
  );
}

function FolderContents({ folder, level, firstBranch, limit, t }) {
  return (
    <ul className="export-tree-level">
      {[...folder.folders.values()].map((child, index) => (
        <li key={child.id}>
          <PreviewFolder folder={child} level={level} firstBranch={firstBranch && index === 0} limit={limit} t={t} />
        </li>
      ))}
      {folder.files.slice(0, limit).map(({ name, resource }) => (
        <li className="export-tree-row export-tree-file" key={name}>
          <Icon name={resource === 'image' || resource === 'cover' ? 'image' : 'file'} size={15} />
          <span title={name}>{name}</span>
        </li>
      ))}
      {folder.files.length > limit && <li className="export-tree-more">{t.shownMore(folder.files.length - limit)}</li>}
    </ul>
  );
}

function ExportPreview({ preview, fileLimit, update, t }) {
  const { root, fileCount, error } = preview;
  const limit = Math.max(1, Math.floor(Number(fileLimit) || 5));
  return (
    <aside className="export-preview" aria-label={t.preview}>
      <div className="export-preview-top">
        <span className="export-preview-kicker"><Icon name="layers" size={15} />{t.previewEyebrow}</span>
        <h3>{t.preview}</h3>
      </div>
      <div className="export-preview-paper">
        <div className="export-tree-root">
          <Icon name="folder" size={21} /><strong title={root.name}>{root.name || t.root}</strong>
        </div>
        <div className="export-tree-scroll">
          {fileCount ? <FolderContents folder={root} level={0} firstBranch limit={limit} t={t} /> : (
            <p className="export-tree-empty"><Icon name="archive" size={23} />{error ? t.adjustPreview : t.emptyPreview}</p>
          )}
        </div>
        <div className="export-preview-footer">
          <span aria-live="polite">{t.files(fileCount)}</span>
          <label>{t.fileLimit}
            <input type="number" min="1" step="1" className="input" value={fileLimit}
              onChange={(event) => update({ fileLimit: event.target.value })}
              onBlur={() => update({ fileLimit: limit })} />
          </label>
        </div>
      </div>
    </aside>
  );
}

export default function Export({ onClose, authorId, postId, authors, posts, language, notify, databasePath }) {
  const t = copy[language] ?? copy.en;
  const [draft, setDraft] = useState(() => getExportDraft(authorId, posts.find(({ id }) => id === postId), databasePath));
  const authorPosts = useMemo(() => getAuthorPosts(authors, posts, draft.authorIds), [authors, posts, draft.authorIds]);
  const typePosts = useMemo(() => authorId ? getAuthorPosts(authors, posts, [authorId]) : posts, [authors, posts, authorId]);
  const extensions = useMemo(() => getExtensionOptions(typePosts), [typePosts]);
  const datePosts = useMemo(() => getDatePosts(authorPosts, draft), [authorPosts, draft]);
  const columns = useMemo(() => getExportKeys(authors, posts, draft.authorIds, language), [authors, posts, draft.authorIds, language]);
  const labels = useMemo(() => new Map(columns.flat().map(({ id, label }) => [id, label])), [columns]);
  const preview = useMemo(() => {
    const effectiveTypes = draft.extensions?.filter((extension) => extensions.includes(extension)) ?? extensions;
    return buildExportTree({ authors, posts: datePosts, draft: { ...draft, extensions: effectiveTypes }, keys: labels, language });
  }, [authors, datePosts, draft, extensions, labels, language]);

  useEffect(() => {
    if (!postId) saveExportDraft(authorId, draft, databasePath);
  }, [authorId, postId, draft, databasePath]);

  function update(fields) {
    setDraft((current) => ({ ...current, ...fields }));
  }

  return (
    <Dialog title={t.title} eyebrow={t.eyebrow} description={t.description} onClose={onClose} className="export-dialog" wide>
      <div className="export-layout">
        <div className="export-config">
          <section className="export-section" aria-label={t.collection}>
            <h3 className="export-section-title"><span aria-hidden="true">01</span>{t.collection}</h3>
            <CreatorPicker authors={authors} language={language} selection={draft.authorIds} t={t}
              onChange={(authorIds) => update({ authorIds, postIds: null })} />
            <DateScope draft={draft} datePosts={datePosts} update={update} language={language} t={t} />
            <ExtensionPicker extensions={extensions} selection={draft.extensions} t={t}
              onChange={(value) => update({ extensions: value })} />
          </section>
          <section className="export-section" aria-label={t.organize}>
            <h3 className="export-section-title"><span aria-hidden="true">02</span>{t.organize}</h3>
            <Destination path={draft.path} onChange={(path) => update({ path })} t={t} />
            <FilenameEditor pattern={draft.pattern} columns={columns} labels={labels} error={preview.error}
              onChange={(pattern) => update({ pattern })} t={t} />
          </section>
        </div>
        <ExportPreview preview={preview} fileLimit={draft.fileLimit} update={update} t={t} />
      </div>
      <footer className="export-actions">
        <button type="button" className="button button-quiet" onClick={onClose}>{t.cancel}</button>
        <button type="button" className="button button-primary" disabled={!draft.path.trim() || !preview.fileCount || Boolean(preview.error)}
          onClick={() => {
            notify(t.exported(preview.fileCount));
            onClose();
          }}><Icon name="download" size={17} />{t.submit}</button>
      </footer>
    </Dialog>
  );
}
