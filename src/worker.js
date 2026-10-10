var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../home/ubuntu/.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/worker.js

// src/resend-mailer.mjs
var RESEND_EMAILS_URL = "https://api.resend.com/emails";
var LOCAL_TEST_HOSTS = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "[::1]"]);
var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function resolveResendEndpoint({ testMode = false, testEndpoint = "" } = {}) {
  if (testMode === true) {
    try {
      const endpoint = new URL(testEndpoint);
      if (endpoint.protocol === "http:" && LOCAL_TEST_HOSTS.has(endpoint.hostname)) return endpoint.toString();
    } catch (_) {
    }
  }
  return RESEND_EMAILS_URL;
}
__name(resolveResendEndpoint, "resolveResendEndpoint");
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
__name(escapeHtml, "escapeHtml");
async function sendPasswordResetEmail({
  apiKey,
  fromEmail,
  to,
  resetUrl,
  testMode = false,
  testEndpoint = "",
  fetchImpl = globalThis.fetch
}) {
  if (typeof apiKey !== "string" || !apiKey.trim() || apiKey.length > 512) throw new Error("resend_not_configured");
  if (typeof fromEmail !== "string" || !emailPattern.test(fromEmail) || fromEmail.length > 254) throw new Error("resend_sender_invalid");
  if (typeof to !== "string" || !emailPattern.test(to) || to.length > 254) throw new Error("resend_recipient_invalid");
  if (typeof fetchImpl !== "function") throw new Error("resend_transport_unavailable");
  let parsedResetUrl;
  try {
    parsedResetUrl = new URL(resetUrl);
  } catch (_) {
    throw new Error("resend_reset_url_invalid");
  }
  const localReset = testMode === true && parsedResetUrl.protocol === "http:" && LOCAL_TEST_HOSTS.has(parsedResetUrl.hostname);
  if (parsedResetUrl.protocol !== "https:" && !localReset) throw new Error("resend_reset_url_invalid");
  if (!/^#password-reset=[A-Za-z0-9_-]{43}$/.test(parsedResetUrl.hash)) throw new Error("resend_reset_token_invalid");
  const safeUrl = escapeHtml(parsedResetUrl.toString());
  const text = [
    "Recibimos una solicitud para cambiar la contrase\xF1a de tu cuenta BikeStore.",
    "",
    `Crea una nueva contrase\xF1a desde este enlace (vence en 30 minutos): ${parsedResetUrl.toString()}`,
    "",
    "Si no solicitaste el cambio, ignora este mensaje."
  ].join("\n");
  const html = `<!doctype html><html lang="es"><body><p>Recibimos una solicitud para cambiar la contrase\xF1a de tu cuenta BikeStore.</p><p><a href="${safeUrl}">Crear una nueva contrase\xF1a</a></p><p>El enlace vence en 30 minutos. Si no solicitaste el cambio, ignora este mensaje.</p></body></html>`;
  const response = await fetchImpl(resolveResendEndpoint({ testMode, testEndpoint }), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      from: `BikeStore <${fromEmail}>`,
      to: [to],
      subject: "Restablece tu contrase\xF1a de BikeStore",
      text,
      html
    })
  });
  if (!response?.ok) {
    try {
      await response?.body?.cancel();
    } catch (_) {
    }
    throw new Error("resend_delivery_failed");
  }
  return true;
}
__name(sendPasswordResetEmail, "sendPasswordResetEmail");

// src/worker.js
var ADMIN_EMAIL = "jjcorreagetial16@gmail.com";
var SESSION_COOKIE = "__Host-bikestore_session";
var GUEST_COOKIE = "__Host-bikestore_guest";
var SESSION_SECONDS = 60 * 60 * 24 * 30;
var GUEST_SECONDS = 60 * 60 * 24 * 180;
var PASSWORD_ITERATIONS = 1e5;
var MAX_REQUEST_BYTES = 16384;
var MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;
var MAX_PRODUCT_IMAGE_BODY_BYTES = MAX_PRODUCT_IMAGE_BYTES + 64 * 1024;
var MAX_PRODUCT_IMAGE_DIMENSION = 1600;
var MAX_PRODUCT_IMAGE_PIXELS = 1500000;
var MAX_PRODUCT_IMAGE_DECODED_BYTES = 6 * 1024 * 1024;
var MAX_PRODUCT_IMAGE_CHUNKS = 1026;
var MAX_PRODUCT_IMAGE_IDAT_CHUNKS = 1024;
var MAX_PRODUCT_IMAGE_ANCILLARY_CHUNKS = 0;
var MAX_PRODUCT_IMAGE_ANCILLARY_BYTES = 0;
var AUTH_WINDOW_SECONDS = 600;
var AUTH_REGISTER_MAX_ATTEMPTS = 30;
var GUEST_CREATE_MAX_PER_IP = 20;
var GUEST_CLEANUP_BATCH_SIZE = 500;
var AUTH_LOGIN_IP_MAX_FAILURES = 30;
var AUTH_LOGIN_PAIR_MAX_FAILURES = 10;
var AUTH_RATE_LIMIT_MAX_ROWS = 5e4;
var PASSWORD_RESET_SECONDS = 30 * 60;
var PASSWORD_RESET_MAX_ROWS = 5e4;
var PASSWORD_RESET_REQUEST_IP_MAX = 20;
var PASSWORD_RESET_REQUEST_PAIR_MAX = 5;
var PASSWORD_RESET_COMPLETE_IP_MAX = 20;
var PASSWORD_RESET_COMPLETE_TOKEN_MAX = 5;
var PASSWORD_RESET_REPLY = "Si el correo corresponde a una cuenta, recibir\xE1s instrucciones para cambiar la contrase\xF1a.";
var encoder = new TextEncoder();
var IMAGE_PATHS = new Set([
  "bike-mountain",
  "bike-kids",
  "bike-city",
  "bike-road-white",
  "bike-trail-blue",
  "bike-road",
  "bike-hero",
  "helmets",
  "helmet-route",
  "helmet-kids",
  "apparel-set",
  "apparel-jersey",
  "apparel-black",
  "road-kit",
  "components",
  "rear-light",
  "lights",
  "hero-ride"
].map((name) => `/assets/bikestore/${name}.jpg`));
var R2_PRODUCT_IMAGE_PATH_PATTERN = /^\/api\/images\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/;
var CATEGORY_NAMES = /* @__PURE__ */ new Set([
  "Bicicletas de monta\xF1a",
  "Bicicletas de ruta",
  "Bicicletas el\xE9ctricas",
  "Cascos y protecci\xF3n",
  "Ropa de ciclismo",
  "Accesorios",
  "Componentes y repuestos"
]);
function json(data, status = 200, extra = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Vary": "Cookie"
  });
  if (extra instanceof Headers) {
    for (const [key, value] of extra.entries()) if (key.toLowerCase() !== "set-cookie") headers.set(key, value);
    const cookies = typeof extra.getSetCookie === "function" ? extra.getSetCookie() : (extra.get("Set-Cookie") || "").split(/, (?=__Host-bikestore_)/).filter(Boolean);
    for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  } else {
    for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
function failure(message, status = 400) {
  return json({ error: message }, status);
}
__name(failure, "failure");
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
__name(randomToken, "randomToken");
function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
__name(decodeBase64Url, "decodeBase64Url");
function encodeBase64Url(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
__name(encodeBase64Url, "encodeBase64Url");
function derivePasswordBits(password, salt, iterations) {
  return crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    .then((key) => crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256
    ))
    .then((bits) => new Uint8Array(bits));
}

__name(derivePasswordBits, "derivePasswordBits");
async function sha256(value) {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
__name(sha256, "sha256");
async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordBits(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(hash)}`;
}
__name(passwordHash, "passwordHash");
async function verifyPassword(password, encoded) {
  const [algorithm, roundsText, saltText, expectedText] = String(encoded || "").split("$");
  const rounds = Number(roundsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(rounds) || rounds < 1e5 || rounds > 210_000 || !saltText || !expectedText) return false;
  try {
    const actual = await derivePasswordBits(password, decodeBase64Url(saltText), rounds);
    const expected = decodeBase64Url(expectedText);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch (_) {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");
function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}
__name(cookieValue, "cookieValue");
function cookieHeader(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
__name(cookieHeader, "cookieHeader");
function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
__name(clearCookie, "clearCookie");
function newId() {
  return crypto.randomUUID();
}
__name(newId, "newId");
function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
__name(isEmail, "isEmail");
function validPassword(value) {
  return typeof value === "string" && encoder.encode(value).length >= 8 && encoder.encode(value).length <= 1024;
}
__name(validPassword, "validPassword");
function validName(value) {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80;
}
__name(validName, "validName");
function cleanProductInput(value) {
  if (!value || typeof value !== "object") return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const price = Number(value.price);
  const stock = Number(value.stock);
  const rawImage = typeof value.image === "string" ? value.image : "";
  const image = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
  const id = typeof value.id === "string" ? value.id.toLowerCase() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const active = value.active !== false;
  if (!/^[a-z0-9_-]{3,48}$/.test(id) || name.length < 2 || name.length > 80 || !CATEGORY_NAMES.has(category)) return null;
  if (!Number.isInteger(price) || price < 1e3 || price > 1e7 || !Number.isInteger(stock) || stock < 0 || stock > 1e4) return null;
  if (!IMAGE_PATHS.has(image) && !R2_PRODUCT_IMAGE_PATH_PATTERN.test(image) || description.length > 260) return null;
  return { id, name, category, price, stock, image, description, active };
}
__name(cleanProductInput, "cleanProductInput");
var ApiInputError = class extends Error {
  static {
    __name(this, "ApiInputError");
  }
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function bodyJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().startsWith("application/json")) throw new ApiInputError("Se requiere JSON.", 415);
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_REQUEST_BYTES) {
    throw new ApiInputError("La solicitud es demasiado grande.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiInputError("El cuerpo JSON est\xE1 vac\xEDo.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => {
      });
      throw new ApiInputError("La solicitud es demasiado grande.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_) {
    throw new ApiInputError("El cuerpo no contiene UTF-8 v\xE1lido.");
  }
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new ApiInputError("El JSON enviado no es v\xE1lido.");
  }
}
__name(bodyJson, "bodyJson");
async function bodyMultipartFormData(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new ApiInputError("Se requiere una imagen.", 415);
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_PRODUCT_IMAGE_BODY_BYTES) {
    throw new ApiInputError("La imagen PNG convertida supera el l\xEDmite de 4 MiB.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiInputError("Selecciona una imagen.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PRODUCT_IMAGE_BODY_BYTES) {
      await reader.cancel().catch(() => {
      });
      throw new ApiInputError("La imagen PNG convertida supera el l\xEDmite de 4 MiB.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Request(request.url, { method: "POST", headers: { "Content-Type": contentType }, body: bytes }).formData();
  } catch (_) {
    throw new ApiInputError("El archivo enviado no es v\xE1lido.");
  }
}
__name(bodyMultipartFormData, "bodyMultipartFormData");
function detectProductImageFormat(bytes) {
  if (bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return { extension: "png", contentType: "image/png" };
  return null;
}
__name(detectProductImageFormat, "detectProductImageFormat");
function imageReadU32BE(bytes, offset) {
  return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}
var PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? value >>> 1 ^ 3988292384 : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();
function imageCrc32(bytes, start, end) {
  let crc = 4294967295;
  for (let index = start; index < end; index += 1) crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function productImageDimensionsValid(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= MAX_PRODUCT_IMAGE_DIMENSION && height <= MAX_PRODUCT_IMAGE_DIMENSION && width * height <= MAX_PRODUCT_IMAGE_PIXELS;
}
async function validatePngProductImage(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 45 || bytes.length > MAX_PRODUCT_IMAGE_BYTES || signature.some((byte, index) => bytes[index] !== byte)) return false;
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let rowBytes = 0;
  let expectedDecodedBytes = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  let chunkCount = 0;
  let imageDataChunkCount = 0;
  let ancillaryChunkCount = 0;
  let ancillaryBytes = 0;
  let compressedLength = 0;
  const compressedChunks = [];
  while (offset < bytes.length) {
    chunkCount += 1;
    if (chunkCount > MAX_PRODUCT_IMAGE_CHUNKS || offset + 12 > bytes.length) return false;
    const chunkLength = imageReadU32BE(bytes, offset);
    if (chunkLength > MAX_PRODUCT_IMAGE_BYTES || offset + 12 + chunkLength > bytes.length) return false;
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    const chunkType = String.fromCharCode(bytes[typeOffset], bytes[typeOffset + 1], bytes[typeOffset + 2], bytes[typeOffset + 3]);
    if (!/^[A-Za-z]{4}$/.test(chunkType) || chunkType[2] !== chunkType[2].toUpperCase()) return false;
    if (chunkType !== "IHDR" && chunkType !== "IDAT" && chunkType !== "IEND") {
      if (chunkType[0] !== chunkType[0].toUpperCase()) {
        ancillaryChunkCount += 1;
        ancillaryBytes += chunkLength;
        if (ancillaryChunkCount > MAX_PRODUCT_IMAGE_ANCILLARY_CHUNKS || ancillaryBytes > MAX_PRODUCT_IMAGE_ANCILLARY_BYTES) return false;
      }
      return false;
    }
    if (imageCrc32(bytes, typeOffset, dataEnd) !== imageReadU32BE(bytes, dataEnd)) return false;
    if (!sawHeader && (chunkType !== "IHDR" || offset !== 8)) return false;
    if (chunkType === "IHDR") {
      if (sawHeader || offset !== 8 || chunkLength !== 13) return false;
      width = imageReadU32BE(bytes, dataOffset);
      height = imageReadU32BE(bytes, dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8];
      const colorType = bytes[dataOffset + 9];
      channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
      if (!productImageDimensionsValid(width, height) || !channels || bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0 || bytes[dataOffset + 12] !== 0) return false;
      rowBytes = Math.ceil(width * channels * bitDepth / 8);
      expectedDecodedBytes = (rowBytes + 1) * height;
      if (expectedDecodedBytes > MAX_PRODUCT_IMAGE_DECODED_BYTES || bitDepth !== 8) return false;
      sawHeader = true;
    } else if (chunkType === "IDAT") {
      if (!sawHeader || sawEnd) return false;
      imageDataChunkCount += 1;
      if (imageDataChunkCount > MAX_PRODUCT_IMAGE_IDAT_CHUNKS) return false;
      sawImageData = true;
      compressedLength += chunkLength;
      if (compressedLength > MAX_PRODUCT_IMAGE_BYTES) return false;
      compressedChunks.push(bytes.subarray(dataOffset, dataEnd));
    } else if (chunkType === "IEND") {
      if (!sawImageData || chunkLength !== 0 || dataEnd + 4 !== bytes.length) return false;
      sawEnd = true;
      offset = dataEnd + 4;
      break;
    }
    offset = dataEnd + 4;
  }
  if (!sawHeader || !sawImageData || !sawEnd || offset !== bytes.length || !compressedLength || typeof DecompressionStream !== "function") return false;
  const compressed = new Uint8Array(compressedLength);
  let compressedOffset = 0;
  for (const chunk of compressedChunks) {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.byteLength;
  }
  const rowStride = rowBytes + 1;
  try {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"));
    const reader = stream.getReader();
    let decodedLength = 0;
    let rowsDecoded = 0;
    let scanlineOffset = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (decodedLength + value.byteLength > expectedDecodedBytes) {
        await reader.cancel().catch(() => {});
        return false;
      }
      let sourceOffset = 0;
      while (sourceOffset < value.byteLength) {
        if (scanlineOffset === 0) {
          const filter = value[sourceOffset++];
          if (filter > 4) {
            await reader.cancel().catch(() => {});
            return false;
          }
          scanlineOffset = 1;
        }
        const take = Math.min(rowStride - scanlineOffset, value.byteLength - sourceOffset);
        sourceOffset += take;
        scanlineOffset += take;
        if (scanlineOffset === rowStride) {
          rowsDecoded += 1;
          scanlineOffset = 0;
        }
      }
      decodedLength += value.byteLength;
    }
    return decodedLength === expectedDecodedBytes && scanlineOffset === 0 && rowsDecoded === height;
  } catch (_) {
    return false;
  }
}
async function validateProductImageBytes(bytes, declaredType = "") {
  const format = detectProductImageFormat(bytes);
  if (!format || declaredType && String(declaredType).toLowerCase() !== format.contentType) return null;
  return await validatePngProductImage(bytes) ? format : null;
}
function productImageUploadsReady(env2) {
  return Boolean(env2?.PRODUCT_IMAGE_UPLOADS_ENABLED === "true" && env2?.PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED === "true" && env2?.PRODUCT_IMAGES && typeof env2.PRODUCT_IMAGES.put === "function" && typeof env2.PRODUCT_IMAGES.get === "function" && typeof DecompressionStream === "function");
}
function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
  if (!origin) return safeMethod;
  return origin === new URL(request.url).origin;
}
__name(sameOrigin, "sameOrigin");
async function authenticate(request, env2) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return env2.DB.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.email_verified_at, u.account_type
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > unixepoch() AND u.active = 1 AND u.account_type = 'account'
  `).bind(tokenHash).first();
}
__name(authenticate, "authenticate");
async function findGuest(request, env2) {
  const token = cookieValue(request, GUEST_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await env2.DB.prepare(`
    SELECT id, account_type FROM users
    WHERE guest_token_hash = ? AND guest_expires_at > unixepoch() AND account_type = 'guest'
  `).bind(tokenHash).first();
  return user ? { ...user, token } : null;
}
__name(findGuest, "findGuest");
async function createGuest(env2, headers) {
  const token = randomToken();
  const userId = newId();
  const cartId = newId();
  const expiresAt = Math.floor(Date.now() / 1e3) + GUEST_SECONDS;
  await env2.DB.batch([
    env2.DB.prepare(`INSERT INTO users (id, account_type, name, guest_token_hash, guest_expires_at) VALUES (?, 'guest', 'Invitado', ?, ?)`).bind(userId, await sha256(token), expiresAt),
    env2.DB.prepare("INSERT INTO carts (id, user_id) VALUES (?, ?)").bind(cartId, userId)
  ]);
  headers.append("Set-Cookie", cookieHeader(GUEST_COOKIE, token, GUEST_SECONDS));
  return { id: userId, account_type: "guest", token, cart_id: cartId };
}
__name(createGuest, "createGuest");
async function getCartId(env2, userId) {
  let cart = await env2.DB.prepare("SELECT id FROM carts WHERE user_id = ?").bind(userId).first();
  if (!cart) {
    const id = newId();
    await env2.DB.prepare("INSERT INTO carts (id, user_id) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING").bind(id, userId).run();
    cart = await env2.DB.prepare("SELECT id FROM carts WHERE user_id = ?").bind(userId).first();
  }
  if (!cart) throw new Error("No se pudo obtener el carrito de la cuenta.");
  return cart.id;
}
__name(getCartId, "getCartId");
async function currentCartOwner(request, env2, headers) {
  const account = await authenticate(request, env2);
  if (account) {
    if (account.role === "admin") throw new ApiInputError("Las cuentas administradoras no tienen carrito de compra.", 403);
    return { user: account, cartId: await getCartId(env2, account.id) };
  }
  const guestCookie = cookieValue(request, GUEST_COOKIE);
  const guest = await findGuest(request, env2);
  if (!guest) {
    if (guestCookie) headers.append("Set-Cookie", clearCookie(GUEST_COOKIE));
    return null;
  }
  return { user: { id: guest.id, name: "Invitado", role: "customer", account_type: "guest" }, cartId: await getCartId(env2, guest.id) };
}
__name(currentCartOwner, "currentCartOwner");
function publicUser(user) {
  if (!user) return null;
  return { name: user.name, email: user.email || null, role: user.role, accountType: user.account_type };
}
__name(publicUser, "publicUser");
function emptyGuestCart() {
  return { items: [], user: publicUser({ name: "Invitado", role: "customer", account_type: "guest" }) };
}
__name(emptyGuestCart, "emptyGuestCart");
async function createGuestCartOwner(env2, headers) {
  const guest = await createGuest(env2, headers);
  return { user: { id: guest.id, name: "Invitado", role: "customer", account_type: "guest" }, cartId: guest.cart_id };
}
__name(createGuestCartOwner, "createGuestCartOwner");
async function mergeGuestCart(request, env2, accountUserId) {
  const guest = await findGuest(request, env2);
  if (!guest || guest.id === accountUserId) return;
  const guestCartId = await getCartId(env2, guest.id);
  const accountCartId = await getCartId(env2, accountUserId);
  await env2.DB.batch([
    env2.DB.prepare(`
      WITH guest_items AS (
        SELECT product_id, variant, quantity
        FROM cart_items WHERE cart_id = ?
      ), ranked AS (
        SELECT g.product_id, g.variant, g.quantity, s.quantity AS stock,
          COALESCE((SELECT SUM(account_item.quantity) FROM cart_items account_item
            WHERE account_item.cart_id = ? AND account_item.product_id = g.product_id), 0) AS account_total,
          COALESCE(SUM(g.quantity) OVER (
            PARTITION BY g.product_id ORDER BY g.variant
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0) AS earlier_guest_total
        FROM guest_items g
        JOIN products p ON p.id = g.product_id AND p.is_active = 1
        JOIN inventory_stock s ON s.product_id = p.id
      ), allocations AS (
        SELECT product_id, variant,
          MAX(0, MIN(quantity, stock - account_total - earlier_guest_total)) AS amount
        FROM ranked
      )
      INSERT INTO cart_items (cart_id, product_id, variant, quantity)
      SELECT ?, product_id, variant, amount FROM allocations WHERE amount > 0
      ON CONFLICT(cart_id, product_id, variant) DO UPDATE
        SET quantity = quantity + excluded.quantity, updated_at = unixepoch()
    `).bind(guestCartId, accountCartId, accountCartId),
    env2.DB.prepare("DELETE FROM cart_items WHERE cart_id = ?").bind(guestCartId),
    env2.DB.prepare("UPDATE carts SET updated_at = unixepoch() WHERE id IN (?, ?)").bind(guestCartId, accountCartId),
    env2.DB.prepare(`UPDATE users SET guest_expires_at = unixepoch()
      WHERE id = ? AND account_type = 'guest'`).bind(guest.id)
  ]);
}
__name(mergeGuestCart, "mergeGuestCart");
async function purgeGuestData(env2, userId) {
  const guestUser = `SELECT id FROM users WHERE id = ? AND account_type = 'guest'`;
  const guestCarts = `SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id
    WHERE u.id = ? AND u.account_type = 'guest'`;
  await env2.DB.batch([
    env2.DB.prepare(`DELETE FROM cart_items WHERE cart_id IN (${guestCarts})`).bind(userId),
    env2.DB.prepare(`DELETE FROM carts WHERE user_id IN (${guestUser})`).bind(userId),
    env2.DB.prepare(`DELETE FROM sessions WHERE user_id IN (${guestUser})`).bind(userId),
    env2.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id IN (${guestUser})`).bind(userId),
    env2.DB.prepare(`DELETE FROM users WHERE id IN (${guestUser})`).bind(userId)
  ]);
}
__name(purgeGuestData, "purgeGuestData");
async function cleanupExpiredGuests(env2) {
  const now = Math.floor(Date.now() / 1e3);
  const limit = GUEST_CLEANUP_BATCH_SIZE;
  const expiredUsers = `SELECT id FROM users WHERE account_type = 'guest' AND guest_expires_at <= ?
    ORDER BY guest_expires_at, id LIMIT ?`;
  const expiredCarts = `SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id
    WHERE u.account_type = 'guest' AND u.guest_expires_at <= ?
    ORDER BY u.guest_expires_at, u.id LIMIT ?`;
  const results = await env2.DB.batch([
    env2.DB.prepare(`DELETE FROM cart_items WHERE cart_id IN (${expiredCarts})`).bind(now, limit),
    env2.DB.prepare(`DELETE FROM carts WHERE id IN (${expiredCarts})`).bind(now, limit),
    env2.DB.prepare(`DELETE FROM sessions WHERE user_id IN (${expiredUsers})`).bind(now, limit),
    env2.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id IN (${expiredUsers})`).bind(now, limit),
    env2.DB.prepare(`DELETE FROM users WHERE id IN (${expiredUsers}) AND account_type = 'guest'
      AND NOT EXISTS (SELECT 1 FROM carts c WHERE c.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM password_reset_tokens r WHERE r.user_id = users.id)`).bind(now, limit)
  ]);
  return {
    cartItems: Number(results[0]?.meta?.changes || 0),
    carts: Number(results[1]?.meta?.changes || 0),
    users: Number(results[4]?.meta?.changes || 0)
  };
}
__name(cleanupExpiredGuests, "cleanupExpiredGuests");
async function issueSession(user, env2, headers) {
  const token = randomToken();
  const expiresAt = Math.floor(Date.now() / 1e3) + SESSION_SECONDS;
  await env2.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").bind(newId(), user.id, await sha256(token), expiresAt).run();
  headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, token, SESSION_SECONDS));
  headers.append("Set-Cookie", clearCookie(GUEST_COOKIE));
}
__name(issueSession, "issueSession");
async function readCart(env2, cartId, user) {
  const result = await env2.DB.batch([
    env2.DB.prepare(`
      DELETE FROM cart_items
      WHERE cart_id = ? AND (
        NOT EXISTS (SELECT 1 FROM products p JOIN inventory_stock s ON s.product_id = p.id
          WHERE p.id = cart_items.product_id AND p.is_active = 1 AND s.quantity > 0)
        OR COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
          >= COALESCE((SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id), 0)
      )
    `).bind(cartId),
    env2.DB.prepare(`
      UPDATE cart_items
      SET quantity = MIN(cart_items.quantity, MAX(1,
        (SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id)
        - COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
      )), updated_at = unixepoch()
      WHERE cart_id = ? AND quantity > MIN(cart_items.quantity, MAX(1,
        (SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id)
        - COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
      ))
    `).bind(cartId),
    env2.DB.prepare("UPDATE carts SET updated_at = unixepoch() WHERE id = ?").bind(cartId),
    env2.DB.prepare("SELECT product_id AS productId, variant, quantity FROM cart_items WHERE cart_id = ? ORDER BY added_at, variant").bind(cartId)
  ]);
  return { items: result[3]?.results || [], user: publicUser(user) };
}
__name(readCart, "readCart");
function productSelect() {
  return `SELECT p.id, p.name, c.name AS category, p.price_minor AS price, s.quantity AS stock,
    p.image_path AS image, p.description, p.is_active AS active, p.featured, p.flag, p.gear
    FROM products p JOIN categories c ON c.id = p.category_id
    JOIN inventory_stock s ON s.product_id = p.id`;
}
__name(productSelect, "productSelect");
async function listProducts(env2, request, admin = false) {
  const url = new URL(request.url);
  const category = (url.searchParams.get("category") || "").trim();
  const query = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const sort = url.searchParams.get("sort") || "featured";
  let sql = `${productSelect()} WHERE (? = 1 OR p.is_active = 1) AND (? = '' OR c.name = ?) AND (? = '' OR p.name LIKE '%' || ? || '%' OR p.description LIKE '%' || ? || '%')`;
  const params = [admin ? 1 : 0, category, category, query, query, query];
  if (sort === "asc") sql += " ORDER BY p.price_minor ASC, p.name COLLATE NOCASE";
  else if (sort === "desc") sql += " ORDER BY p.price_minor DESC, p.name COLLATE NOCASE";
  else sql += " ORDER BY p.featured DESC, p.created_at ASC";
  const result = await env2.DB.prepare(sql).bind(...params).all();
  return (result.results || []).map((row) => ({ ...row, active: Boolean(row.active), featured: Boolean(row.featured), gear: Boolean(row.gear), price: Number(row.price), stock: Number(row.stock) }));
}
__name(listProducts, "listProducts");
async function requireAdmin(request, env2) {
  const user = await authenticate(request, env2);
  if (!user) return { error: failure("Inicia sesi\xF3n para continuar.", 401) };
  if (user.role !== "admin" || user.email?.toLowerCase() !== ADMIN_EMAIL || !user.email_verified_at) {
    return { error: failure("Acceso reservado a la cuenta administradora.", 403) };
  }
  return { user };
}
__name(requireAdmin, "requireAdmin");
async function edgeRateLimited(limiter, key) {
  if (!limiter || typeof limiter.limit !== "function") return false;
  try {
    const result = await limiter.limit({ key });
    return !result.success;
  } catch (_) {
    return false;
  }
}
__name(edgeRateLimited, "edgeRateLimited");
function authWindowStart() {
  const windowStart = Math.floor(Date.now() / 1e3 / AUTH_WINDOW_SECONDS) * AUTH_WINDOW_SECONDS;
  return windowStart;
}
__name(authWindowStart, "authWindowStart");
function authCounterStatement(keyHash, windowStart) {
  return `
    INSERT INTO auth_rate_limits (key_hash, window_start, attempts, updated_at)
    SELECT ?, ?, 1, unixepoch()
    WHERE (SELECT COUNT(*) FROM auth_rate_limits) < ?
      OR EXISTS (SELECT 1 FROM auth_rate_limits WHERE key_hash = ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_start = excluded.window_start
        THEN auth_rate_limits.attempts + 1 ELSE 1 END,
      window_start = excluded.window_start,
      updated_at = unixepoch()
    RETURNING attempts
  `;
}
__name(authCounterStatement, "authCounterStatement");
async function incrementAuthCounters(env2, keyHashes) {
  const windowStart = authWindowStart();
  const results = await env2.DB.batch([
    env2.DB.prepare("DELETE FROM auth_rate_limits WHERE window_start < ?").bind(windowStart - AUTH_WINDOW_SECONDS * 2),
    ...keyHashes.map((keyHash) => env2.DB.prepare(authCounterStatement(keyHash, windowStart)).bind(
      keyHash,
      windowStart,
      AUTH_RATE_LIMIT_MAX_ROWS,
      keyHash
    ))
  ]);
  return results.slice(1).map((result) => Number(result?.results?.[0]?.attempts || 0));
}
__name(incrementAuthCounters, "incrementAuthCounters");
async function loginRateKeys(request, email) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const ipKey = await sha256(`auth:login-failed:ip:${ip}`);
  const pairKey = await sha256(`auth:login-failed:pair:${ip}\0${normalizedEmail}`);
  return { ipKey, pairKey };
}
__name(loginRateKeys, "loginRateKeys");
async function registrationAttemptLimited(request, env2) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await sha256(`auth:register:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env2.AUTH_EDGE_REGISTER_LIMITER, ipKey),
    incrementAuthCounters(env2, [ipKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > AUTH_REGISTER_MAX_ATTEMPTS;
}
__name(registrationAttemptLimited, "registrationAttemptLimited");
async function guestCreationLimited(request, env2) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await sha256(`guest:create:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env2.GUEST_EDGE_CREATE_LIMITER, key),
    incrementAuthCounters(env2, [key])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > GUEST_CREATE_MAX_PER_IP;
}
__name(guestCreationLimited, "guestCreationLimited");
async function loginRateLimited(request, env2, email) {
  const { ipKey, pairKey } = await loginRateKeys(request, email);
  const windowStart = authWindowStart();
  const results = await env2.DB.batch([
    env2.DB.prepare("SELECT attempts FROM auth_rate_limits WHERE key_hash = ? AND window_start = ?").bind(ipKey, windowStart),
    env2.DB.prepare("SELECT attempts FROM auth_rate_limits WHERE key_hash = ? AND window_start = ?").bind(pairKey, windowStart)
  ]);
  const ipAttempts = Number(results[0]?.results?.[0]?.attempts || 0);
  const pairAttempts = Number(results[1]?.results?.[0]?.attempts || 0);
  return ipAttempts >= AUTH_LOGIN_IP_MAX_FAILURES || pairAttempts >= AUTH_LOGIN_PAIR_MAX_FAILURES;
}
__name(loginRateLimited, "loginRateLimited");
async function recordLoginFailure(request, env2, email) {
  const { ipKey, pairKey } = await loginRateKeys(request, email);
  const [counts, edgeBlocks] = await Promise.all([
    incrementAuthCounters(env2, [ipKey, pairKey]),
    Promise.all([
      edgeRateLimited(env2.AUTH_EDGE_LOGIN_IP_LIMITER, ipKey),
      edgeRateLimited(env2.AUTH_EDGE_LOGIN_PAIR_LIMITER, pairKey)
    ])
  ]);
  return counts[0] < 1 || counts[1] < 1 || counts[0] > AUTH_LOGIN_IP_MAX_FAILURES || counts[1] > AUTH_LOGIN_PAIR_MAX_FAILURES || edgeBlocks[0] || edgeBlocks[1];
}
__name(recordLoginFailure, "recordLoginFailure");
async function passwordResetRequestIpLimited(request, env2) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await sha256(`auth:password-reset-request:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env2.AUTH_EDGE_PASSWORD_RESET_LIMITER, ipKey),
    incrementAuthCounters(env2, [ipKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > PASSWORD_RESET_REQUEST_IP_MAX;
}
__name(passwordResetRequestIpLimited, "passwordResetRequestIpLimited");
async function passwordResetRequestPairLimited(request, env2, email) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const pairKey = await sha256(`auth:password-reset-request:pair:${ip}\0${email}`);
  const counts = await incrementAuthCounters(env2, [pairKey]);
  return counts[0] < 1 || counts[0] > PASSWORD_RESET_REQUEST_PAIR_MAX;
}
__name(passwordResetRequestPairLimited, "passwordResetRequestPairLimited");
async function passwordResetCompleteLimited(request, env2, tokenHash) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await sha256(`auth:password-reset-complete:ip:${ip}`);
  const tokenKey = await sha256(`auth:password-reset-complete:token:${ip}\0${tokenHash}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env2.AUTH_EDGE_PASSWORD_RESET_LIMITER, ipKey),
    incrementAuthCounters(env2, [ipKey, tokenKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[1] < 1 || counts[0] > PASSWORD_RESET_COMPLETE_IP_MAX || counts[1] > PASSWORD_RESET_COMPLETE_TOKEN_MAX;
}
__name(passwordResetCompleteLimited, "passwordResetCompleteLimited");
function configuredAppOrigin(env2) {
  const configured = String(env2.APP_ORIGIN || "");
  const parsed = new URL(configured);
  const normalized = configured.replace(/\/$/, "");
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.origin !== normalized || parsed.protocol !== "https:" && env2.BIKESTORE_TEST_MODE !== "true") {
    throw new Error("password_reset_origin_invalid");
  }
  return parsed.origin;
}
__name(configuredAppOrigin, "configuredAppOrigin");
async function handleApi(request, env2) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const headers = new Headers();
  if (!sameOrigin(request)) return failure("Origen no permitido.", 403);
  try {
    if (path === "/api/health" && method === "GET") {
      await env2.DB.prepare("SELECT 1 AS ok").first();
      try {
        await env2.DB.prepare(`SELECT u.id, u.name, u.email, u.role, u.email_verified_at,
          u.account_type, u.password_hash, u.active, s.token_hash, s.expires_at
          FROM users u LEFT JOIN sessions s ON s.user_id = u.id LIMIT 0`).all();
        await env2.DB.prepare(`SELECT key_hash, window_start, attempts, updated_at
          FROM auth_rate_limits LIMIT 0`).all();
        await env2.DB.prepare(`SELECT user_id, token_hash, expires_at, consumed_at, consumed_by
          FROM password_reset_tokens LIMIT 0`).all();
        return json({ ok: true, database: "connected", authSchema: "ready" });
      } catch (_) {
        return json({ ok: false, database: "connected", authSchema: "incomplete" }, 503);
      }
    }
    if (path === "/api/admin/images/status" && method === "GET") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      const enabled = productImageUploadsReady(env2);
      const response = json({ enabled, maxBytes: MAX_PRODUCT_IMAGE_BYTES, maxPixels: MAX_PRODUCT_IMAGE_PIXELS, maxDecodedBytes: MAX_PRODUCT_IMAGE_DECODED_BYTES, maxChunks: MAX_PRODUCT_IMAGE_CHUNKS, maxIdatChunks: MAX_PRODUCT_IMAGE_IDAT_CHUNKS, maxAncillaryChunks: MAX_PRODUCT_IMAGE_ANCILLARY_CHUNKS, message: enabled ? "La foto se convierte a PNG en el navegador; el Worker vuelve a decodificarla. Solo PNG RGB/RGBA de 8 bits, sin chunks auxiliares, hasta 1600 px, 1,5 MP, 6 MiB expandidos, 1024 chunks IDAT/1026 totales y 4 MiB de archivo. Las imágenes reemplazadas y huérfanas se retienen; no se borran automáticamente." : "Carga desactivada: requiere R2 PRODUCT_IMAGES, PRODUCT_IMAGE_UPLOADS_ENABLED=true y PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED=true después de medir el peor caso en el runtime objetivo. La biblioteca incluida sigue disponible." });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (path.startsWith("/api/images/") && method === "GET") {
      const imageRoute = path.match(R2_PRODUCT_IMAGE_PATH_PATTERN);
      if (!imageRoute) return failure("Imagen no encontrada.", 404);
      if (!env2.PRODUCT_IMAGES || typeof env2.PRODUCT_IMAGES.get !== "function") return failure("El almacenamiento de im\xE1genes no est\xE1 configurado.", 503);
      const object = await env2.PRODUCT_IMAGES.get(`${imageRoute[1]}.${imageRoute[2]}`);
      if (!object) return failure("Imagen no encontrada.", 404);
      const headers2 = new Headers();
      if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers2);
      headers2.set("Content-Type", { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[imageRoute[2]]);
      headers2.set("Cache-Control", "public, max-age=31536000, immutable");
      headers2.set("X-Content-Type-Options", "nosniff");
      if (object.httpEtag) headers2.set("ETag", object.httpEtag);
      return new Response(object.body, { status: 200, headers: headers2 });
    }
    if (path === "/api/admin/images" && method === "POST") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      if (!productImageUploadsReady(env2)) return failure("La carga está desactivada hasta configurar R2, PRODUCT_IMAGE_UPLOADS_ENABLED=true y PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED=true tras medir el peor caso en el runtime objetivo; la biblioteca incluida sigue disponible.", 503);
      const formData = await bodyMultipartFormData(request);
      const entries = [...formData.entries()];
      const file = formData.get("image");
      if (entries.length !== 1 || entries[0][0] !== "image" || !file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") {
        return failure("Selecciona un archivo de imagen.");
      }
      if (file.size < 1 || file.size > MAX_PRODUCT_IMAGE_BYTES) return failure("La imagen PNG convertida debe pesar hasta 4 MiB.", 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const format = await validateProductImageBytes(bytes, file.type || "");
      if (!format) return failure("El servidor solo acepta un PNG RGB/RGBA canónico de 8 bits, sin chunks auxiliares, que respete los límites y se decodifique por completo.", 415);
      const key = `${newId()}.${format.extension}`;
      // Retención deliberadamente conservadora: claves únicas, nunca sobrescritas y sin delete/TTL automático. Al reemplazar, dar de baja o fallar el guardado del producto se conservan tanto la imagen previa como posibles huérfanas. Por eso el caché immutable de un año no queda apuntando a objetos borrados.
      await env2.PRODUCT_IMAGES.put(key, bytes, { httpMetadata: { contentType: format.contentType, cacheControl: "public, max-age=31536000, immutable" } });
      return json({ image: `/api/images/${key}` }, 201, headers);
    }
    if (path === "/api/products" && method === "GET") {
      return json({ products: await listProducts(env2, request, false) });
    }
    if (path === "/api/auth/session" && method === "GET") {
      return json({ user: publicUser(await authenticate(request, env2)) });
    }
    if (path === "/api/auth/register" && method === "POST") {
      if (await registrationAttemptLimited(request, env2)) return failure("Demasiados intentos de registro. Espera unos minutos.", 429);
      const input = await bodyJson(request);
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const password = input.password;
      if (!validName(name) || !isEmail(email) || !validPassword(password)) {
        return failure("Revisa nombre, correo y contrase\xF1a (m\xEDnimo 8 caracteres).");
      }
      if (email === ADMIN_EMAIL) return failure("Esta cuenta administradora ya est\xE1 reservada.", 409);
      const user = { id: newId(), name, email, role: "customer", account_type: "account" };
      const hash = await passwordHash(password);
      const inserted = await env2.DB.prepare(`INSERT INTO users (id, account_type, name, email, role, password_hash)
        VALUES (?, 'account', ?, ?, 'customer', ?)
        ON CONFLICT DO NOTHING RETURNING id`).bind(user.id, name, email, hash).first();
      if (!inserted) {
        const duplicate = await env2.DB.prepare(`SELECT id FROM users
          WHERE email = ? COLLATE NOCASE AND account_type = 'account'`).bind(email).first();
        if (duplicate) return failure("No se pudo crear la cuenta. Si el correo ya existe, inicia sesi\xF3n.", 409);
        throw new Error("registration_insert_not_applied");
      }
      await mergeGuestCart(request, env2, user.id);
      await issueSession(user, env2, headers);
      return json({ user: publicUser(user) }, 201, headers);
    }
    if (path === "/api/auth/login" && method === "POST") {
      const input = await bodyJson(request);
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (await loginRateLimited(request, env2, email)) return failure("Demasiados intentos fallidos desde este origen. Intenta m\xE1s tarde o desde otra red.", 429);
      const user = isEmail(email) ? await env2.DB.prepare(`SELECT id, name, email, role, email_verified_at, account_type, password_hash, active
        FROM users WHERE email = ? COLLATE NOCASE AND account_type = 'account'`).bind(email).first() : null;
      const passwordOk = user ? await verifyPassword(password, user.password_hash) : false;
      if (!user || !user.active || !passwordOk) {
        const limited = await recordLoginFailure(request, env2, email);
        return failure("Correo o contrase\xF1a incorrectos.", limited ? 429 : 401);
      }
      await mergeGuestCart(request, env2, user.id);
      await issueSession(user, env2, headers);
      return json({ user: publicUser(user) }, 200, headers);
    }
    if (path === "/api/auth/password-reset/request" && method === "POST") {
      if (await passwordResetRequestIpLimited(request, env2)) return failure("Demasiadas solicitudes. Intenta m\xE1s tarde.", 429);
      const input = await bodyJson(request);
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (!isEmail(email)) return failure("Escribe un correo electr\xF3nico v\xE1lido.");
      if (await passwordResetRequestPairLimited(request, env2, email)) return failure("Demasiadas solicitudes. Intenta m\xE1s tarde.", 429);
      const user = await env2.DB.prepare(`SELECT id, email FROM users
        WHERE email = ? COLLATE NOCASE AND account_type = 'account' AND active = 1`).bind(email).first();
      if (user) {
        const token = randomToken();
        const tokenHash = await sha256(token);
        const expiresAt = Math.floor(Date.now() / 1e3) + PASSWORD_RESET_SECONDS;
        const stored = await env2.DB.batch([
          env2.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at < unixepoch() - 86400"),
          env2.DB.prepare(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            SELECT ?, ?, ?
            WHERE (SELECT COUNT(*) FROM password_reset_tokens) < ?
              OR EXISTS (SELECT 1 FROM password_reset_tokens WHERE user_id = ?)
            ON CONFLICT(user_id) DO UPDATE SET
              token_hash = excluded.token_hash, expires_at = excluded.expires_at,
              consumed_at = NULL, consumed_by = NULL, created_at = unixepoch()
            RETURNING user_id`).bind(user.id, tokenHash, expiresAt, PASSWORD_RESET_MAX_ROWS, user.id)
        ]);
        if (stored[1]?.meta?.changes) {
          try {
            const origin = configuredAppOrigin(env2);
            const resetUrl = `${origin}/#password-reset=${token}`;
            await sendPasswordResetEmail({
              apiKey: env2.RESEND_API_KEY,
              fromEmail: env2.RESEND_FROM_EMAIL,
              to: user.email,
              resetUrl,
              testMode: env2.BIKESTORE_TEST_MODE === "true",
              testEndpoint: env2.RESEND_TEST_ENDPOINT
            });
          } catch (_) {
            await env2.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?
              AND token_hash = ? AND consumed_at IS NULL`).bind(user.id, tokenHash).run().catch(() => {
            });
            console.error("bikestore-password-reset-delivery-failed");
          }
        }
      }
      return json({ ok: true, message: PASSWORD_RESET_REPLY }, 202);
    }
    if (path === "/api/auth/password-reset/complete" && method === "POST") {
      const input = await bodyJson(request);
      const token = typeof input.token === "string" ? input.token : "";
      const password = input.password;
      if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !validPassword(password)) {
        return failure("El enlace no es v\xE1lido o venci\xF3, o la contrase\xF1a no cumple el m\xEDnimo de 8 caracteres.");
      }
      const tokenHash = await sha256(token);
      if (await passwordResetCompleteLimited(request, env2, tokenHash)) return failure("Demasiados intentos. Intenta m\xE1s tarde.", 429);
      const validToken = await env2.DB.prepare(`SELECT user_id FROM password_reset_tokens
        WHERE token_hash = ? AND consumed_at IS NULL AND consumed_by IS NULL AND expires_at > unixepoch()`).bind(tokenHash).first();
      if (!validToken) return failure("El enlace no es v\xE1lido o venci\xF3.", 400);
      const newPasswordHash = await passwordHash(password);
      const redemptionId = newId();
      const results = await env2.DB.batch([
        env2.DB.prepare(`UPDATE password_reset_tokens SET consumed_at = unixepoch(), consumed_by = ?
          WHERE token_hash = ? AND consumed_at IS NULL AND consumed_by IS NULL AND expires_at > unixepoch()`).bind(redemptionId, tokenHash),
        env2.DB.prepare(`UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, unixepoch())
          WHERE id = (SELECT user_id FROM password_reset_tokens
            WHERE token_hash = ? AND consumed_by = ? AND consumed_at IS NOT NULL)
            AND account_type = 'account' AND active = 1`).bind(newPasswordHash, tokenHash, redemptionId),
        env2.DB.prepare(`DELETE FROM sessions WHERE user_id = (SELECT user_id FROM password_reset_tokens
          WHERE token_hash = ? AND consumed_by = ? AND consumed_at IS NOT NULL)`).bind(tokenHash, redemptionId)
      ]);
      if (!results[1]?.meta?.changes) return failure("El enlace no es v\xE1lido o venci\xF3.", 400);
      headers.append("Set-Cookie", clearCookie(SESSION_COOKIE));
      return json({ ok: true }, 200, headers);
    }
    if (path === "/api/auth/logout" && method === "POST") {
      const token = cookieValue(request, SESSION_COOKIE);
      if (token) await env2.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
      const guest = await findGuest(request, env2);
      if (guest) await purgeGuestData(env2, guest.id);
      headers.append("Set-Cookie", clearCookie(SESSION_COOKIE));
      headers.append("Set-Cookie", clearCookie(GUEST_COOKIE));
      return json({ ok: true }, 200, headers);
    }
    if (path === "/api/cart" && method === "GET") {
      const owner = await currentCartOwner(request, env2, headers);
      const result = owner ? await readCart(env2, owner.cartId, owner.user) : emptyGuestCart();
      return json(result, 200, headers);
    }
    if (path === "/api/cart/items" && method === "POST") {
      const owner = await currentCartOwner(request, env2, headers);
      const input = await bodyJson(request);
      const productId = typeof input.productId === "string" ? input.productId : "";
      const variant = typeof input.variant === "string" ? input.variant.trim().slice(0, 24) : "";
      const amount = Number(input.quantity ?? 1);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId) || !Number.isInteger(amount) || amount < 1 || amount > 100) return failure("Producto o cantidad inv\xE1lidos.");
      let cartOwner = owner;
      if (!cartOwner) {
        const available = await env2.DB.prepare(`SELECT 1 AS ok FROM products p
          JOIN inventory_stock s ON s.product_id = p.id
          WHERE p.id = ? AND p.is_active = 1 AND s.quantity >= ?`).bind(productId, amount).first();
        if (!available) return failure("No hay existencias suficientes para esa cantidad.", 409);
        if (await guestCreationLimited(request, env2)) return failure("Demasiadas creaciones de carrito desde esta red. Intenta m\xE1s tarde.", 429);
        cartOwner = await createGuestCartOwner(env2, headers);
      }
      const write = await env2.DB.prepare(`
        INSERT INTO cart_items (cart_id, product_id, variant, quantity)
        SELECT ?, p.id, ?, ? FROM products p JOIN inventory_stock s ON s.product_id = p.id
        WHERE p.id = ? AND p.is_active = 1 AND s.quantity >= ?
          AND COALESCE((SELECT SUM(ci.quantity) FROM cart_items ci WHERE ci.cart_id = ? AND ci.product_id = p.id), 0) + ? <= s.quantity
        ON CONFLICT(cart_id, product_id, variant) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = unixepoch()
      `).bind(cartOwner.cartId, variant, amount, productId, amount, cartOwner.cartId, amount).run();
      if (!write.meta?.changes) return failure("No hay existencias suficientes para esa cantidad.", 409);
      await env2.DB.prepare("UPDATE carts SET updated_at = unixepoch() WHERE id = ?").bind(cartOwner.cartId).run();
      return json(await readCart(env2, cartOwner.cartId, cartOwner.user), 200, headers);
    }
    if (path === "/api/cart/items" && method === "PUT") {
      const owner = await currentCartOwner(request, env2, headers);
      if (!owner) return failure("No existe esa l\xEDnea o no hay existencias suficientes.", 409);
      const input = await bodyJson(request);
      const productId = typeof input.productId === "string" ? input.productId : "";
      const variant = typeof input.variant === "string" ? input.variant.trim().slice(0, 24) : "";
      const quantity = Number(input.quantity);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return failure("Producto o cantidad inv\xE1lidos.");
      const write = await env2.DB.prepare(`
        UPDATE cart_items SET quantity = ?, updated_at = unixepoch()
        WHERE cart_id = ? AND product_id = ? AND variant = ?
          AND EXISTS (SELECT 1 FROM products p JOIN inventory_stock s ON s.product_id = p.id
            WHERE p.id = ? AND p.is_active = 1
              AND ? + COALESCE((SELECT SUM(other.quantity) FROM cart_items other
                WHERE other.cart_id = ? AND other.product_id = p.id AND other.variant <> ?), 0) <= s.quantity)
      `).bind(quantity, owner.cartId, productId, variant, productId, quantity, owner.cartId, variant).run();
      if (!write.meta?.changes) return failure("No existe esa l\xEDnea o no hay existencias suficientes.", 409);
      await env2.DB.prepare("UPDATE carts SET updated_at = unixepoch() WHERE id = ?").bind(owner.cartId).run();
      return json(await readCart(env2, owner.cartId, owner.user), 200, headers);
    }
    if (path === "/api/cart/items" && method === "DELETE") {
      const owner = await currentCartOwner(request, env2, headers);
      if (!owner) return json(emptyGuestCart(), 200, headers);
      const productId = url.searchParams.get("productId") || "";
      const variant = (url.searchParams.get("variant") || "").slice(0, 24);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId)) return failure("Producto inv\xE1lido.");
      await env2.DB.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant = ?").bind(owner.cartId, productId, variant).run();
      return json(await readCart(env2, owner.cartId, owner.user), 200, headers);
    }
    if (path === "/api/cart" && method === "DELETE") {
      const owner = await currentCartOwner(request, env2, headers);
      if (!owner) return json(emptyGuestCart(), 200, headers);
      await env2.DB.prepare("DELETE FROM cart_items WHERE cart_id = ?").bind(owner.cartId).run();
      return json(await readCart(env2, owner.cartId, owner.user), 200, headers);
    }
    if (path === "/api/admin/products" && method === "GET") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      return json({ products: await listProducts(env2, request, true) });
    }
    if (path === "/api/admin/products" && method === "POST") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      const product = cleanProductInput(await bodyJson(request));
      if (!product) return failure("Revisa los datos del producto.");
      const category = await env2.DB.prepare("SELECT id FROM categories WHERE name = ? AND is_active = 1").bind(product.category).first();
      if (!category) return failure("Categor\xEDa inv\xE1lida.");
      const idempotency = `initial-stock:${product.id}:${newId()}`;
      const statements = [env2.DB.prepare(`INSERT INTO products
        (id, category_id, sku, slug, name, description, price_minor, currency_code, image_path, is_active, featured, flag, gear)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COP', ?, ?, 0, 'Nuevo', ?)`).bind(product.id, category.id, product.id.toUpperCase(), product.id, product.name, product.description, product.price, product.image, product.active ? 1 : 0, product.category.startsWith("Bicicletas") ? 0 : 1)];
      if (product.stock > 0) statements.push(env2.DB.prepare(`INSERT INTO inventory_transactions
        (id, product_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 'restock', ?)`).bind(newId(), product.id, product.stock, idempotency));
      try {
        await env2.DB.batch(statements);
      } catch (_) {
        return failure("No se pudo crear: el identificador ya existe o los datos no son v\xE1lidos.", 409);
      }
      return json({ product: (await listProducts(env2, new Request(`${url.origin}/api/admin/products?q=${encodeURIComponent(product.name)}`), true))[0] }, 201);
    }
    const productRoute = path.match(/^\/api\/admin\/products\/([a-z0-9_-]{3,48})$/i);
    if (productRoute && method === "PATCH") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      const product = cleanProductInput(await bodyJson(request));
      if (!product || product.id.toLowerCase() !== productRoute[1].toLowerCase()) return failure("Revisa los datos del producto.");
      const category = await env2.DB.prepare("SELECT id FROM categories WHERE name = ? AND is_active = 1").bind(product.category).first();
      const current = await env2.DB.prepare(`SELECT p.id FROM products p
        JOIN inventory_stock s ON s.product_id = p.id WHERE p.id = ?`).bind(productRoute[1]).first();
      if (!category || !current) return failure("Producto o categor\xEDa no encontrados.", 404);
      const idempotencyKey = request.headers.get("Idempotency-Key") || "";
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return failure("Se requiere una clave Idempotency-Key v\xE1lida.", 400);
      const payloadHash = await sha256(JSON.stringify(product));
      const inventoryKey = `admin-patch:${idempotencyKey}`;
      try {
        await env2.DB.batch([
          env2.DB.prepare(`INSERT INTO admin_product_patch_requests (idempotency_key, product_id, payload_hash)
            VALUES (?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`).bind(idempotencyKey, product.id, payloadHash),
          env2.DB.prepare(`UPDATE products SET category_id = ?, name = ?, description = ?, price_minor = ?, image_path = ?, is_active = ?, gear = ?, updated_at = unixepoch()
            WHERE id = ? AND EXISTS (SELECT 1 FROM admin_product_patch_requests r
              WHERE r.idempotency_key = ? AND r.product_id = ? AND r.payload_hash = ?)`).bind(
            category.id,
            product.name,
            product.description,
            product.price,
            product.image,
            product.active ? 1 : 0,
            product.category.startsWith("Bicicletas") ? 0 : 1,
            product.id,
            idempotencyKey,
            product.id,
            payloadHash
          ),
          env2.DB.prepare(`INSERT INTO inventory_transactions (id, product_id, delta, reason, idempotency_key)
            SELECT ?, s.product_id, ? - s.quantity, 'adjustment', ? FROM inventory_stock s
            WHERE s.product_id = ? AND s.quantity <> ?
              AND EXISTS (SELECT 1 FROM admin_product_patch_requests r
                WHERE r.idempotency_key = ? AND r.product_id = ? AND r.payload_hash = ?)
            ON CONFLICT(idempotency_key) DO NOTHING`).bind(newId(), product.stock, inventoryKey, product.id, product.stock, idempotencyKey, product.id, payloadHash)
        ]);
      } catch (_) {
        return failure("No se pudo guardar el producto o el ajuste de stock.", 409);
      }
      const requestRecord = await env2.DB.prepare("SELECT product_id, payload_hash FROM admin_product_patch_requests WHERE idempotency_key = ?").bind(idempotencyKey).first();
      if (!requestRecord || requestRecord.product_id !== product.id || requestRecord.payload_hash !== payloadHash) {
        return failure("La clave idempotente ya fue usada con otra solicitud.", 409);
      }
      return json({ product: await env2.DB.prepare(`${productSelect()} WHERE p.id = ?`).bind(product.id).first() });
    }
    if (productRoute && method === "DELETE") {
      const auth = await requireAdmin(request, env2);
      if (auth.error) return auth.error;
      const productId = productRoute[1];
      const exists = await env2.DB.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
      if (!exists) return failure("Producto no encontrado.", 404);
      await env2.DB.batch([
        env2.DB.prepare("UPDATE products SET is_active = 0, updated_at = unixepoch() WHERE id = ?").bind(productId),
        env2.DB.prepare("DELETE FROM cart_items WHERE product_id = ?").bind(productId)
      ]);
      return json({ ok: true, deleted: productId });
    }
    return failure("Ruta no encontrada.", 404);
  } catch (error3) {
    if (Number.isInteger(error3?.status)) return failure(String(error3.message || "Solicitud inv\xE1lida."), error3.status);
    if (error3 instanceof SyntaxError) return failure("El JSON enviado no es v\xE1lido.");
    if (String(error3?.message || "").includes("JSON")) return failure(error3.message);
    console.error("bikestore-api-error", String(error3?.message || "unknown").slice(0, 180));
    return failure("No se pudo completar la solicitud.", 500);
  }
}
__name(handleApi, "handleApi");
function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(secureResponse, "secureResponse");
var worker_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return secureResponse(await handleApi(request, env2));
    }
    const appRoutes = /* @__PURE__ */ new Set(["/catalogo", "/accesorios", "/carrito", "/checkout", "/confirmacion", "/admin"]);
    const appRoute = appRoutes.has(url.pathname) || /^\/producto\/[a-z0-9_-]{1,48}$/i.test(url.pathname);
    if (appRoute && ["GET", "HEAD"].includes(request.method)) {
      const appUrl = new URL("/", url.origin);
      return secureResponse(await env2.ASSETS.fetch(new Request(appUrl, request)));
    }
    const response = await env2.ASSETS.fetch(request);
    return secureResponse(response);
  },
  async scheduled(_controller, env2) {
    await cleanupExpiredGuests(env2);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
