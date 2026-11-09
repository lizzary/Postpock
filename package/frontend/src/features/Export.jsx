import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AuthorPicker } from '../components/AuthorPicker.jsx';
import Popover from '../components/Popover.jsx';
import { Dialog, Icon } from '../components/UI.jsx';
import { local } from '../data/library.js';
import {
  buildExportTree, cleanFilenameInput, getAuthorPosts, getDatePosts, getExportDraft,
  getExportKeys, getExtensionOptions, isSingleDay, localDate, saveExportDraft,
} from '../data/export.js';
import { chooseExportDirectory } from '../data/exportDirectory.js';
import './export.css';

const copy = {
  zh: {
    title: '导出馆藏', collection: '导出范围', creators: '作者', allCreators: '所有作者', noCreators: '选择作者',
    dates: '发布日期', allDates: '不限日期', sameDay: '同一天', today: '今天',
    dateStart: '开始日期', dateEnd: '结束日期', datePlaceholder: '选择日期', dateError: '请选择有效的日期范围。',
    posts: '当日投稿', noPosts: '所选作者在当天没有投稿。',
    fileTypes: '文件类型', allTypes: '所有类型', noTypes: '选择类型', noExtension: '无扩展名',
    emptyTypes: '没有可选的文件类型。', selectAll: '全选', selectNone: '清除',
    organize: '整理文件', destination: '导出路径', browse: '选择目录',
    directorySuggestions: '示例目录', pathPlaceholder: '输入完整导出路径',
    browsing: '正在打开系统目录选择器', directoryUnavailable: '无法打开系统目录选择器，请输入完整路径。',
    pattern: '文件名与相对路径', patternPlaceholder: '输入文字，或插入一个字段', insertField: '插入字段',
    patternHint: '用 / 分隔文件夹。',
    aggregation: '聚合键', data: '数据键', removeKey: '移除字段', searchKeys: '搜索字段', noKeys: '没有匹配的字段。',
    keyGroups: { creator: '作者', post: '投稿', published: '发布时间', archived: '归档与导出时间', file: '文件',
      image: '图片属性', sequence: '文件序号', custom: '平台字段' },
    preview: '目录预览', fileLimit: '每层预览上限',
    root: '导出目录', emptyPreview: '这个范围内暂无可导出的文件。',
    adjustPreview: '修正文件名后即可预览。', shownMore: (count) => `… 另有 ${count} 个文件`,
    files: (count) => `${count} 个文件`, selected: (count) => `已选 ${count} 项`,
    errors: { empty: '请填写文件名。', key: '当前作者范围内有字段不可用，请移除后再试。',
      characters: '文件名包含不允许的字符。', relative: '请使用有效的相对路径，避免空目录名、保留名称、. 和 ..。' },
    cancel: '取消', submit: '生成导出计划', exported: (count) => `已生成 ${count} 个文件的导出计划`,
  },
  en: {
    title: 'Export collection', collection: 'Export scope', creators: 'Creators', allCreators: 'All creators', noCreators: 'Choose creators',
    dates: 'Publication date', allDates: 'All dates', sameDay: 'Same day', today: 'Today',
    dateStart: 'Start date', dateEnd: 'End date', datePlaceholder: 'Select date', dateError: 'Choose a valid date range.',
    posts: 'Posts on this day', noPosts: 'These creators have no posts on this day.',
    fileTypes: 'File types', allTypes: 'All types', noTypes: 'Choose file types', noExtension: 'No extension',
    emptyTypes: 'There are no file types to choose from.', selectAll: 'Select all', selectNone: 'Clear',
    organize: 'Arrange the files', destination: 'Destination', browse: 'Choose folder',
    directorySuggestions: 'Sample locations', pathPlaceholder: 'Enter the full export path',
    browsing: 'Opening the system folder picker', directoryUnavailable: 'The system folder picker is unavailable. Enter the full path.',
    pattern: 'Filename and relative path', patternPlaceholder: 'Type a name or insert a field', insertField: 'Insert field',
    patternHint: 'Use / to separate folders.',
    aggregation: 'Grouping fields', data: 'Data fields', removeKey: 'Remove field', searchKeys: 'Search fields', noKeys: 'No matching fields.',
    keyGroups: { creator: 'Creator', post: 'Post', published: 'Publication time', archived: 'Archive and export time', file: 'File',
      image: 'Image properties', sequence: 'File sequence', custom: 'Platform fields' },
    preview: 'Folder preview', fileLimit: 'Preview limit per folder',
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

function OptionPicker({ label, summary, minWidth, maxWidth, children }) {
  const id = useId();
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="export-field">
      <span className="export-label" id={`${id}-label`}>{label}</span>
      <button type="button" ref={anchor} className="input export-picker" aria-labelledby={`${id}-label ${id}-summary`}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span id={`${id}-summary`}>{summary}</span><Icon name="chevron-down" size={16} />
      </button>
      <Popover open={open} anchorRef={anchor} onDismiss={(reason) => {
        setOpen(false);
        if (reason === 'escape') anchor.current.focus({ preventScroll: true });
      }} className="export-picker-panel" id={id}
        minWidth={minWidth} maxWidth={maxWidth}>{children}</Popover>
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
  const ids = useMemo(() => authors.map(({ id }) => id), [authors]);
  const selectedIds = useMemo(() => {
    if (selection === null) return ids;
    const saved = new Set(selection);
    return ids.filter((id) => saved.has(id));
  }, [selection, ids]);
  const count = selectedIds.length;
  const summary = count === 0 ? t.noCreators : count === authors.length ? t.allCreators
    : count === 1 ? local(authors.find(({ id }) => id === selectedIds[0]).name, language) : t.selected(count);

  return (
    <OptionPicker label={t.creators} summary={summary} minWidth={530} maxWidth={650}>
      <AuthorPicker authors={authors} selectedIds={selectedIds} language={language}
        onChange={(next) => onChange(next.length && next.length === ids.length ? null : next)} />
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

function DateField({ label, placeholder, value, min, invalid, errorId, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <span className="export-date-control">
        <input className="input" type="date" value={value} min={min} aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined} onChange={(event) => onChange(event.target.value)} />
        {!value && <span className="export-date-placeholder" aria-hidden="true">{placeholder}</span>}
      </span>
    </label>
  );
}

function DateScope({ draft, datePosts, update, language, t }) {
  const allDates = draft.dateMode === 'all';
  const start = allDates ? '' : draft.start;
  const end = allDates ? '' : draft.dateMode === 'day' ? start : draft.end;
  const today = localDate();
  const dateError = !allDates && (!start || !end || start > end);
  const singleDay = !dateError && isSingleDay(draft);
  const postOptions = datePosts.map(({ id }) => id);
  const selected = new Set(draft.postIds ?? postOptions);
  const selectedCount = postOptions.filter((id) => selected.has(id)).length;
  const errorId = useId();

  function setDates(nextStart, nextEnd) {
    if (nextStart === start && nextEnd === end) return;
    update({ dateMode: nextStart || nextEnd ? 'range' : 'all', start: nextStart, end: nextEnd, postIds: null });
  }

  function setDay(day) {
    setDates(day, day);
  }

  return (
    <fieldset className="export-field export-date-scope">
      <legend className="export-label">{t.dates}</legend>
      <div className="export-date-card">
        <div className="export-date-inputs">
          <DateField label={t.dateStart} placeholder={t.datePlaceholder} value={start} invalid={dateError} errorId={errorId}
            onChange={(value) => setDates(value, allDates ? value : end)} />
          <Icon name="arrow-right" size={15} />
          <DateField label={t.dateEnd} placeholder={t.datePlaceholder} value={end} min={start || undefined}
            invalid={dateError} errorId={errorId} onChange={(value) => setDates(allDates ? value : start, value)} />
        </div>
        <div className="export-date-toolbar">
          <button type="button" aria-pressed={allDates} onClick={() => setDates('', '')}>{t.allDates}</button>
          <button type="button" aria-pressed={singleDay && start !== today} onClick={() => setDay(start || end || today)}>{t.sameDay}</button>
          <button type="button" aria-pressed={singleDay && start === today} onClick={() => setDay(today)}>
            <Icon name="calendar" size={14} />{t.today}
          </button>
        </div>
      </div>
      {dateError && <p className="export-error" role="alert" id={errorId}>{t.dateError}</p>}
      {singleDay && (
        <div className="export-posts">
          <div className="export-post-list-header">
            <span>{t.posts} <small>{t.selected(selectedCount)}</small></span>
            <SelectionActions onAll={() => update({ postIds: null })} onNone={() => update({ postIds: [] })} t={t} />
          </div>
          <div className="export-option-list">
            {datePosts.length ? datePosts.map((post) => (
              <label className="export-choice" key={post.id}>
                <input type="checkbox" checked={selected.has(post.id)}
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
  const anchor = useRef(null);
  const request = useRef(null);
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => () => request.current?.abort(), []);

  async function chooseDirectory() {
    if (request.current) return;
    if (open) {
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setChoosing(true);
    try {
      const folderPath = await chooseExportDirectory(controller.signal);
      if (folderPath && !controller.signal.aborted) onChange(folderPath);
    } catch {
      if (!controller.signal.aborted) setOpen(true);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setChoosing(false);
    }
  }

  return (
    <div className="export-field">
      <label className="export-label" htmlFor={id}>{t.destination}</label>
      <div className="export-destination">
        <input id={id} className="input" value={path} placeholder={t.pathPlaceholder} autoComplete="off"
          readOnly={choosing} onChange={(event) => onChange(event.target.value)} />
        <button type="button" ref={anchor} className="icon-button" aria-label={t.browse} title={choosing ? t.browsing : t.browse}
          aria-busy={choosing} aria-disabled={choosing}
          aria-expanded={open} aria-controls={`${id}-suggestions`} onClick={chooseDirectory}>
          <Icon name="folder" size={18} />
        </button>
        <Popover open={open} anchorRef={anchor} onDismiss={(reason) => {
          setOpen(false);
          if (reason === 'escape') anchor.current.focus({ preventScroll: true });
        }} className="export-picker-panel export-directory-options" id={`${id}-suggestions`} minWidth={240} align="end">
          <p className="export-directory-help" role="status">{t.directoryUnavailable}</p>
          <span>{t.directorySuggestions}</span>
          {['C:\\PostPock\\Exports', 'D:\\Archives\\PostPock'].map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => {
              onChange(suggestion);
              setOpen(false);
              anchor.current.focus({ preventScroll: true });
            }}><Icon name="folder" size={15} />{suggestion}</button>
          ))}
        </Popover>
      </div>
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

function KeyPalette({ columns, insertKey, t }) {
  const [search, setSearch] = useState('');
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return (
    <>
      <label className="export-key-search">
        <Icon name="search" size={16} />
        <input type="search" aria-label={t.searchKeys} placeholder={t.searchKeys} value={search}
          onChange={(event) => setSearch(event.target.value)} />
      </label>
      <div className="export-key-columns">
        {columns.map((keys, index) => {
          const title = index === 0 ? t.aggregation : t.data;
          const groups = new Map();
          for (const key of keys) {
            const text = `${key.keywords} ${t.keyGroups[key.group]} ${title}`.toLowerCase();
            if (!terms.every((term) => text.includes(term))) continue;
            if (!groups.has(key.group)) groups.set(key.group, []);
            groups.get(key.group).push(key);
          }
          return <section key={title} className="export-key-column" aria-label={title}>
            <h4><Icon name={index === 0 ? 'layers' : 'file'} size={15} />{title}</h4>
            <div className="export-key-options">
              {[...groups].map(([group, fields]) => (
                <div className="export-key-group" key={group}>
                  <h5>{t.keyGroups[group]}</h5>
                  <div className="export-key-tiles">
                    {fields.map(({ id, label }) => (
                      <button type="button" key={id} onPointerDown={(event) => event.preventDefault()}
                        onClick={() => insertKey(id)}>{label}</button>
                    ))}
                  </div>
                </div>
              ))}
              {groups.size === 0 && <p className="export-panel-empty">{t.noKeys}</p>}
            </div>
          </section>;
        })}
      </div>
    </>
  );
}

function FilenameEditor({ pattern, columns, labels, onChange, error, t }) {
  const id = useId();
  const anchor = useRef(null);
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
    editor.current.focus({ preventScroll: true });
    selectRange(range);
    syncPattern();
  }

  function remove(chip) {
    const range = document.createRange();
    range.setStartBefore(chip);
    range.collapse(true);
    chip.remove();
    editor.current.focus({ preventScroll: true });
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
    <div className="export-field">
      <span className="export-label" id={`${id}-label`}>{t.pattern}</span>
      <div className="export-pattern-wrap" ref={anchor}>
        <div ref={editor} className="input export-pattern" role="textbox" tabIndex={0} contentEditable
          suppressContentEditableWarning spellCheck={false} aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`} aria-invalid={Boolean(error)} data-empty={pattern.length === 0}
          data-placeholder={t.patternPlaceholder} onFocus={() => setOpen(true)} onPointerUp={rememberCaret} onBlur={rememberCaret}
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
        <button type="button" className="export-open-keys" aria-label={t.insertField} aria-expanded={open}
          aria-controls={`${id}-keys`} onPointerDown={(event) => event.preventDefault()} onClick={() => setOpen((value) => !value)}>
          <Icon name="plus" size={15} /><span>{t.insertField}</span>
        </button>
      </div>
      <Popover open={open} anchorRef={anchor} onDismiss={(reason) => {
        if (reason === 'escape' && !anchor.current.contains(document.activeElement)) {
          editor.current.focus({ preventScroll: true });
          if (caret.current) selectRange(caret.current);
        }
        setOpen(false);
      }} className="export-key-palette" id={`${id}-keys`} minWidth={590} maxWidth={700}>
        <KeyPalette columns={columns} insertKey={insertKey} t={t} />
      </Popover>
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

function ExportPreview({ preview, fileLimit, update, headingRef, t }) {
  const id = useId();
  const { root, fileCount, error } = preview;
  const limit = Math.max(1, Math.floor(Number(fileLimit) || 5));
  return (
    <aside className="export-preview" aria-labelledby={id}>
      <h3 id={id} ref={headingRef} tabIndex={-1}>{t.preview}</h3>
      <div className="export-preview-paper">
        <div className="export-tree-root">
          <Icon name="folder" size={18} /><strong title={root.name}>{root.name || t.root}</strong>
        </div>
        <div className="export-tree-scroll">
          {fileCount ? <FolderContents folder={root} level={0} firstBranch limit={limit} t={t} /> : (
            <p className="export-tree-empty"><Icon name="archive" size={23} />{error ? t.adjustPreview : t.emptyPreview}</p>
          )}
        </div>
        <div className="export-preview-footer">
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
  const previewHeading = useRef(null);
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
    <Dialog title={t.title} onClose={onClose} className="export-dialog" wide>
      <div className="export-layout">
        <div className="export-config">
          <section className="export-section" aria-label={t.collection}>
            <h3>{t.collection}</h3>
            <div className="export-scope-filters">
              <CreatorPicker authors={authors} language={language} selection={draft.authorIds} t={t}
                onChange={(authorIds) => update({ authorIds, postIds: null })} />
              <ExtensionPicker extensions={extensions} selection={draft.extensions} t={t}
                onChange={(value) => update({ extensions: value })} />
            </div>
            <DateScope draft={draft} datePosts={datePosts} update={update} language={language} t={t} />
          </section>
          <section className="export-section" aria-label={t.organize}>
            <h3>{t.organize}</h3>
            <Destination path={draft.path} onChange={(path) => update({ path })} t={t} />
            <FilenameEditor pattern={draft.pattern} columns={columns} labels={labels} error={preview.error}
              onChange={(pattern) => update({ pattern })} t={t} />
          </section>
        </div>
        <ExportPreview preview={preview} fileLimit={draft.fileLimit} update={update} headingRef={previewHeading} t={t} />
      </div>
      <footer className="export-actions">
        <div className="export-summary">
          <span className="export-file-count" role="status"><Icon name="file" size={16} />{t.files(preview.fileCount)}</span>
          <button type="button" className="export-preview-link" onClick={() => {
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            previewHeading.current.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
            previewHeading.current.focus({ preventScroll: true });
          }}>{t.preview}<Icon name="arrow-right" size={14} /></button>
        </div>
        <div className="export-action-buttons">
          <button type="button" className="button button-quiet" onClick={onClose}>{t.cancel}</button>
          <button type="button" className="button button-primary" disabled={!draft.path.trim() || !preview.fileCount || Boolean(preview.error)}
            onClick={() => {
              notify(t.exported(preview.fileCount));
              onClose();
            }}><Icon name="download" size={17} />{t.submit}</button>
        </div>
      </footer>
    </Dialog>
  );
}
