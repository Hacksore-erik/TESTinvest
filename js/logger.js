// ============================================================
// ===== LOGGER — система кодов ошибок ========================
// ============================================================
// Хранит последние 20 ошибок в localStorage.
// Пользователь видит только номер (E-API-401), детали в файле.
// ============================================================

const STORAGE_KEY = 'kompas_error_log';
const MAX_RECORDS = 20;

// ============================================================
// ===== ФОРМАТ ЗАПИСИ ========================================
// ============================================================
// { ts: 1727618400000, code: 'E-API-401', message: '...', context: {...} }
// ============================================================

function safeParse(raw) {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function readLog() {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return [];
  }
}

function writeLog(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    // localStorage переполнен — молча игнорируем
  }
}

// ============================================================
// ===== PUBLIC: ЗАПИСЬ ОШИБКИ ================================
// ============================================================
export function logError(code, message, context = {}) {
  const record = {
    ts: Date.now(),
    code: String(code || 'E-UNKNOWN'),
    message: String(message || 'Без описания'),
    context: context && typeof context === 'object' ? context : {}
  };

  const log = readLog();
  log.push(record);
  while (log.length > MAX_RECORDS) log.shift();
  writeLog(log);

  // В консоль — только в DEV (можно отключить позже)
  if (typeof console !== 'undefined') {
    console.warn(`[${record.code}]`, record.message, record.context);
  }

  return record;
}

// ============================================================
// ===== PUBLIC: ЧТЕНИЕ =======================================
// ============================================================
export function getErrors() {
  return readLog();
}

export function getErrorCount() {
  return readLog().length;
}

export function clearErrors() {
  writeLog([]);
}

// ============================================================
// ===== PUBLIC: ЭКСПОРТ В .LOG ===============================
// ============================================================
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatDateFile(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function buildLogText() {
  const log = readLog();
  const now = Date.now();

  const header = [
    '# Компас — журнал ошибок',
    `# Создано: ${formatDate(now)}`,
    `# Записей: ${log.length} из ${MAX_RECORDS} максимум`,
    '# Коды: E-API-* · E-NET-* · E-PARSE-* · E-DATA-* · E-UI-*',
    '#',
    ''
  ].join('\n');

  if (log.length === 0) {
    return header + 'Ошибок нет.\n';
  }

  const lines = log.map(r => {
    const head = `[${formatDate(r.ts)}] [${r.code}] ${r.message}`;
    const ctx = (r.context && Object.keys(r.context).length)
      ? '\n  context: ' + JSON.stringify(r.context)
      : '';
    return head + ctx;
  });

  return header + lines.join('\n') + '\n';
}

export function downloadLog() {
  const text = buildLogText();
  const filename = `kompas-errors-${formatDateFile(Date.now())}.log`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// ===== PUBLIC: ГЛОБАЛЬНЫЕ ПЕРЕХВАТЧИКИ ======================
// ============================================================
export function initGlobalHandlers() {
  window.addEventListener('error', (e) => {
    if (!e) return;
    logError('E-UI-001', e.message || 'Script error', {
      file: e.filename || '',
      line: e.lineno || 0,
      col: e.colno || 0
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e && e.reason;
    const message = (reason && reason.message) ? reason.message : String(reason || 'Promise rejection');
    logError('E-UI-002', message, { type: 'unhandledrejection' });
  });
}

// ============================================================
// ===== КОДЫ (справочник) ====================================
// ============================================================
export const CODES = {
  // API
  'E-API-400': 'Неверный запрос',
  'E-API-401': 'Токен недействителен',
  'E-API-403': 'Доступ запрещён',
  'E-API-404': 'Не найдено',
  'E-API-429': 'Слишком много запросов',
  'E-API-500': 'Ошибка сервера Т-Инвестиций',
  'E-API-XXX': 'Ошибка API',

  // Сеть
  'E-NET-001': 'Нет соединения',
  'E-NET-002': 'Превышено время ожидания',
  'E-NET-003': 'Запрос отменён',

  // Парсинг
  'E-PARSE-001': 'Не удалось разобрать ответ',

  // Данные
  'E-DATA-001': 'Не найдено ни одного счёта',
  'E-DATA-002': 'Нет данных портфеля',

  // UI
  'E-UI-001': 'Ошибка скрипта',
  'E-UI-002': 'Необработанное исключение'
};

// ============================================================
// ===== УТИЛИТА: код по HTTP-статусу =========================
// ============================================================
export function codeFromStatus(status) {
  const map = {
    400: 'E-API-400',
    401: 'E-API-401',
    403: 'E-API-403',
    404: 'E-API-404',
    429: 'E-API-429',
    500: 'E-API-500'
  };
  return map[status] || 'E-API-XXX';
}