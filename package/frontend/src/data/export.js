import { local } from './library.js';

const creatorKeys = [['authorName', '作者名', 'Creator name'], ['authorId', '作者 ID', 'Creator ID']];
const postKeys = [['postTitle', '投稿标题', 'Post title'], ['postId', '投稿 ID', 'Post ID']];
const publicationKeys = [
  ['publishedAt', '发布日期', 'Publication date'], ['year', '发布年', 'Publication year'],
  ['month', '发布月', 'Publication month'], ['day', '发布日', 'Publication day'],
];
const archiveDateKey = ['archivedAt', '归档日期', 'Archive date'];
const resourceKey = ['resource', '资源类型', 'Resource type'];

const aggregationKeys = {
  creator: creatorKeys,
  post: postKeys,
  published: [...publicationKeys, ['yearMonth', '发布年月', 'Year and month'],
    ['yearDay', '发布年日', 'Year and day'], ['monthDay', '发布月日', 'Month and day']],
  archived: [archiveDateKey, ['archiveYear', '归档年', 'Archive year'], ['archiveMonth', '归档月', 'Archive month'],
    ['archiveDay', '归档日', 'Archive day'], ['archiveYearMonth', '归档年月', 'Archive year and month'],
    ['archiveYearDay', '归档年日', 'Archive year and day'], ['archiveMonthDay', '归档月日', 'Archive month and day']],
  file: [resourceKey, ['extension', '文件扩展名', 'File extension']],
};

const dataKeys = {
  file: [['original', '原文件名', 'Original name'], ['extension', '扩展名', 'Extension'],
    ['bytes', '文件大小字节', 'Size in bytes'], resourceKey],
  image: [['width', '图片宽度', 'Image width'], ['height', '图片高度', 'Image height']],
  creator: creatorKeys,
  post: postKeys,
  published: publicationKeys,
  archived: [archiveDateKey, ['exportDate', '导出日期', 'Export date'], ['exportTime', '导出时间', 'Export time']],
  sequence: [['postIndex', '投稿内序号', 'Post file number'], ['imageIndex', '图片序号', 'Image number'],
    ['exportIndex', '导出序号', 'Export number']],
};

const resourceLabels = {
  cover: { zh: '封面', en: 'Cover' }, image: { zh: '正文图片', en: 'Image' },
  attachment: { zh: '附件', en: 'Attachment' }, audio: { zh: '音频', en: 'Audio' },
  video: { zh: '视频', en: 'Video' },
};

const invalidLiteral = /[<>:"|?*\u0000-\u001f]/g;
const invalidSegment = /[<>:"|?*\\/\u0000-\u001f]/g;
const deviceName = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
const customKeyPrefix = 'custom:';
const dateGrouping = {
  year: [0], month: [1], day: [2], yearMonth: [0, 1], yearDay: [0, 2], monthDay: [1, 2],
  archiveYear: [0], archiveMonth: [1], archiveDay: [2], archiveYearMonth: [0, 1], archiveYearDay: [0, 2], archiveMonthDay: [1, 2],
};

function pad(value, digits = 2) {
  return String(value).padStart(digits, '0');
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function postDay(post) {
  return post.publishedAt?.slice(0, 10) || '';
}

export function cleanFilenameInput(value) {
  return value.replace(invalidLiteral, '');
}

export function getExportDraft(authorId, post, databasePath = './data') {
  const creatorId = authorId ?? post?.authorId;
  const defaults = {
    authorIds: creatorId ? [creatorId] : null,
    path: 'C:\\PostPock\\Exports',
    dateMode: 'all',
    start: localDate(),
    end: localDate(),
    postIds: null,
    extensions: null,
    pattern: [{ key: 'aggregation:authorName' }, '/', { key: 'aggregation:postTitle' }, '/', { key: 'data:original' }],
    fileLimit: 5,
  };
  let saved;
  try {
    saved = JSON.parse(globalThis.localStorage?.getItem(draftKey(databasePath, creatorId)) || 'null');
  } catch {
    saved = null;
  }

  const draft = { ...defaults, ...saved };
  if (!post) return draft;
  return { ...draft, authorIds: [post.authorId], dateMode: 'day', start: postDay(post), postIds: [post.id] };
}

function draftKey(databasePath, authorId) {
  return `postpock.export.${JSON.stringify([databasePath, authorId ?? null])}`;
}

export function saveExportDraft(authorId, draft, databasePath = './data') {
  try {
    globalThis.localStorage?.setItem(draftKey(databasePath, authorId), JSON.stringify(draft));
  } catch {
    // The current session remains editable when browser storage is unavailable.
  }
}

export function getAuthorPosts(authors, posts, authorIds) {
  const scope = new Set(authorIds ?? authors.map(({ id }) => id));
  return posts.filter(({ authorId }) => scope.has(authorId));
}

function splitFileName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1
    ? { original: name.slice(0, dot), extension: name.slice(dot + 1) }
    : { original: name, extension: '' };
}

export function getExtensionOptions(posts) {
  const extensions = posts.flatMap(({ files = [] }) => files.map(({ name }) => splitFileName(name).extension.toLowerCase()));
  return [...new Set(extensions)].sort();
}

export function getDatePosts(posts, { dateMode, start, end }) {
  if (dateMode === 'all') return posts;
  if (!start) return [];
  if (dateMode === 'day') return posts.filter((post) => postDay(post) === start);
  if (!end || end < start) return [];
  return posts.filter((post) => postDay(post) >= start && postDay(post) <= end);
}

export function isSingleDay({ dateMode, start, end }) {
  return dateMode === 'day' || (dateMode === 'range' && Boolean(start) && start === end);
}

function customText(value, language) {
  return typeof value === 'string' ? value : value?.[language];
}

export function getExportKeys(authors, posts, authorIds, language) {
  const selected = authorIds ? authors.filter(({ id }) => authorIds.includes(id)) : authors;
  const singlePlatform = new Set(selected.map(({ platform }) => platform)).size === 1;
  const platformAuthors = singlePlatform ? authors.filter(({ platform }) => platform === selected[0].platform) : [];
  const platformPosts = getAuthorPosts(platformAuthors, posts, null);
  return Object.entries({ aggregation: aggregationKeys, data: dataKeys }).map(([category, keys]) => {
    const builtIn = Object.entries(keys).flatMap(([group, fields]) => fields.map(([id, zh, en]) => ({
      id: `${category}:${id}`, label: language === 'zh' ? zh : en, group, keywords: `${zh} ${en} ${id}`,
    })));
    const custom = new Map();
    for (const { customKeys } of platformPosts) {
      for (const [id, entry] of Object.entries(customKeys?.[category] || {})) {
        if (!custom.has(id)) custom.set(id, {
          id: `${customKeyPrefix}${category}:${id}`, label: customText(entry.label, language) || id,
          group: 'custom', keywords: `${id} ${customText(entry.label, 'zh') ?? ''} ${customText(entry.label, 'en') ?? ''}`,
        });
      }
    }
    return [...builtIn, ...custom.values()];
  });
}

export function validatePattern(pattern, keys) {
  if (!pattern.length || pattern.every((part) => typeof part === 'string' && !part.trim())) return 'empty';
  if (pattern.some((part) => typeof part !== 'string' && !keys.has(part.key))) return 'key';

  const sample = pattern.map((part) => typeof part === 'string' ? part : '_').join('');
  if (sample !== cleanFilenameInput(sample)) return 'characters';
  if (sample.split(/[\\/]/).some((part) => !part || /^\s+$|[. ]$/.test(part) || deviceName.test(part))) return 'relative';
  return '';
}

function safeName(value) {
  const normalized = String(value).replace(invalidSegment, '_').replace(/[. ]+$/, '');
  if (!normalized) return '_';
  return deviceName.test(normalized) ? `_${normalized}` : normalized;
}

function displayDatePart(value, suffix, language) {
  return value && language === 'zh' ? `${value.replace(/^0/, '')}${suffix}` : value;
}

function renderToken(token, fields, post, language) {
  if (token.startsWith(customKeyPrefix)) {
    const [, category, ...key] = token.split(':');
    const entry = post.customKeys?.[category]?.[key.join(':')];
    return customText(entry?.valueLabel, language) || (entry?.value ?? '');
  }

  const [category, name] = token.split(':');
  if (category === 'aggregation' && dateGrouping[name]) {
    const date = name.startsWith('archive') ? fields.archivedAt : fields.publishedAt;
    const parts = date?.split('-') ?? [];
    const suffixes = ['年', '月', '日'];
    return dateGrouping[name].map((index) => displayDatePart(parts[index], suffixes[index], language))
      .filter(Boolean).join(language === 'zh' ? '' : '-');
  }
  return fields[name] ?? '';
}

function makeFields({ author, post, file, language, fileIndex, imageIndex, exportIndex, now }) {
  const [year, month, day] = postDay(post).split('-');
  const exportDate = localDate(now);
  return {
    ...splitFileName(file.name),
    resource: local(resourceLabels[file.type], language) || file.type,
    bytes: file.bytes, width: file.width, height: file.height,
    authorName: local(author.name, language), authorId: author.id,
    postTitle: local(post.title, language), postId: post.id,
    publishedAt: postDay(post), archivedAt: post.archivedAt?.slice(0, 10),
    year, month, day, exportDate,
    exportTime: `${exportDate}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
    postIndex: pad(fileIndex + 1, 3),
    imageIndex: imageIndex ? pad(imageIndex, 3) : '',
    exportIndex: pad(exportIndex, 3),
  };
}

function makeFolder(name, id) {
  return { name, id, folders: new Map(), files: [], usedNames: new Set(), nextDuplicates: new Map() };
}

function ensureFolders(root, path) {
  let current = root;
  for (const name of path) {
    const key = name.toLowerCase();
    if (!current.folders.has(key)) {
      current.folders.set(key, makeFolder(name, `${current.id}/${key}`));
      current.usedNames.add(key);
    }
    current = current.folders.get(key);
  }
  return current;
}

function insertFile(folder, name, resource) {
  const { original, extension } = splitFileName(name);
  const suffix = extension ? `.${extension}` : '';
  const canonical = name.toLowerCase();
  let candidate = name;
  let duplicate = folder.nextDuplicates.get(canonical) ?? 1;
  while (folder.usedNames.has(candidate.toLowerCase())) {
    candidate = `${original}(${duplicate})${suffix}`;
    duplicate += 1;
  }
  folder.nextDuplicates.set(canonical, duplicate);
  folder.usedNames.add(candidate.toLowerCase());
  folder.files.push({ name: candidate, resource });
}

export function buildExportTree({ authors, posts, draft, keys, language, now = new Date() }) {
  const root = makeFolder(draft.path.trim(), '');
  const error = validatePattern(draft.pattern, keys);
  if (error) return { root, fileCount: 0, error };

  const byId = new Map(authors.map((author) => [author.id, author]));
  const extensions = draft.extensions && new Set(draft.extensions);
  const selected = isSingleDay(draft) && draft.postIds ? new Set(draft.postIds) : null;
  const entries = [];

  for (const post of posts) {
    if (selected && !selected.has(post.id)) continue;
    const author = byId.get(post.authorId);
    let imageIndex = 0;
    (post.files || []).forEach((file, fileIndex) => {
      const isImage = file.type === 'cover' || file.type === 'image';
      if (isImage) imageIndex += 1;
      const fields = makeFields({ author, post, file, language, fileIndex, imageIndex: isImage ? imageIndex : 0, exportIndex: entries.length + 1, now });
      const extension = fields.extension.toLowerCase();
      if (extensions && !extensions.has(extension)) return;

      const template = draft.pattern.map((part) => typeof part === 'string'
        ? part
        : String(renderToken(part.key, fields, post, language)).replace(invalidSegment, '_')).join('');
      const path = template.split(/[\\/]/).map(safeName);
      const basename = path.pop();
      const suffix = extension && !basename.toLowerCase().endsWith(`.${extension}`) ? `.${fields.extension}` : '';
      entries.push({ folder: ensureFolders(root, path), name: `${basename}${suffix}`, resource: file.type });
    });
  }

  for (const { folder, name, resource } of entries) insertFile(folder, name, resource);
  return { root, fileCount: entries.length, error: '' };
}
