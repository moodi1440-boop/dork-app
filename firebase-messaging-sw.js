(() => {
  // node_modules/@firebase/util/dist/postinstall.mjs
  var getDefaultsFromPostinstall = () => void 0;

  // node_modules/@firebase/util/dist/index.esm.js
  var stringToByteArray$1 = function(str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return out;
  };
  var byteArrayToString = function(bytes) {
    const out = [];
    let pos = 0, c = 0;
    while (pos < bytes.length) {
      const c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        const c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        const c4 = bytes[pos++];
        const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
        out[c++] = String.fromCharCode(55296 + (u >> 10));
        out[c++] = String.fromCharCode(56320 + (u & 1023));
      } else {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join("");
  };
  var base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
      return this.ENCODED_VALS_BASE + "+/=";
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
      return this.ENCODED_VALS_BASE + "-_.";
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === "function",
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error("encodeByteArray takes an array as a parameter");
      }
      this.init_();
      const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      const output = [];
      for (let i = 0; i < input.length; i += 3) {
        const byte1 = input[i];
        const haveByte2 = i + 1 < input.length;
        const byte2 = haveByte2 ? input[i + 1] : 0;
        const haveByte3 = i + 2 < input.length;
        const byte3 = haveByte3 ? input[i + 2] : 0;
        const outByte1 = byte1 >> 2;
        const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
        let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
        let outByte4 = byte3 & 63;
        if (!haveByte3) {
          outByte4 = 64;
          if (!haveByte2) {
            outByte3 = 64;
          }
        }
        output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
      }
      return output.join("");
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return btoa(input);
      }
      return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return atob(input);
      }
      return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
      this.init_();
      const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      const output = [];
      for (let i = 0; i < input.length; ) {
        const byte1 = charToByteMap[input.charAt(i++)];
        const haveByte2 = i < input.length;
        const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        const haveByte3 = i < input.length;
        const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        const haveByte4 = i < input.length;
        const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw new DecodeBase64StringError();
        }
        const outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);
        if (byte3 !== 64) {
          const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
          output.push(outByte2);
          if (byte4 !== 64) {
            const outByte3 = byte3 << 6 & 192 | byte4;
            output.push(outByte3);
          }
        }
      }
      return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {};
        for (let i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  var DecodeBase64StringError = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "DecodeBase64StringError";
    }
  };
  var base64Encode = function(str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  var base64urlEncodeWithoutPadding = function(str) {
    return base64Encode(str).replace(/\./g, "");
  };
  var base64Decode = function(str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error("base64Decode failed: ", e);
    }
    return null;
  };
  function getGlobal() {
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    throw new Error("Unable to locate global object.");
  }
  var getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
  var getDefaultsFromEnvVariable = () => {
    if (typeof process === "undefined" || typeof process.env === "undefined") {
      return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
      return JSON.parse(defaultsJsonString);
    }
  };
  var getDefaultsFromCookie = () => {
    if (typeof document === "undefined") {
      return;
    }
    let match;
    try {
      match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    } catch (e) {
      return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
  };
  var getDefaults = () => {
    try {
      return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
    } catch (e) {
      console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
      return;
    }
  };
  var getDefaultAppConfig = () => getDefaults()?.config;
  var Deferred = class {
    constructor() {
      this.reject = () => {
      };
      this.resolve = () => {
      };
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    /**
     * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
      return (error, value) => {
        if (error) {
          this.reject(error);
        } else {
          this.resolve(value);
        }
        if (typeof callback === "function") {
          this.promise.catch(() => {
          });
          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    }
  };
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === "object";
    } catch (e) {
      return false;
    }
  }
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          reject(request.error?.message || "");
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  var ERROR_NAME = "FirebaseError";
  var FirebaseError = class _FirebaseError extends Error {
    constructor(code, message, customData) {
      super(message);
      this.code = code;
      this.customData = customData;
      this.name = ERROR_NAME;
      Object.setPrototypeOf(this, _FirebaseError.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorFactory.prototype.create);
      }
    }
  };
  var ErrorFactory = class {
    constructor(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }
    create(code, ...data) {
      const customData = data[0] || {};
      const fullCode = `${this.service}/${code}`;
      const template = this.errors[code];
      const message = template ? replaceTemplate(template, customData) : "Error";
      const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
      const error = new FirebaseError(fullCode, fullMessage, customData);
      return error;
    }
  };
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
      const value = data[key];
      return value != null ? String(value) : `<${key}?>`;
    });
  }
  var PATTERN = /\{\$([^}]+)}/g;
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === "object";
  }
  var MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }

  // node_modules/@firebase/component/dist/esm/index.esm.js
  var Component = class {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name4, instanceFactory, type) {
      this.name = name4;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      this.serviceProps = {};
      this.instantiationMode = "LAZY";
      this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
      this.instantiationMode = mode;
      return this;
    }
    setMultipleInstances(multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    }
    setServiceProps(props) {
      this.serviceProps = props;
      return this;
    }
    setInstanceCreatedCallback(callback) {
      this.onInstanceCreated = callback;
      return this;
    }
  };
  var DEFAULT_ENTRY_NAME = "[DEFAULT]";
  var Provider = class {
    constructor(name4, container) {
      this.name = name4;
      this.container = container;
      this.component = null;
      this.instances = /* @__PURE__ */ new Map();
      this.instancesDeferred = /* @__PURE__ */ new Map();
      this.instancesOptions = /* @__PURE__ */ new Map();
      this.onInitCallbacks = /* @__PURE__ */ new Map();
    }
    /**
     * @param identifier A provider can provide multiple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        const deferred = new Deferred();
        this.instancesDeferred.set(normalizedIdentifier, deferred);
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            const instance = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            if (instance) {
              deferred.resolve(instance);
            }
          } catch (e) {
          }
        }
      }
      return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
      const optional = options?.optional ?? false;
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          return this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
        } catch (e) {
          if (optional) {
            return null;
          } else {
            throw e;
          }
        }
      } else {
        if (optional) {
          return null;
        } else {
          throw Error(`Service ${this.name} is not available`);
        }
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(component) {
      if (component.name !== this.name) {
        throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
      }
      if (this.component) {
        throw Error(`Component for ${this.name} has already been provided`);
      }
      this.component = component;
      if (!this.shouldAutoInitialize()) {
        return;
      }
      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
        } catch (e) {
        }
      }
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          instanceDeferred.resolve(instance);
        } catch (e) {
        }
      }
    }
    clearInstance(identifier = DEFAULT_ENTRY_NAME) {
      this.instancesDeferred.delete(identifier);
      this.instancesOptions.delete(identifier);
      this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    async delete() {
      const services = Array.from(this.instances.values());
      await Promise.all([
        ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
        ...services.filter((service) => "_delete" in service).map((service) => service._delete())
      ]);
    }
    isComponentSet() {
      return this.component != null;
    }
    isInitialized(identifier = DEFAULT_ENTRY_NAME) {
      return this.instances.has(identifier);
    }
    getOptions(identifier = DEFAULT_ENTRY_NAME) {
      return this.instancesOptions.get(identifier) || {};
    }
    initialize(opts = {}) {
      const { options = {} } = opts;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
      if (this.isInitialized(normalizedIdentifier)) {
        throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
      }
      if (!this.isComponentSet()) {
        throw Error(`Component ${this.name} has not been registered yet`);
      }
      const instance = this.getOrInitializeService({
        instanceIdentifier: normalizedIdentifier,
        options
      });
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        if (normalizedIdentifier === normalizedDeferredIdentifier) {
          instanceDeferred.resolve(instance);
        }
      }
      return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ?? /* @__PURE__ */ new Set();
      existingCallbacks.add(callback);
      this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
      const existingInstance = this.instances.get(normalizedIdentifier);
      if (existingInstance) {
        callback(existingInstance, normalizedIdentifier);
      }
      return () => {
        existingCallbacks.delete(callback);
      };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
      const callbacks = this.onInitCallbacks.get(identifier);
      if (!callbacks) {
        return;
      }
      for (const callback of callbacks) {
        try {
          callback(instance, identifier);
        } catch {
        }
      }
    }
    getOrInitializeService({ instanceIdentifier, options = {} }) {
      let instance = this.instances.get(instanceIdentifier);
      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, {
          instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
          options
        });
        this.instances.set(instanceIdentifier, instance);
        this.instancesOptions.set(instanceIdentifier, options);
        this.invokeOnInitCallbacks(instance, instanceIdentifier);
        if (this.component.onInstanceCreated) {
          try {
            this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
          } catch {
          }
        }
      }
      return instance || null;
    }
    normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME) {
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
      } else {
        return identifier;
      }
    }
    shouldAutoInitialize() {
      return !!this.component && this.component.instantiationMode !== "EXPLICIT";
    }
  };
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER";
  }
  var ComponentContainer = class {
    constructor(name4) {
      this.name = name4;
      this.providers = /* @__PURE__ */ new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
      }
      provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        this.providers.delete(component.name);
      }
      this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name4) {
      if (this.providers.has(name4)) {
        return this.providers.get(name4);
      }
      const provider = new Provider(name4, this);
      this.providers.set(name4, provider);
      return provider;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  };

  // node_modules/@firebase/logger/dist/esm/index.esm.js
  var instances = [];
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
    LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
    LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));
  var levelStringToEnum = {
    "debug": LogLevel.DEBUG,
    "verbose": LogLevel.VERBOSE,
    "info": LogLevel.INFO,
    "warn": LogLevel.WARN,
    "error": LogLevel.ERROR,
    "silent": LogLevel.SILENT
  };
  var defaultLogLevel = LogLevel.INFO;
  var ConsoleMethod = {
    [LogLevel.DEBUG]: "log",
    [LogLevel.VERBOSE]: "log",
    [LogLevel.INFO]: "info",
    [LogLevel.WARN]: "warn",
    [LogLevel.ERROR]: "error"
  };
  var defaultLogHandler = (instance, logType, ...args) => {
    if (logType < instance.logLevel) {
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
      console[method](`[${now}]  ${instance.name}:`, ...args);
    } else {
      throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
    }
  };
  var Logger = class {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name4) {
      this.name = name4;
      this._logLevel = defaultLogLevel;
      this._logHandler = defaultLogHandler;
      this._userLogHandler = null;
      instances.push(this);
    }
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(val) {
      if (!(val in LogLevel)) {
        throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
      }
      this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
      this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
    }
    get logHandler() {
      return this._logHandler;
    }
    set logHandler(val) {
      if (typeof val !== "function") {
        throw new TypeError("Value assigned to `logHandler` must be a function");
      }
      this._logHandler = val;
    }
    get userLogHandler() {
      return this._userLogHandler;
    }
    set userLogHandler(val) {
      this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
      this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
      this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
      this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
      this._logHandler(this, LogLevel.WARN, ...args);
    }
    error(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
      this._logHandler(this, LogLevel.ERROR, ...args);
    }
  };

  // node_modules/idb/build/wrap-idb-value.js
  var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  var idbProxyableTypes;
  var cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  var cursorRequestMap = /* @__PURE__ */ new WeakMap();
  var transactionDoneMap = /* @__PURE__ */ new WeakMap();
  var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
  var transformCache = /* @__PURE__ */ new WeakMap();
  var reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    promise.then((value) => {
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
    }).catch(() => {
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  var idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "objectStoreNames") {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        }
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
      return function(storeNames, ...args) {
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var unwrap = (value) => reverseTransformCache.get(value);

  // node_modules/idb/build/index.js
  function openDB(name4, version4, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name4, version4);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  function deleteDB(name4, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name4);
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event
      ));
    }
    return wrap(request).then(() => void 0);
  }
  var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  var writeMethods = ["put", "add", "delete", "clear"];
  var cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));

  // node_modules/@firebase/app/dist/esm/index.esm.js
  var PlatformLoggerServiceImpl = class {
    constructor(container) {
      this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
      const providers = this.container.getProviders();
      return providers.map((provider) => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate();
          return `${service.library}/${service.version}`;
        } else {
          return null;
        }
      }).filter((logString) => logString).join(" ");
    }
  };
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return component?.type === "VERSION";
  }
  var name$q = "@firebase/app";
  var version$1 = "0.14.13";
  var logger = new Logger("@firebase/app");
  var name$p = "@firebase/app-compat";
  var name$o = "@firebase/analytics-compat";
  var name$n = "@firebase/analytics";
  var name$m = "@firebase/app-check-compat";
  var name$l = "@firebase/app-check";
  var name$k = "@firebase/auth";
  var name$j = "@firebase/auth-compat";
  var name$i = "@firebase/database";
  var name$h = "@firebase/data-connect";
  var name$g = "@firebase/database-compat";
  var name$f = "@firebase/functions";
  var name$e = "@firebase/functions-compat";
  var name$d = "@firebase/installations";
  var name$c = "@firebase/installations-compat";
  var name$b = "@firebase/messaging";
  var name$a = "@firebase/messaging-compat";
  var name$9 = "@firebase/performance";
  var name$8 = "@firebase/performance-compat";
  var name$7 = "@firebase/remote-config";
  var name$6 = "@firebase/remote-config-compat";
  var name$5 = "@firebase/storage";
  var name$4 = "@firebase/storage-compat";
  var name$3 = "@firebase/firestore";
  var name$2 = "@firebase/ai";
  var name$1 = "@firebase/firestore-compat";
  var name = "firebase";
  var DEFAULT_ENTRY_NAME2 = "[DEFAULT]";
  var PLATFORM_LOG_STRING = {
    [name$q]: "fire-core",
    [name$p]: "fire-core-compat",
    [name$n]: "fire-analytics",
    [name$o]: "fire-analytics-compat",
    [name$l]: "fire-app-check",
    [name$m]: "fire-app-check-compat",
    [name$k]: "fire-auth",
    [name$j]: "fire-auth-compat",
    [name$i]: "fire-rtdb",
    [name$h]: "fire-data-connect",
    [name$g]: "fire-rtdb-compat",
    [name$f]: "fire-fn",
    [name$e]: "fire-fn-compat",
    [name$d]: "fire-iid",
    [name$c]: "fire-iid-compat",
    [name$b]: "fire-fcm",
    [name$a]: "fire-fcm-compat",
    [name$9]: "fire-perf",
    [name$8]: "fire-perf-compat",
    [name$7]: "fire-rc",
    [name$6]: "fire-rc-compat",
    [name$5]: "fire-gcs",
    [name$4]: "fire-gcs-compat",
    [name$3]: "fire-fst",
    [name$1]: "fire-fst-compat",
    [name$2]: "fire-vertex",
    "fire-js": "fire-js",
    // Platform identifier for JS SDK.
    [name]: "fire-js-all"
  };
  var _apps = /* @__PURE__ */ new Map();
  var _serverApps = /* @__PURE__ */ new Map();
  var _components = /* @__PURE__ */ new Map();
  function _addComponent(app2, component) {
    try {
      app2.container.addComponent(component);
    } catch (e) {
      logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app2.name}`, e);
    }
  }
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger.debug(`There were multiple attempts to register component ${componentName}.`);
      return false;
    }
    _components.set(componentName, component);
    for (const app2 of _apps.values()) {
      _addComponent(app2, component);
    }
    for (const serverApp of _serverApps.values()) {
      _addComponent(serverApp, component);
    }
    return true;
  }
  function _getProvider(app2, name4) {
    const heartbeatController = app2.container.getProvider("heartbeat").getImmediate({ optional: true });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app2.container.getProvider(name4);
  }
  var ERRORS = {
    [
      "no-app"
      /* AppError.NO_APP */
    ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
    [
      "bad-app-name"
      /* AppError.BAD_APP_NAME */
    ]: "Illegal App name: '{$appName}'",
    [
      "duplicate-app"
      /* AppError.DUPLICATE_APP */
    ]: "Firebase App named '{$appName}' already exists with different options or config",
    [
      "app-deleted"
      /* AppError.APP_DELETED */
    ]: "Firebase App named '{$appName}' already deleted",
    [
      "server-app-deleted"
      /* AppError.SERVER_APP_DELETED */
    ]: "Firebase Server App has been deleted",
    [
      "no-options"
      /* AppError.NO_OPTIONS */
    ]: "Need to provide options, when not being deployed to hosting via source.",
    [
      "invalid-app-argument"
      /* AppError.INVALID_APP_ARGUMENT */
    ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
    [
      "invalid-log-argument"
      /* AppError.INVALID_LOG_ARGUMENT */
    ]: "First argument to `onLog` must be null or a function.",
    [
      "idb-open"
      /* AppError.IDB_OPEN */
    ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-get"
      /* AppError.IDB_GET */
    ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-set"
      /* AppError.IDB_WRITE */
    ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-delete"
      /* AppError.IDB_DELETE */
    ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "finalization-registry-not-supported"
      /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
    ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
    [
      "invalid-server-app-environment"
      /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
    ]: "FirebaseServerApp is not for use in browser environments."
  };
  var ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
  var FirebaseAppImpl = class {
    constructor(options, config, container) {
      this._isDeleted = false;
      this._options = { ...options };
      this._config = { ...config };
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component(
        "app",
        () => this,
        "PUBLIC"
        /* ComponentType.PUBLIC */
      ));
    }
    get automaticDataCollectionEnabled() {
      this.checkDestroyed();
      return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
      this.checkDestroyed();
      this._automaticDataCollectionEnabled = val;
    }
    get name() {
      this.checkDestroyed();
      return this._name;
    }
    get options() {
      this.checkDestroyed();
      return this._options;
    }
    get config() {
      this.checkDestroyed();
      return this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(val) {
      this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
      if (this.isDeleted) {
        throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
      }
    }
  };
  function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== "object") {
      const name5 = rawConfig;
      rawConfig = { name: name5 };
    }
    const config = {
      name: DEFAULT_ENTRY_NAME2,
      automaticDataCollectionEnabled: true,
      ...rawConfig
    };
    const name4 = config.name;
    if (typeof name4 !== "string" || !name4) {
      throw ERROR_FACTORY.create("bad-app-name", {
        appName: String(name4)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY.create(
        "no-options"
        /* AppError.NO_OPTIONS */
      );
    }
    const existingApp = _apps.get(name4);
    if (existingApp) {
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app", { appName: name4 });
      }
    }
    const container = new ComponentContainer(name4);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name4, newApp);
    return newApp;
  }
  function getApp(name4 = DEFAULT_ENTRY_NAME2) {
    const app2 = _apps.get(name4);
    if (!app2 && name4 === DEFAULT_ENTRY_NAME2 && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app2) {
      throw ERROR_FACTORY.create("no-app", { appName: name4 });
    }
    return app2;
  }
  function registerVersion(libraryKeyOrName, version4, variant) {
    let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version4.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version4}":`
      ];
      if (libraryMismatch) {
        warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
      }
      if (libraryMismatch && versionMismatch) {
        warning.push("and");
      }
      if (versionMismatch) {
        warning.push(`version name "${version4}" contains illegal characters (whitespace or "/")`);
      }
      logger.warn(warning.join(" "));
      return;
    }
    _registerComponent(new Component(
      `${library}-version`,
      () => ({ library, version: version4 }),
      "VERSION"
      /* ComponentType.VERSION */
    ));
  }
  var DB_NAME = "firebase-heartbeat-database";
  var DB_VERSION = 1;
  var STORE_NAME = "firebase-heartbeat-store";
  var dbPromise = null;
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              try {
                db.createObjectStore(STORE_NAME);
              } catch (e) {
                console.warn(e);
              }
          }
        }
      }).catch((e) => {
        throw ERROR_FACTORY.create("idb-open", {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise;
  }
  async function readHeartbeatsFromIndexedDB(app2) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(STORE_NAME);
      const result = await tx.objectStore(STORE_NAME).get(computeKey(app2));
      await tx.done;
      return result;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-get", {
          originalErrorMessage: e?.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  async function writeHeartbeatsToIndexedDB(app2, heartbeatObject) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(STORE_NAME);
      await objectStore.put(heartbeatObject, computeKey(app2));
      await tx.done;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-set", {
          originalErrorMessage: e?.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  function computeKey(app2) {
    return `${app2.name}!${app2.options.appId}`;
  }
  var MAX_HEADER_BYTES = 1024;
  var MAX_NUM_STORED_HEARTBEATS = 30;
  var HeartbeatServiceImpl = class {
    constructor(container) {
      this.container = container;
      this._heartbeatsCache = null;
      const app2 = this.container.getProvider("app").getImmediate();
      this._storage = new HeartbeatStorageImpl(app2);
      this._heartbeatsCachePromise = this._storage.read().then((result) => {
        this._heartbeatsCache = result;
        return result;
      });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    async triggerHeartbeat() {
      try {
        const platformLogger = this.container.getProvider("platform-logger").getImmediate();
        const agent = platformLogger.getPlatformInfoString();
        const date = getUTCDateString();
        if (this._heartbeatsCache?.heartbeats == null) {
          this._heartbeatsCache = await this._heartbeatsCachePromise;
          if (this._heartbeatsCache?.heartbeats == null) {
            return;
          }
        }
        if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
          return;
        } else {
          this._heartbeatsCache.heartbeats.push({ date, agent });
          if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
            const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
            this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
          }
        }
        return this._storage.overwrite(this._heartbeatsCache);
      } catch (e) {
        logger.warn(e);
      }
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    async getHeartbeatsHeader() {
      try {
        if (this._heartbeatsCache === null) {
          await this._heartbeatsCachePromise;
        }
        if (this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) {
          return "";
        }
        const date = getUTCDateString();
        const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
        const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
        this._heartbeatsCache.lastSentHeartbeatDate = date;
        if (unsentEntries.length > 0) {
          this._heartbeatsCache.heartbeats = unsentEntries;
          await this._storage.overwrite(this._heartbeatsCache);
        } else {
          this._heartbeatsCache.heartbeats = [];
          void this._storage.overwrite(this._heartbeatsCache);
        }
        return headerString;
      } catch (e) {
        logger.warn(e);
        return "";
      }
    }
  };
  function getUTCDateString() {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    const heartbeatsToSend = [];
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  var HeartbeatStorageImpl = class {
    constructor(app2) {
      this.app = app2;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    async runIndexedDBEnvironmentCheck() {
      if (!isIndexedDBAvailable()) {
        return false;
      } else {
        return validateIndexedDBOpenable().then(() => true).catch(() => false);
      }
    }
    /**
     * Read all heartbeats.
     */
    async read() {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return { heartbeats: [] };
      } else {
        const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
        if (idbHeartbeatObject?.heartbeats) {
          return idbHeartbeatObject;
        } else {
          return { heartbeats: [] };
        }
      }
    }
    // overwrite the storage with the provided heartbeats
    async overwrite(heartbeatsObject) {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: heartbeatsObject.heartbeats
        });
      }
    }
    // add heartbeats
    async add(heartbeatsObject) {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: [
            ...existingHeartbeatsObject.heartbeats,
            ...heartbeatsObject.heartbeats
          ]
        });
      }
    }
  };
  function countBytes(heartbeatsCache) {
    return base64urlEncodeWithoutPadding(
      // heartbeatsCache wrapper properties
      JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
    ).length;
  }
  function getEarliestHeartbeatIdx(heartbeats) {
    if (heartbeats.length === 0) {
      return -1;
    }
    let earliestHeartbeatIdx = 0;
    let earliestHeartbeatDate = heartbeats[0].date;
    for (let i = 1; i < heartbeats.length; i++) {
      if (heartbeats[i].date < earliestHeartbeatDate) {
        earliestHeartbeatDate = heartbeats[i].date;
        earliestHeartbeatIdx = i;
      }
    }
    return earliestHeartbeatIdx;
  }
  function registerCoreComponents(variant) {
    _registerComponent(new Component(
      "platform-logger",
      (container) => new PlatformLoggerServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    _registerComponent(new Component(
      "heartbeat",
      (container) => new HeartbeatServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name$q, version$1, variant);
    registerVersion(name$q, version$1, "esm2020");
    registerVersion("fire-js", "");
  }
  registerCoreComponents("");

  // node_modules/firebase/app/dist/esm/index.esm.js
  var name2 = "firebase";
  var version = "12.14.0";
  registerVersion(name2, version, "app");

  // node_modules/@firebase/installations/dist/esm/index.esm.js
  var name3 = "@firebase/installations";
  var version2 = "0.6.22";
  var PENDING_TIMEOUT_MS = 1e4;
  var PACKAGE_VERSION = `w:${version2}`;
  var INTERNAL_AUTH_VERSION = "FIS_v2";
  var INSTALLATIONS_API_URL = "https://firebaseinstallations.googleapis.com/v1";
  var TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1e3;
  var SERVICE = "installations";
  var SERVICE_NAME = "Installations";
  var ERROR_DESCRIPTION_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "not-registered"
      /* ErrorCode.NOT_REGISTERED */
    ]: "Firebase Installation is not registered.",
    [
      "installation-not-found"
      /* ErrorCode.INSTALLATION_NOT_FOUND */
    ]: "Firebase Installation not found.",
    [
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    ]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
    [
      "app-offline"
      /* ErrorCode.APP_OFFLINE */
    ]: "Could not process request. Application offline.",
    [
      "delete-pending-registration"
      /* ErrorCode.DELETE_PENDING_REGISTRATION */
    ]: "Can't delete installation while there is a pending registration request."
  };
  var ERROR_FACTORY2 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
  function isServerError(error) {
    return error instanceof FirebaseError && error.code.includes(
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    );
  }
  function getInstallationsEndpoint({ projectId }) {
    return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
  }
  function extractAuthTokenInfoFromResponse(response) {
    return {
      token: response.token,
      requestStatus: 2,
      expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
      creationTime: Date.now()
    };
  }
  async function getErrorFromResponse(requestName, response) {
    const responseJson = await response.json();
    const errorData = responseJson.error;
    return ERROR_FACTORY2.create("request-failed", {
      requestName,
      serverCode: errorData.code,
      serverMessage: errorData.message,
      serverStatus: errorData.status
    });
  }
  function getHeaders({ apiKey }) {
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": apiKey
    });
  }
  function getHeadersWithAuth(appConfig, { refreshToken }) {
    const headers = getHeaders(appConfig);
    headers.append("Authorization", getAuthorizationHeader(refreshToken));
    return headers;
  }
  async function retryIfServerError(fn) {
    const result = await fn();
    if (result.status >= 500 && result.status < 600) {
      return fn();
    }
    return result;
  }
  function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
    return Number(responseExpiresIn.replace("s", "000"));
  }
  function getAuthorizationHeader(refreshToken) {
    return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
  }
  async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
    const endpoint = getInstallationsEndpoint(appConfig);
    const headers = getHeaders(appConfig);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      fid,
      authVersion: INTERNAL_AUTH_VERSION,
      appId: appConfig.appId,
      sdkVersion: PACKAGE_VERSION
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const registeredInstallationEntry = {
        fid: responseValue.fid || fid,
        registrationStatus: 2,
        refreshToken: responseValue.refreshToken,
        authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
      };
      return registeredInstallationEntry;
    } else {
      throw await getErrorFromResponse("Create Installation", response);
    }
  }
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  function bufferToBase64UrlSafe(array) {
    const b64 = btoa(String.fromCharCode(...array));
    return b64.replace(/\+/g, "-").replace(/\//g, "_");
  }
  var VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
  var INVALID_FID = "";
  function generateFid() {
    try {
      const fidByteArray = new Uint8Array(17);
      const crypto2 = self.crypto || self.msCrypto;
      crypto2.getRandomValues(fidByteArray);
      fidByteArray[0] = 112 + fidByteArray[0] % 16;
      const fid = encode(fidByteArray);
      return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
    } catch {
      return INVALID_FID;
    }
  }
  function encode(fidByteArray) {
    const b64String = bufferToBase64UrlSafe(fidByteArray);
    return b64String.substr(0, 22);
  }
  function getKey(appConfig) {
    return `${appConfig.appName}!${appConfig.appId}`;
  }
  var fidChangeCallbacks = /* @__PURE__ */ new Map();
  function fidChanged(appConfig, fid) {
    const key = getKey(appConfig);
    callFidChangeCallbacks(key, fid);
    broadcastFidChange(key, fid);
  }
  function callFidChangeCallbacks(key, fid) {
    const callbacks = fidChangeCallbacks.get(key);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(fid);
    }
  }
  function broadcastFidChange(key, fid) {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ key, fid });
    }
    closeBroadcastChannel();
  }
  var broadcastChannel = null;
  function getBroadcastChannel() {
    if (!broadcastChannel && "BroadcastChannel" in self) {
      broadcastChannel = new BroadcastChannel("[Firebase] FID Change");
      broadcastChannel.onmessage = (e) => {
        callFidChangeCallbacks(e.data.key, e.data.fid);
      };
    }
    return broadcastChannel;
  }
  function closeBroadcastChannel() {
    if (fidChangeCallbacks.size === 0 && broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }
  var DATABASE_NAME = "firebase-installations-database";
  var DATABASE_VERSION = 1;
  var OBJECT_STORE_NAME = "firebase-installations-store";
  var dbPromise2 = null;
  function getDbPromise2() {
    if (!dbPromise2) {
      dbPromise2 = openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              db.createObjectStore(OBJECT_STORE_NAME);
          }
        }
      });
    }
    return dbPromise2;
  }
  async function set(appConfig, value) {
    const key = getKey(appConfig);
    const db = await getDbPromise2();
    const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
    const objectStore = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = await objectStore.get(key);
    await objectStore.put(value, key);
    await tx.done;
    if (!oldValue || oldValue.fid !== value.fid) {
      fidChanged(appConfig, value.fid);
    }
    return value;
  }
  async function remove(appConfig) {
    const key = getKey(appConfig);
    const db = await getDbPromise2();
    const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(OBJECT_STORE_NAME).delete(key);
    await tx.done;
  }
  async function update(appConfig, updateFn) {
    const key = getKey(appConfig);
    const db = await getDbPromise2();
    const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = await store.get(key);
    const newValue = updateFn(oldValue);
    if (newValue === void 0) {
      await store.delete(key);
    } else {
      await store.put(newValue, key);
    }
    await tx.done;
    if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
      fidChanged(appConfig, newValue.fid);
    }
    return newValue;
  }
  async function getInstallationEntry(installations) {
    let registrationPromise;
    const installationEntry = await update(installations.appConfig, (oldEntry) => {
      const installationEntry2 = updateOrCreateInstallationEntry(oldEntry);
      const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry2);
      registrationPromise = entryWithPromise.registrationPromise;
      return entryWithPromise.installationEntry;
    });
    if (installationEntry.fid === INVALID_FID) {
      return { installationEntry: await registrationPromise };
    }
    return {
      installationEntry,
      registrationPromise
    };
  }
  function updateOrCreateInstallationEntry(oldEntry) {
    const entry = oldEntry || {
      fid: generateFid(),
      registrationStatus: 0
      /* RequestStatus.NOT_STARTED */
    };
    return clearTimedOutRequest(entry);
  }
  function triggerRegistrationIfNecessary(installations, installationEntry) {
    if (installationEntry.registrationStatus === 0) {
      if (!navigator.onLine) {
        const registrationPromiseWithError = Promise.reject(ERROR_FACTORY2.create(
          "app-offline"
          /* ErrorCode.APP_OFFLINE */
        ));
        return {
          installationEntry,
          registrationPromise: registrationPromiseWithError
        };
      }
      const inProgressEntry = {
        fid: installationEntry.fid,
        registrationStatus: 1,
        registrationTime: Date.now()
      };
      const registrationPromise = registerInstallation(installations, inProgressEntry);
      return { installationEntry: inProgressEntry, registrationPromise };
    } else if (installationEntry.registrationStatus === 1) {
      return {
        installationEntry,
        registrationPromise: waitUntilFidRegistration(installations)
      };
    } else {
      return { installationEntry };
    }
  }
  async function registerInstallation(installations, installationEntry) {
    try {
      const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
      return set(installations.appConfig, registeredInstallationEntry);
    } catch (e) {
      if (isServerError(e) && e.customData.serverCode === 409) {
        await remove(installations.appConfig);
      } else {
        await set(installations.appConfig, {
          fid: installationEntry.fid,
          registrationStatus: 0
          /* RequestStatus.NOT_STARTED */
        });
      }
      throw e;
    }
  }
  async function waitUntilFidRegistration(installations) {
    let entry = await updateInstallationRequest(installations.appConfig);
    while (entry.registrationStatus === 1) {
      await sleep(100);
      entry = await updateInstallationRequest(installations.appConfig);
    }
    if (entry.registrationStatus === 0) {
      const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
      if (registrationPromise) {
        return registrationPromise;
      } else {
        return installationEntry;
      }
    }
    return entry;
  }
  function updateInstallationRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!oldEntry) {
        throw ERROR_FACTORY2.create(
          "installation-not-found"
          /* ErrorCode.INSTALLATION_NOT_FOUND */
        );
      }
      return clearTimedOutRequest(oldEntry);
    });
  }
  function clearTimedOutRequest(entry) {
    if (hasInstallationRequestTimedOut(entry)) {
      return {
        fid: entry.fid,
        registrationStatus: 0
        /* RequestStatus.NOT_STARTED */
      };
    }
    return entry;
  }
  function hasInstallationRequestTimedOut(installationEntry) {
    return installationEntry.registrationStatus === 1 && installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
    const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
    const headers = getHeadersWithAuth(appConfig, installationEntry);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      installation: {
        sdkVersion: PACKAGE_VERSION,
        appId: appConfig.appId
      }
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
      return completedAuthToken;
    } else {
      throw await getErrorFromResponse("Generate Auth Token", response);
    }
  }
  function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
  }
  async function refreshAuthToken(installations, forceRefresh = false) {
    let tokenPromise;
    const entry = await update(installations.appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY2.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
        return oldEntry;
      } else if (oldAuthToken.requestStatus === 1) {
        tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
        return oldEntry;
      } else {
        if (!navigator.onLine) {
          throw ERROR_FACTORY2.create(
            "app-offline"
            /* ErrorCode.APP_OFFLINE */
          );
        }
        const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
        tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
        return inProgressEntry;
      }
    });
    const authToken = tokenPromise ? await tokenPromise : entry.authToken;
    return authToken;
  }
  async function waitUntilAuthTokenRequest(installations, forceRefresh) {
    let entry = await updateAuthTokenRequest(installations.appConfig);
    while (entry.authToken.requestStatus === 1) {
      await sleep(100);
      entry = await updateAuthTokenRequest(installations.appConfig);
    }
    const authToken = entry.authToken;
    if (authToken.requestStatus === 0) {
      return refreshAuthToken(installations, forceRefresh);
    } else {
      return authToken;
    }
  }
  function updateAuthTokenRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY2.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
        return {
          ...oldEntry,
          authToken: {
            requestStatus: 0
            /* RequestStatus.NOT_STARTED */
          }
        };
      }
      return oldEntry;
    });
  }
  async function fetchAuthTokenFromServer(installations, installationEntry) {
    try {
      const authToken = await generateAuthTokenRequest(installations, installationEntry);
      const updatedInstallationEntry = {
        ...installationEntry,
        authToken
      };
      await set(installations.appConfig, updatedInstallationEntry);
      return authToken;
    } catch (e) {
      if (isServerError(e) && (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
        await remove(installations.appConfig);
      } else {
        const updatedInstallationEntry = {
          ...installationEntry,
          authToken: {
            requestStatus: 0
            /* RequestStatus.NOT_STARTED */
          }
        };
        await set(installations.appConfig, updatedInstallationEntry);
      }
      throw e;
    }
  }
  function isEntryRegistered(installationEntry) {
    return installationEntry !== void 0 && installationEntry.registrationStatus === 2;
  }
  function isAuthTokenValid(authToken) {
    return authToken.requestStatus === 2 && !isAuthTokenExpired(authToken);
  }
  function isAuthTokenExpired(authToken) {
    const now = Date.now();
    return now < authToken.creationTime || authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER;
  }
  function makeAuthTokenRequestInProgressEntry(oldEntry) {
    const inProgressAuthToken = {
      requestStatus: 1,
      requestTime: Date.now()
    };
    return {
      ...oldEntry,
      authToken: inProgressAuthToken
    };
  }
  function hasAuthTokenRequestTimedOut(authToken) {
    return authToken.requestStatus === 1 && authToken.requestTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function getId(installations) {
    const installationsImpl = installations;
    const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
    if (registrationPromise) {
      registrationPromise.catch(console.error);
    } else {
      refreshAuthToken(installationsImpl).catch(console.error);
    }
    return installationEntry.fid;
  }
  async function getToken(installations, forceRefresh = false) {
    const installationsImpl = installations;
    await completeInstallationRegistration(installationsImpl);
    const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
    return authToken.token;
  }
  async function completeInstallationRegistration(installations) {
    const { registrationPromise } = await getInstallationEntry(installations);
    if (registrationPromise) {
      await registrationPromise;
    }
  }
  function extractAppConfig(app2) {
    if (!app2 || !app2.options) {
      throw getMissingValueError("App Configuration");
    }
    if (!app2.name) {
      throw getMissingValueError("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId"
    ];
    for (const keyName of configKeys) {
      if (!app2.options[keyName]) {
        throw getMissingValueError(keyName);
      }
    }
    return {
      appName: app2.name,
      projectId: app2.options.projectId,
      apiKey: app2.options.apiKey,
      appId: app2.options.appId
    };
  }
  function getMissingValueError(valueName) {
    return ERROR_FACTORY2.create("missing-app-config-values", {
      valueName
    });
  }
  var INSTALLATIONS_NAME = "installations";
  var INSTALLATIONS_NAME_INTERNAL = "installations-internal";
  var publicFactory = (container) => {
    const app2 = container.getProvider("app").getImmediate();
    const appConfig = extractAppConfig(app2);
    const heartbeatServiceProvider = _getProvider(app2, "heartbeat");
    const installationsImpl = {
      app: app2,
      appConfig,
      heartbeatServiceProvider,
      _delete: () => Promise.resolve()
    };
    return installationsImpl;
  };
  var internalFactory = (container) => {
    const app2 = container.getProvider("app").getImmediate();
    const installations = _getProvider(app2, INSTALLATIONS_NAME).getImmediate();
    const installationsInternal = {
      getId: () => getId(installations),
      getToken: (forceRefresh) => getToken(installations, forceRefresh)
    };
    return installationsInternal;
  };
  function registerInstallations() {
    _registerComponent(new Component(
      INSTALLATIONS_NAME,
      publicFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
    _registerComponent(new Component(
      INSTALLATIONS_NAME_INTERNAL,
      internalFactory,
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
  }
  registerInstallations();
  registerVersion(name3, version2);
  registerVersion(name3, version2, "esm2020");

  // node_modules/@firebase/messaging/dist/esm/index.sw.esm.js
  var DEFAULT_VAPID_KEY = "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";
  var ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
  var FCM_MSG = "FCM_MSG";
  var CONSOLE_CAMPAIGN_ID = "google.c.a.c_id";
  var MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST = 1e3;
  var MAX_RETRIES = 3;
  var LOG_INTERVAL_IN_MS = 864e5;
  var DEFAULT_BACKOFF_TIME_MS = 5e3;
  var FCM_LOG_SOURCE = 1249;
  var SDK_PLATFORM_WEB = 3;
  var EVENT_MESSAGE_DELIVERED = 1;
  var MessageType$1;
  (function(MessageType2) {
    MessageType2[MessageType2["DATA_MESSAGE"] = 1] = "DATA_MESSAGE";
    MessageType2[MessageType2["DISPLAY_NOTIFICATION"] = 3] = "DISPLAY_NOTIFICATION";
  })(MessageType$1 || (MessageType$1 = {}));
  var MessageType;
  (function(MessageType2) {
    MessageType2["PUSH_RECEIVED"] = "push-received";
    MessageType2["NOTIFICATION_CLICKED"] = "notification-clicked";
    MessageType2["FID_REGISTERED"] = "fid-registered";
  })(MessageType || (MessageType = {}));
  function arrayToBase64(array) {
    const uint8Array = new Uint8Array(array);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function base64ToArray(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base642 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base642);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  var OLD_DB_NAME = "fcm_token_details_db";
  var OLD_DB_VERSION = 5;
  var OLD_OBJECT_STORE_NAME = "fcm_token_object_Store";
  async function migrateOldDatabase(senderId) {
    if ("databases" in indexedDB) {
      const databases = await indexedDB.databases();
      const dbNames = databases.map((db2) => db2.name);
      if (!dbNames.includes(OLD_DB_NAME)) {
        return null;
      }
    }
    let tokenDetails = null;
    const db = await openDB(OLD_DB_NAME, OLD_DB_VERSION, {
      upgrade: async (db2, oldVersion, newVersion, upgradeTransaction) => {
        if (oldVersion < 2) {
          return;
        }
        if (!db2.objectStoreNames.contains(OLD_OBJECT_STORE_NAME)) {
          return;
        }
        const objectStore = upgradeTransaction.objectStore(OLD_OBJECT_STORE_NAME);
        const value = await objectStore.index("fcmSenderId").get(senderId);
        await objectStore.clear();
        if (!value) {
          return;
        }
        if (oldVersion === 2) {
          const oldDetails = value;
          if (!oldDetails.auth || !oldDetails.p256dh || !oldDetails.endpoint) {
            return;
          }
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime ?? Date.now(),
            subscriptionOptions: {
              auth: oldDetails.auth,
              p256dh: oldDetails.p256dh,
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: typeof oldDetails.vapidKey === "string" ? oldDetails.vapidKey : arrayToBase64(oldDetails.vapidKey)
            }
          };
        } else if (oldVersion === 3) {
          const oldDetails = value;
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime,
            subscriptionOptions: {
              auth: arrayToBase64(oldDetails.auth),
              p256dh: arrayToBase64(oldDetails.p256dh),
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: arrayToBase64(oldDetails.vapidKey)
            }
          };
        } else if (oldVersion === 4) {
          const oldDetails = value;
          tokenDetails = {
            token: oldDetails.fcmToken,
            createTime: oldDetails.createTime,
            subscriptionOptions: {
              auth: arrayToBase64(oldDetails.auth),
              p256dh: arrayToBase64(oldDetails.p256dh),
              endpoint: oldDetails.endpoint,
              swScope: oldDetails.swScope,
              vapidKey: arrayToBase64(oldDetails.vapidKey)
            }
          };
        }
      }
    });
    db.close();
    await deleteDB(OLD_DB_NAME);
    await deleteDB("fcm_vapid_details_db");
    await deleteDB("undefined");
    return checkTokenDetails(tokenDetails) ? tokenDetails : null;
  }
  function checkTokenDetails(tokenDetails) {
    if (!tokenDetails || !tokenDetails.subscriptionOptions) {
      return false;
    }
    const { subscriptionOptions } = tokenDetails;
    return typeof tokenDetails.createTime === "number" && tokenDetails.createTime > 0 && typeof tokenDetails.token === "string" && tokenDetails.token.length > 0 && typeof subscriptionOptions.auth === "string" && subscriptionOptions.auth.length > 0 && typeof subscriptionOptions.p256dh === "string" && subscriptionOptions.p256dh.length > 0 && typeof subscriptionOptions.endpoint === "string" && subscriptionOptions.endpoint.length > 0 && typeof subscriptionOptions.swScope === "string" && subscriptionOptions.swScope.length > 0 && typeof subscriptionOptions.vapidKey === "string" && subscriptionOptions.vapidKey.length > 0;
  }
  var ERROR_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "only-available-in-window"
      /* ErrorCode.AVAILABLE_IN_WINDOW */
    ]: "This method is available in a Window context.",
    [
      "only-available-in-sw"
      /* ErrorCode.AVAILABLE_IN_SW */
    ]: "This method is available in a service worker context.",
    [
      "permission-default"
      /* ErrorCode.PERMISSION_DEFAULT */
    ]: "The notification permission was not granted and dismissed instead.",
    [
      "permission-blocked"
      /* ErrorCode.PERMISSION_BLOCKED */
    ]: "The notification permission was not granted and blocked instead.",
    [
      "unsupported-browser"
      /* ErrorCode.UNSUPPORTED_BROWSER */
    ]: "This browser doesn't support the API's required to use the Firebase SDK.",
    [
      "indexed-db-unsupported"
      /* ErrorCode.INDEXED_DB_UNSUPPORTED */
    ]: "This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)",
    [
      "failed-service-worker-registration"
      /* ErrorCode.FAILED_DEFAULT_REGISTRATION */
    ]: "We are unable to register the default service worker. {$browserErrorMessage}",
    [
      "token-subscribe-failed"
      /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */
    ]: "A problem occurred while subscribing the user to FCM: {$errorInfo}",
    [
      "token-subscribe-no-token"
      /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
    ]: "FCM returned no token when subscribing the user to push.",
    [
      "fid-registration-failed"
      /* ErrorCode.FID_REGISTRATION_FAILED */
    ]: "A problem occurred while creating an FCM registration via FID: {$errorInfo}",
    [
      "fid-unregister-failed"
      /* ErrorCode.FID_UNREGISTER_FAILED */
    ]: "A problem occurred while unregistering the FCM registration via FID: {$errorInfo}",
    [
      "fid-registration-idb-schema-unavailable"
      /* ErrorCode.FID_REGISTRATION_IDB_SCHEMA_UNAVAILABLE */
    ]: "Unable to read or persist FID registration metadata because the messaging IndexedDB schema is unavailable (for example, the database could not be upgraded to the latest version).",
    [
      "token-unsubscribe-failed"
      /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */
    ]: "A problem occurred while unsubscribing the user from FCM: {$errorInfo}",
    [
      "token-update-failed"
      /* ErrorCode.TOKEN_UPDATE_FAILED */
    ]: "A problem occurred while updating the user from FCM: {$errorInfo}",
    [
      "token-update-no-token"
      /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
    ]: "FCM returned no token when updating the user to push.",
    [
      "use-sw-after-get-token"
      /* ErrorCode.USE_SW_AFTER_GET_TOKEN */
    ]: "The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.",
    [
      "invalid-sw-registration"
      /* ErrorCode.INVALID_SW_REGISTRATION */
    ]: "The input to useServiceWorker() must be a ServiceWorkerRegistration.",
    [
      "invalid-bg-handler"
      /* ErrorCode.INVALID_BG_HANDLER */
    ]: "The input to setBackgroundMessageHandler() must be a function.",
    [
      "invalid-vapid-key"
      /* ErrorCode.INVALID_VAPID_KEY */
    ]: "The public VAPID key must be a string.",
    [
      "use-vapid-key-after-get-token"
      /* ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN */
    ]: "The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used.",
    [
      "invalid-on-registered-handler"
      /* ErrorCode.INVALID_ON_REGISTERED_HANDLER */
    ]: "No onRegistered callback handler was provided or registered. Implement onRegistered() before register()."
  };
  var ERROR_FACTORY3 = new ErrorFactory("messaging", "Messaging", ERROR_MAP);
  var DATABASE_NAME2 = "firebase-messaging-database";
  var DATABASE_VERSION2 = 2;
  var TOKEN_OBJECT_STORE_NAME = "firebase-messaging-store";
  var FID_REGISTRATION_OBJECT_STORE_NAME = "firebase-messaging-fid-registration-store";
  var defaultIdb = { openDB, deleteDB };
  var idbImpl = defaultIdb;
  var dbPromise3 = null;
  function migrateMessagingDb(upgradeDb, oldVersion, targetSchemaVersion) {
    switch (oldVersion) {
      case 0:
        upgradeDb.createObjectStore(TOKEN_OBJECT_STORE_NAME);
        if (targetSchemaVersion === 1) {
          break;
        }
      case 1:
        if (targetSchemaVersion === 2) {
          upgradeDb.createObjectStore(FID_REGISTRATION_OBJECT_STORE_NAME);
        }
    }
  }
  function createOpenDbOptions(targetSchemaVersion) {
    return {
      upgrade: (upgradeDb, oldVersion) => {
        migrateMessagingDb(upgradeDb, oldVersion, targetSchemaVersion);
      },
      blocked: () => {
      },
      blocking: (_currentVersion, _blockedVersion, event) => {
        dbPromise3 = null;
        event.target?.close();
      },
      terminated: () => {
        dbPromise3 = null;
      }
    };
  }
  function getDbPromise3() {
    if (!dbPromise3) {
      const openLatest = idbImpl.openDB(DATABASE_NAME2, DATABASE_VERSION2, createOpenDbOptions(2));
      dbPromise3 = openLatest.catch(() => idbImpl.openDB(DATABASE_NAME2, DATABASE_VERSION2 - 1, createOpenDbOptions(1)));
    }
    return dbPromise3;
  }
  function hasObjectStore(db, storeName) {
    return db.objectStoreNames.contains(storeName);
  }
  function assertFidRegistrationObjectStore(db) {
    if (!hasObjectStore(db, FID_REGISTRATION_OBJECT_STORE_NAME)) {
      throw ERROR_FACTORY3.create(
        "fid-registration-idb-schema-unavailable"
        /* ErrorCode.FID_REGISTRATION_IDB_SCHEMA_UNAVAILABLE */
      );
    }
  }
  async function dbGet(firebaseDependencies) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    const tokenDetails = await db.transaction(TOKEN_OBJECT_STORE_NAME).objectStore(TOKEN_OBJECT_STORE_NAME).get(key);
    if (tokenDetails) {
      return tokenDetails;
    } else {
      const oldTokenDetails = await migrateOldDatabase(firebaseDependencies.appConfig.senderId);
      if (oldTokenDetails) {
        await dbSet(firebaseDependencies, oldTokenDetails);
        return oldTokenDetails;
      }
    }
  }
  async function dbSet(firebaseDependencies, tokenDetails) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    const stores = [TOKEN_OBJECT_STORE_NAME];
    const hasFidStore = hasObjectStore(db, FID_REGISTRATION_OBJECT_STORE_NAME);
    if (hasFidStore) {
      stores.push(FID_REGISTRATION_OBJECT_STORE_NAME);
    }
    const tx = db.transaction(stores, "readwrite");
    await tx.objectStore(TOKEN_OBJECT_STORE_NAME).put(tokenDetails, key);
    if (hasFidStore) {
      await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).delete(key);
    }
    await tx.done;
    return tokenDetails;
  }
  async function dbRemove(firebaseDependencies) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    const tx = db.transaction(TOKEN_OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(TOKEN_OBJECT_STORE_NAME).delete(key);
    await tx.done;
  }
  async function dbGetFidRegistration(firebaseDependencies) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    assertFidRegistrationObjectStore(db);
    return await db.transaction(FID_REGISTRATION_OBJECT_STORE_NAME).objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).get(key);
  }
  async function dbSetFidRegistration(firebaseDependencies, details) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    assertFidRegistrationObjectStore(db);
    const tx = db.transaction([TOKEN_OBJECT_STORE_NAME, FID_REGISTRATION_OBJECT_STORE_NAME], "readwrite");
    await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).put(details, key);
    await tx.objectStore(TOKEN_OBJECT_STORE_NAME).delete(key);
    await tx.done;
    return details;
  }
  async function dbRemoveFidRegistration(firebaseDependencies) {
    const key = getKey2(firebaseDependencies);
    const db = await getDbPromise3();
    assertFidRegistrationObjectStore(db);
    const tx = db.transaction(FID_REGISTRATION_OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).delete(key);
    await tx.done;
  }
  function getKey2({ appConfig }) {
    return appConfig.appId;
  }
  var version3 = "0.13.0";
  var FID_REGISTRATION_FETCH_MAX_ATTEMPTS = 3;
  var FID_REGISTRATION_FETCH_BASE_BACKOFF_MS = 1e3;
  async function requestGetToken(firebaseDependencies, subscriptionOptions) {
    const headers = await getHeaders2(firebaseDependencies);
    const body = getBody(
      subscriptionOptions,
      firebaseDependencies.appConfig.appName,
      /* includeSdkVersion= */
      false
    );
    const subscribeOptions = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    let responseData;
    try {
      const response = await fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions);
      responseData = await response.json();
    } catch (err) {
      throw ERROR_FACTORY3.create("token-subscribe-failed", {
        errorInfo: err?.toString()
      });
    }
    if (responseData.error) {
      const message = responseData.error.message;
      throw ERROR_FACTORY3.create("token-subscribe-failed", {
        errorInfo: message
      });
    }
    if (!responseData.token) {
      throw ERROR_FACTORY3.create(
        "token-subscribe-no-token"
        /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
      );
    }
    return responseData.token;
  }
  async function requestCreateRegistration(firebaseDependencies, subscriptionOptions) {
    const headers = await getHeaders2(firebaseDependencies);
    const body = getBody(
      subscriptionOptions,
      firebaseDependencies.appConfig.appName,
      /* includeSdkVersion= */
      true
    );
    const subscribeOptions = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    let response;
    try {
      response = await fetchWithExponentialRetry(() => fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions), FID_REGISTRATION_FETCH_MAX_ATTEMPTS, FID_REGISTRATION_FETCH_BASE_BACKOFF_MS);
    } catch (err) {
      throw ERROR_FACTORY3.create("fid-registration-failed", {
        errorInfo: err?.toString()
      });
    }
    if (response.ok) {
      const responseFid = await parseCreateRegistrationSuccessFid(response);
      return { responseFid };
    }
    let responseData;
    try {
      responseData = await response.json();
    } catch (err) {
      throw ERROR_FACTORY3.create("fid-registration-failed", {
        errorInfo: response.statusText
      });
    }
    const message = responseData.error?.message ?? response.statusText;
    throw ERROR_FACTORY3.create("fid-registration-failed", {
      errorInfo: message
    });
  }
  async function requestDeleteRegistration(firebaseDependencies, fid) {
    const headers = await getHeaders2(firebaseDependencies);
    const options = {
      method: "DELETE",
      headers
    };
    let response;
    try {
      response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${fid}`, options);
    } catch (err) {
      throw ERROR_FACTORY3.create("fid-unregister-failed", {
        errorInfo: err?.toString()
      });
    }
    if (response.ok) {
      return;
    }
    try {
      const responseData = await response.json();
      const message = responseData.error?.message ?? response.statusText;
      throw message;
    } catch (err) {
      throw ERROR_FACTORY3.create("fid-unregister-failed", {
        errorInfo: typeof err === "string" && err || response.statusText || err?.toString()
      });
    }
  }
  async function parseCreateRegistrationSuccessFid(response) {
    const text = await response.text();
    if (!text.trim()) {
      throw ERROR_FACTORY3.create("fid-registration-failed", {
        errorInfo: "CreateRegistration succeeded but response body is empty"
      });
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw ERROR_FACTORY3.create("fid-registration-failed", {
        errorInfo: "CreateRegistration succeeded but response body is not valid JSON"
      });
    }
    const name4 = data.name;
    if (typeof name4 !== "string" || name4.length === 0) {
      throw ERROR_FACTORY3.create("fid-registration-failed", {
        errorInfo: "CreateRegistration succeeded but response did not include a non-empty name"
      });
    }
    return parseFidFromRegistrationResourceName(name4);
  }
  var REGISTRATIONS_NAME_SEGMENT = "/registrations/";
  function parseFidFromRegistrationResourceName(name4) {
    const segmentIndex = name4.indexOf(REGISTRATIONS_NAME_SEGMENT);
    if (segmentIndex !== -1) {
      const fid = name4.slice(segmentIndex + REGISTRATIONS_NAME_SEGMENT.length);
      if (fid.length > 0) {
        return fid;
      }
    }
    throw ERROR_FACTORY3.create("fid-registration-failed", {
      errorInfo: "CreateRegistration succeeded but response name is not a valid registration resource name"
    });
  }
  async function requestUpdateToken(firebaseDependencies, tokenDetails) {
    const headers = await getHeaders2(firebaseDependencies);
    const body = getBody(
      tokenDetails.subscriptionOptions,
      firebaseDependencies.appConfig.appName,
      /* includeSdkVersion= */
      false
    );
    const updateOptions = {
      method: "PATCH",
      headers,
      body: JSON.stringify(body)
    };
    let responseData;
    try {
      const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${tokenDetails.token}`, updateOptions);
      responseData = await response.json();
    } catch (err) {
      throw ERROR_FACTORY3.create("token-update-failed", {
        errorInfo: err?.toString()
      });
    }
    if (responseData.error) {
      const message = responseData.error.message;
      throw ERROR_FACTORY3.create("token-update-failed", {
        errorInfo: message
      });
    }
    if (!responseData.token) {
      throw ERROR_FACTORY3.create(
        "token-update-no-token"
        /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
      );
    }
    return responseData.token;
  }
  async function requestDeleteToken(firebaseDependencies, token) {
    const headers = await getHeaders2(firebaseDependencies);
    const unsubscribeOptions = {
      method: "DELETE",
      headers
    };
    try {
      const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${token}`, unsubscribeOptions);
      const responseData = await response.json();
      if (responseData.error) {
        const message = responseData.error.message;
        throw ERROR_FACTORY3.create("token-unsubscribe-failed", {
          errorInfo: message
        });
      }
    } catch (err) {
      throw ERROR_FACTORY3.create("token-unsubscribe-failed", {
        errorInfo: err?.toString()
      });
    }
  }
  async function fetchWithExponentialRetry(operation, maxAttempts, baseBackoffMs) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts - 1) {
          const delayMs = baseBackoffMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }
  function getEndpoint({ projectId }) {
    return `${ENDPOINT}/projects/${projectId}/registrations`;
  }
  async function getHeaders2({ appConfig, installations }) {
    const authToken = await installations.getToken();
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": appConfig.apiKey,
      "x-goog-firebase-installations-auth": `FIS ${authToken}`
    });
  }
  function getRegistrationOrigin(swScope, appNameFallback) {
    try {
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(swScope)) {
        return new URL(swScope).host;
      }
    } catch {
    }
    try {
      if (typeof self !== "undefined" && self.location?.href) {
        return new URL(swScope, self.location.origin).host;
      }
    } catch {
    }
    if (typeof self !== "undefined" && self.location?.host) {
      return self.location.host;
    }
    return appNameFallback;
  }
  function getBody({ p256dh, auth, endpoint, vapidKey, swScope }, appNameFallback, includeSdkVersion) {
    const body = {
      web: {
        origin: getRegistrationOrigin(swScope, appNameFallback),
        endpoint,
        auth,
        p256dh
      }
    };
    if (includeSdkVersion) {
      body.fcm_sdk_version = version3;
    }
    if (vapidKey !== DEFAULT_VAPID_KEY) {
      body.web.applicationPubKey = vapidKey;
    }
    return body;
  }
  var TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1e3;
  async function getTokenInternal(messaging2) {
    const pushSubscription = await getPushSubscription$1(messaging2.swRegistration, messaging2.vapidKey);
    const subscriptionOptions = {
      vapidKey: messaging2.vapidKey,
      swScope: messaging2.swRegistration.scope,
      endpoint: pushSubscription.endpoint,
      auth: arrayToBase64(pushSubscription.getKey("auth")),
      p256dh: arrayToBase64(pushSubscription.getKey("p256dh"))
    };
    const tokenDetails = await dbGet(messaging2.firebaseDependencies);
    if (!tokenDetails) {
      return getNewToken(messaging2.firebaseDependencies, subscriptionOptions);
    } else if (!isTokenValid(tokenDetails.subscriptionOptions, subscriptionOptions)) {
      try {
        await requestDeleteToken(messaging2.firebaseDependencies, tokenDetails.token);
      } catch (e) {
        console.warn(e);
      }
      return getNewToken(messaging2.firebaseDependencies, subscriptionOptions);
    } else if (Date.now() >= tokenDetails.createTime + TOKEN_EXPIRATION_MS) {
      return updateToken(messaging2, {
        token: tokenDetails.token,
        createTime: Date.now(),
        subscriptionOptions
      });
    } else {
      return tokenDetails.token;
    }
  }
  async function revokeLegacyFcmTokenAndClearCaches(messaging2, tokenDetails) {
    await requestDeleteToken(messaging2.firebaseDependencies, tokenDetails.token);
    await dbRemove(messaging2.firebaseDependencies);
    await removeFidRegistrationBestEffort(messaging2.firebaseDependencies);
  }
  async function revokeFidRegistrationIfStored(messaging2) {
    const stored = await dbGetFidRegistration(messaging2.firebaseDependencies).catch(() => void 0);
    const fid = stored?.fid;
    if (fid) {
      await requestDeleteRegistration(messaging2.firebaseDependencies, fid);
    }
    await removeFidRegistrationBestEffort(messaging2.firebaseDependencies);
    if (fid) {
      notifyOnUnregistered(messaging2, fid);
    }
  }
  async function revokeRegistrationInternal(messaging2) {
    const tokenDetails = await dbGet(messaging2.firebaseDependencies);
    if (tokenDetails) {
      await revokeLegacyFcmTokenAndClearCaches(messaging2, tokenDetails);
    } else {
      await revokeFidRegistrationIfStored(messaging2);
    }
    const pushSubscription = await messaging2.swRegistration.pushManager.getSubscription();
    if (pushSubscription) {
      return pushSubscription.unsubscribe();
    }
    return true;
  }
  async function updateToken(messaging2, tokenDetails) {
    try {
      const updatedToken = await requestUpdateToken(messaging2.firebaseDependencies, tokenDetails);
      const updatedTokenDetails = {
        ...tokenDetails,
        token: updatedToken,
        createTime: Date.now()
      };
      await dbSet(messaging2.firebaseDependencies, updatedTokenDetails);
      return updatedToken;
    } catch (e) {
      throw e;
    }
  }
  async function getNewToken(firebaseDependencies, subscriptionOptions) {
    const token = await requestGetToken(firebaseDependencies, subscriptionOptions);
    const tokenDetails = {
      token,
      createTime: Date.now(),
      subscriptionOptions
    };
    await dbSet(firebaseDependencies, tokenDetails);
    return tokenDetails.token;
  }
  async function getPushSubscription$1(swRegistration, vapidKey) {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }
    return swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      // Chrome <= 75 doesn't support base64-encoded VAPID key. For backward compatibility, VAPID key
      // submitted to pushManager#subscribe must be of type Uint8Array.
      applicationServerKey: base64ToArray(vapidKey)
    });
  }
  function isTokenValid(dbOptions, currentOptions) {
    const isVapidKeyEqual = currentOptions.vapidKey === dbOptions.vapidKey;
    const isEndpointEqual = currentOptions.endpoint === dbOptions.endpoint;
    const isAuthEqual = currentOptions.auth === dbOptions.auth;
    const isP256dhEqual = currentOptions.p256dh === dbOptions.p256dh;
    return isVapidKeyEqual && isEndpointEqual && isAuthEqual && isP256dhEqual;
  }
  async function removeFidRegistrationBestEffort(firebaseDependencies) {
    try {
      await dbRemoveFidRegistration(firebaseDependencies);
    } catch {
    }
  }
  function notifyOnRegistered(messaging2, fid) {
    const handler = messaging2.onRegisteredHandler;
    if (!handler) {
      return;
    }
    if (typeof handler === "function") {
      handler(fid);
    } else {
      handler.next(fid);
    }
  }
  function notifyOnUnregistered(messaging2, fid) {
    const handler = messaging2.onUnregisteredHandler;
    if (!handler) {
      return;
    }
    if (typeof handler === "function") {
      handler(fid);
    } else {
      handler.next(fid);
    }
  }
  async function updateVapidKey(messaging2, vapidKey) {
    if (!!vapidKey) {
      messaging2.vapidKey = vapidKey;
    } else if (!messaging2.vapidKey) {
      messaging2.vapidKey = DEFAULT_VAPID_KEY;
    }
  }
  var FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS = 3;
  async function registerFcmRegistrationWithFid(messaging2, expectedFid) {
    const pushSubscription = await getPushSubscription(messaging2.swRegistration, messaging2.vapidKey);
    const subscriptionOptions = {
      vapidKey: messaging2.vapidKey,
      swScope: messaging2.swRegistration.scope,
      endpoint: pushSubscription.endpoint,
      auth: arrayToBase64(pushSubscription.getKey("auth")),
      p256dh: arrayToBase64(pushSubscription.getKey("p256dh"))
    };
    const installations = messaging2.firebaseDependencies.installations;
    for (let attempt = 0; attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS; attempt++) {
      const { responseFid } = await requestCreateRegistration(messaging2.firebaseDependencies, subscriptionOptions);
      if (responseFid === expectedFid) {
        return;
      }
      if (attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS - 1) {
        await installations.getToken(true);
      }
    }
    throw ERROR_FACTORY3.create("fid-registration-failed", {
      errorInfo: "CreateRegistration response FID does not match Firebase Installation ID"
    });
  }
  async function getPushSubscription(swRegistration, vapidKey) {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }
    return swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      // `PushManager.subscribe` expects a `BufferSource`; `base64ToArray` produces a typed array.
      // Cast to satisfy the lib typing differences across TS DOM versions.
      applicationServerKey: base64ToArray(vapidKey)
    });
  }
  async function refreshFidRegistrationIfStored(messaging2) {
    const stored = await dbGetFidRegistration(messaging2.firebaseDependencies).catch(() => void 0);
    if (!stored) {
      return void 0;
    }
    await updateVapidKey(messaging2, stored.vapidKey);
    const fid = await messaging2.firebaseDependencies.installations.getId();
    await registerFcmRegistrationWithFid(messaging2, fid);
    await dbSetFidRegistration(messaging2.firebaseDependencies, {
      fid,
      lastRegisterTime: Date.now(),
      vapidKey: messaging2.vapidKey
    });
    notifyOnRegistered(messaging2, fid);
    return fid;
  }
  function externalizePayload(internalPayload) {
    const payload = {
      from: internalPayload.from,
      // eslint-disable-next-line camelcase
      collapseKey: internalPayload.collapse_key,
      // eslint-disable-next-line camelcase
      messageId: internalPayload.fcmMessageId
    };
    propagateNotificationPayload(payload, internalPayload);
    propagateDataPayload(payload, internalPayload);
    propagateFcmOptions(payload, internalPayload);
    return payload;
  }
  function propagateNotificationPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.notification) {
      return;
    }
    payload.notification = {};
    const title = messagePayloadInternal.notification.title;
    if (!!title) {
      payload.notification.title = title;
    }
    const body = messagePayloadInternal.notification.body;
    if (!!body) {
      payload.notification.body = body;
    }
    const image = messagePayloadInternal.notification.image;
    if (!!image) {
      payload.notification.image = image;
    }
    const icon = messagePayloadInternal.notification.icon;
    if (!!icon) {
      payload.notification.icon = icon;
    }
  }
  function propagateDataPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.data) {
      return;
    }
    payload.data = messagePayloadInternal.data;
  }
  function propagateFcmOptions(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.fcmOptions && !messagePayloadInternal.notification?.click_action) {
      return;
    }
    payload.fcmOptions = {};
    const link = messagePayloadInternal.fcmOptions?.link ?? messagePayloadInternal.notification?.click_action;
    if (!!link) {
      payload.fcmOptions.link = link;
    }
    const analyticsLabel = messagePayloadInternal.fcmOptions?.analytics_label;
    if (!!analyticsLabel) {
      payload.fcmOptions.analyticsLabel = analyticsLabel;
    }
  }
  function isConsoleMessage(data) {
    return typeof data === "object" && !!data && CONSOLE_CAMPAIGN_ID in data;
  }
  function sleep2(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  var LOG_ENDPOINT = "https://play.google.com/log?format=json_proto3";
  var INITIAL_LOG_FLUSH_DELAY_MS = 0;
  var FCM_TRANSPORT_KEY = _mergeStrings("AzSCbw63g1R0nCw85jG8", "Iaya3yLKwmgvh7cF0q4");
  function startLoggingService(messaging2) {
    if (messaging2.logQueue.state === "stopped" && messaging2.logEvents.length > 0) {
      _processQueue(messaging2, INITIAL_LOG_FLUSH_DELAY_MS);
    }
  }
  function _processQueue(messaging2, offsetInMs) {
    if (messaging2.logQueue.state === "scheduled") {
      clearTimeout(messaging2.logQueue.timerId);
    }
    messaging2.logQueue = { state: "stopped" };
    if (!messaging2.deliveryMetricsExportedToBigQueryEnabled) {
      messaging2.logEvents = [];
      return;
    }
    messaging2.logQueue = {
      state: "scheduled",
      timerId: setTimeout(async () => {
        messaging2.logQueue = { state: "flushing" };
        if (!messaging2.logEvents.length) {
          return _processQueue(messaging2, LOG_INTERVAL_IN_MS);
        }
        await _dispatchLogEvents(messaging2);
      }, offsetInMs)
    };
  }
  async function _dispatchLogEvents(messaging2) {
    const eventsToSend = messaging2.logEvents;
    messaging2.logEvents = [];
    for (let i = 0, n = eventsToSend.length; i < n; i += MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST) {
      const batch = eventsToSend.slice(i, i + MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST);
      if (!batch.length) {
        break;
      }
      const logRequest = _createLogRequest(batch);
      let retryCount = 0, response = {};
      do {
        try {
          response = await fetch(LOG_ENDPOINT.concat("&key=", FCM_TRANSPORT_KEY), {
            method: "POST",
            body: JSON.stringify(logRequest)
          });
          if (response.ok || !response.ok && !isRetriableError(response)) {
            break;
          }
          if (!response.ok && isRetriableError(response)) {
            throw new Error("a retriable Non-200 code is returned in fetch to Firelog endpoint. Retry");
          }
        } catch (error) {
          const isLastAttempt = retryCount === MAX_RETRIES;
          if (isLastAttempt) {
            break;
          }
        }
        let delayInMs;
        try {
          delayInMs = Number((await response.json()).nextRequestWaitMillis);
        } catch (e) {
          delayInMs = DEFAULT_BACKOFF_TIME_MS;
        }
        await new Promise((resolve) => setTimeout(resolve, delayInMs));
        retryCount++;
      } while (retryCount < MAX_RETRIES);
    }
    _processQueue(messaging2, messaging2.logEvents.length ? INITIAL_LOG_FLUSH_DELAY_MS : LOG_INTERVAL_IN_MS);
  }
  function isRetriableError(response) {
    const httpStatus = response.status;
    return httpStatus === 429 || httpStatus === 500 || httpStatus === 503 || httpStatus === 504;
  }
  async function stageLog(messaging2, internalPayload) {
    const fcmEvent = createFcmEvent(internalPayload, await messaging2.firebaseDependencies.installations.getId());
    createAndEnqueueLogEvent(messaging2, fcmEvent, internalPayload.productId);
    startLoggingService(messaging2);
  }
  function createFcmEvent(internalPayload, fid) {
    const fcmEvent = {};
    if (!!internalPayload.from) {
      fcmEvent.project_number = internalPayload.from;
    }
    if (!!internalPayload.fcmMessageId) {
      fcmEvent.message_id = internalPayload.fcmMessageId;
    }
    fcmEvent.instance_id = fid;
    if (!!internalPayload.notification) {
      fcmEvent.message_type = MessageType$1.DISPLAY_NOTIFICATION.toString();
    } else {
      fcmEvent.message_type = MessageType$1.DATA_MESSAGE.toString();
    }
    fcmEvent.sdk_platform = SDK_PLATFORM_WEB.toString();
    fcmEvent.package_name = self.origin.replace(/(^\w+:|^)\/\//, "");
    if (!!internalPayload.collapse_key) {
      fcmEvent.collapse_key = internalPayload.collapse_key;
    }
    fcmEvent.event = EVENT_MESSAGE_DELIVERED.toString();
    if (!!internalPayload.fcmOptions?.analytics_label) {
      fcmEvent.analytics_label = internalPayload.fcmOptions?.analytics_label;
    }
    return fcmEvent;
  }
  function createAndEnqueueLogEvent(messaging2, fcmEvent, productId) {
    const logEvent = {};
    logEvent.event_time_ms = Math.floor(Date.now()).toString();
    logEvent.source_extension_json_proto3 = JSON.stringify({
      messaging_client_event: fcmEvent
    });
    if (!!productId) {
      logEvent.compliance_data = buildComplianceData(productId);
    }
    messaging2.logEvents.push(logEvent);
  }
  function buildComplianceData(productId) {
    const complianceData = {
      privacy_context: {
        prequest: {
          origin_associated_product_id: productId
        }
      }
    };
    return complianceData;
  }
  function _createLogRequest(logEventQueue) {
    const logRequest = {};
    logRequest.log_source = FCM_LOG_SOURCE.toString();
    logRequest.log_event = logEventQueue;
    return logRequest;
  }
  function _mergeStrings(s1, s2) {
    const resultArray = [];
    for (let i = 0; i < s1.length; i++) {
      resultArray.push(s1.charAt(i));
      if (i < s2.length) {
        resultArray.push(s2.charAt(i));
      }
    }
    return resultArray.join("");
  }
  async function onSubChange(event, messaging2) {
    if (!messaging2.swRegistration) {
      messaging2.swRegistration = self.registration;
    }
    const { newSubscription } = event;
    if (!newSubscription) {
      await revokeRegistrationInternal(messaging2);
      return;
    }
    const storedFid = await dbGetFidRegistration(messaging2.firebaseDependencies).catch(() => void 0);
    if (storedFid) {
      const fid = await refreshFidRegistrationIfStored(messaging2).catch(() => {
        return void 0;
      });
      if (fid) {
        const clientList = await getClientList();
        if (hasVisibleClients(clientList)) {
          sendFidRegisteredToWindows(clientList, fid);
        }
      }
      return;
    }
    const tokenDetails = await dbGet(messaging2.firebaseDependencies);
    await revokeRegistrationInternal(messaging2);
    messaging2.vapidKey = tokenDetails?.subscriptionOptions?.vapidKey ?? DEFAULT_VAPID_KEY;
    await getTokenInternal(messaging2);
  }
  async function onPush(event, messaging2) {
    const internalPayload = getMessagePayloadInternal(event);
    if (!internalPayload) {
      return;
    }
    if (messaging2.deliveryMetricsExportedToBigQueryEnabled) {
      await stageLog(messaging2, internalPayload);
    }
    const clientList = await getClientList();
    if (hasVisibleClients(clientList)) {
      return sendMessagePayloadInternalToWindows(clientList, internalPayload);
    }
    if (!!internalPayload.notification) {
      await showNotification(wrapInternalPayload(internalPayload));
    }
    if (!messaging2) {
      return;
    }
    if (!!messaging2.onBackgroundMessageHandler) {
      const payload = externalizePayload(internalPayload);
      if (typeof messaging2.onBackgroundMessageHandler === "function") {
        await messaging2.onBackgroundMessageHandler(payload);
      } else {
        messaging2.onBackgroundMessageHandler.next(payload);
      }
    }
  }
  async function onNotificationClick(event) {
    const internalPayload = event.notification?.data?.[FCM_MSG];
    if (!internalPayload) {
      return;
    } else if (event.action) {
      return;
    }
    event.stopImmediatePropagation();
    event.notification.close();
    const link = getLink(internalPayload);
    if (!link) {
      return;
    }
    const url = new URL(link, self.location.href);
    const originUrl = new URL(self.location.origin);
    if (url.host !== originUrl.host) {
      return;
    }
    let client = await getWindowClient(url);
    if (!client) {
      client = await self.clients.openWindow(link);
      await sleep2(3e3);
    } else {
      client = await client.focus();
    }
    if (!client) {
      return;
    }
    internalPayload.messageType = MessageType.NOTIFICATION_CLICKED;
    internalPayload.isFirebaseMessaging = true;
    return client.postMessage(internalPayload);
  }
  function wrapInternalPayload(internalPayload) {
    const wrappedInternalPayload = {
      ...internalPayload.notification
    };
    wrappedInternalPayload.data = {
      [FCM_MSG]: internalPayload
    };
    return wrappedInternalPayload;
  }
  function getMessagePayloadInternal({ data }) {
    if (!data) {
      return null;
    }
    try {
      return data.json();
    } catch (err) {
      return null;
    }
  }
  async function getWindowClient(url) {
    const clientList = await getClientList();
    for (const client of clientList) {
      const clientUrl = new URL(client.url, self.location.href);
      if (url.host === clientUrl.host) {
        return client;
      }
    }
    return null;
  }
  function hasVisibleClients(clientList) {
    return clientList.some((client) => client.visibilityState === "visible" && // Ignore chrome-extension clients as that matches the background pages of extensions, which
    // are always considered visible for some reason.
    !client.url.startsWith("chrome-extension://"));
  }
  function sendMessagePayloadInternalToWindows(clientList, internalPayload) {
    internalPayload.isFirebaseMessaging = true;
    internalPayload.messageType = MessageType.PUSH_RECEIVED;
    for (const client of clientList) {
      client.postMessage(internalPayload);
    }
  }
  function sendFidRegisteredToWindows(clientList, fid) {
    const payload = {
      isFirebaseMessaging: true,
      messageType: MessageType.FID_REGISTERED,
      fid
    };
    for (const client of clientList) {
      client.postMessage(payload);
    }
  }
  function getClientList() {
    return self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
      // TS doesn't know that "type: 'window'" means it'll return WindowClient[]
    });
  }
  function showNotification(notificationPayloadInternal) {
    const { actions } = notificationPayloadInternal;
    const { maxActions } = Notification;
    if (actions && maxActions && actions.length > maxActions) {
      console.warn(`This browser only supports ${maxActions} actions. The remaining actions will not be displayed.`);
    }
    return self.registration.showNotification(
      /* title= */
      notificationPayloadInternal.title ?? "",
      notificationPayloadInternal
    );
  }
  function getLink(payload) {
    const link = payload.fcmOptions?.link ?? payload.notification?.click_action;
    if (link) {
      return link;
    }
    if (isConsoleMessage(payload.data)) {
      return self.location.origin;
    } else {
      return null;
    }
  }
  function extractAppConfig2(app2) {
    if (!app2 || !app2.options) {
      throw getMissingValueError2("App Configuration Object");
    }
    if (!app2.name) {
      throw getMissingValueError2("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId",
      "messagingSenderId"
    ];
    const { options } = app2;
    for (const keyName of configKeys) {
      if (!options[keyName]) {
        throw getMissingValueError2(keyName);
      }
    }
    return {
      appName: app2.name,
      projectId: options.projectId,
      apiKey: options.apiKey,
      appId: options.appId,
      senderId: options.messagingSenderId
    };
  }
  function getMissingValueError2(valueName) {
    return ERROR_FACTORY3.create("missing-app-config-values", {
      valueName
    });
  }
  var MessagingService = class {
    constructor(app2, installations, analyticsProvider) {
      this.deliveryMetricsExportedToBigQueryEnabled = false;
      this.onBackgroundMessageHandler = null;
      this.onMessageHandler = null;
      this.onRegisteredHandler = null;
      this.onUnregisteredHandler = null;
      this._registerNotifyChain = Promise.resolve();
      this._fidChangeUnsubscribe = null;
      this.logEvents = [];
      this.logQueue = { state: "stopped" };
      const appConfig = extractAppConfig2(app2);
      this.firebaseDependencies = {
        app: app2,
        appConfig,
        installations,
        analyticsProvider
      };
    }
    _delete() {
      if (this._fidChangeUnsubscribe) {
        this._fidChangeUnsubscribe();
        this._fidChangeUnsubscribe = null;
      }
      if (this.logQueue.state === "scheduled") {
        clearTimeout(this.logQueue.timerId);
      }
      this.logQueue = { state: "stopped" };
      return Promise.resolve();
    }
  };
  var SwMessagingFactory = (container) => {
    const messaging2 = new MessagingService(container.getProvider("app").getImmediate(), container.getProvider("installations-internal").getImmediate(), container.getProvider("analytics-internal"));
    self.addEventListener("push", (e) => {
      e.waitUntil(onPush(e, messaging2));
    });
    self.addEventListener("pushsubscriptionchange", (e) => {
      e.waitUntil(onSubChange(e, messaging2));
    });
    self.addEventListener("notificationclick", (e) => {
      e.waitUntil(onNotificationClick(e));
    });
    return messaging2;
  };
  function registerMessagingInSw() {
    _registerComponent(new Component(
      "messaging-sw",
      SwMessagingFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
  }
  async function isSwSupported() {
    return isIndexedDBAvailable() && await validateIndexedDBOpenable() && "PushManager" in self && "Notification" in self && ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification") && PushSubscription.prototype.hasOwnProperty("getKey");
  }
  function onBackgroundMessage$1(messaging2, nextOrObserver) {
    if (self.document !== void 0) {
      throw ERROR_FACTORY3.create(
        "only-available-in-sw"
        /* ErrorCode.AVAILABLE_IN_SW */
      );
    }
    messaging2.onBackgroundMessageHandler = nextOrObserver;
    return () => {
      messaging2.onBackgroundMessageHandler = null;
    };
  }
  function getMessagingInSw(app2 = getApp()) {
    isSwSupported().then((isSupported) => {
      if (!isSupported) {
        throw ERROR_FACTORY3.create(
          "unsupported-browser"
          /* ErrorCode.UNSUPPORTED_BROWSER */
        );
      }
    }, (_) => {
      throw ERROR_FACTORY3.create(
        "indexed-db-unsupported"
        /* ErrorCode.INDEXED_DB_UNSUPPORTED */
      );
    });
    return _getProvider(getModularInstance(app2), "messaging-sw").getImmediate();
  }
  function onBackgroundMessage(messaging2, nextOrObserver) {
    messaging2 = getModularInstance(messaging2);
    return onBackgroundMessage$1(messaging2, nextOrObserver);
  }
  registerMessagingInSw();

  // src/firebase-messaging-sw-src.js
  var app = initializeApp({
    apiKey: "AIzaSyD2apyCKbR8tczHA-62Cl3R_2THHut7Jo0",
    authDomain: "dork-app-c1011.firebaseapp.com",
    projectId: "dork-app-c1011",
    storageBucket: "dork-app-c1011.firebasestorage.app",
    messagingSenderId: "341759447687",
    appId: "1:341759447687:web:148ba8f895d6aa7f271e22",
    measurementId: "G-4BXDWKXYQ2"
  });
  var messaging = getMessagingInSw(app);
  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || "\u0625\u0634\u0639\u0627\u0631 \u062C\u062F\u064A\u062F";
    const body = payload.notification?.body || "";
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.data?.type || "notification-" + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: payload.data || {}
    });
  });
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow("/");
      })
    );
  });
})();
/*! Bundled license information:

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
   * in compliance with the License. You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under the License
   * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
   * or implied. See the License for the specific language governing permissions and limitations under
   * the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2026 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2026 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
