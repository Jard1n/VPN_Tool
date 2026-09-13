(function () {
    'use strict';

    class URLSearchParams {
        constructor(params, onUpdate) {
            switch (typeof params) {
                case "string": {
                    if (params.length === 0)
                        break;
                    if (params.startsWith("?"))
                        params = params.slice(1);
                    const pairs = params.split("&").map(pair => {
                        const separator = pair.indexOf("=");
                        return separator < 0 ? [pair, ""] : [pair.slice(0, separator), pair.slice(separator + 1)];
                    });
                    pairs.forEach(([key, value]) => {
                        this.#params.push(key ? this.#decodeQueryComponent(key) : key);
                        this.#values.push(this.#decodeQueryComponent(value));
                    });
                    break;
                }
                case "object":
                    if (Array.isArray(params)) {
                        Object.entries(params).forEach(([key, value]) => {
                            this.#params.push(key);
                            this.#values.push(value);
                        });
                    }
                    else if (Symbol.iterator in Object(params)) {
                        for (const [key, value] of params) {
                            this.#params.push(key);
                            this.#values.push(value);
                        }
                    }
                    break;
            }
            this.#updateSearchString(this.#params, this.#values);
            this.#onUpdate = onUpdate;
        }
        // Create 2 seperate arrays for the params and values to make management and lookup easier.
        #param = "";
        #params = [];
        #values = [];
        #onUpdate;
        #decodeQueryComponent(str) {
            return decodeURIComponent(str.replace(/\+/g, " "));
        }
        #encodeQueryComponent(str) {
            return encodeURIComponent(str)
                .replace(/%20/g, "+")
                .replace(/[!'()~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
        }
        // Update the search property of the URL instance with the new params and values.
        #updateSearchString(params, values) {
            if (params.length === 0)
                this.#param = "";
            else
                this.#param = params
                    .map((param, index) => {
                    switch (typeof values[index]) {
                        case "object":
                            return `${this.#encodeQueryComponent(param)}=${this.#encodeQueryComponent(JSON.stringify(values[index]))}`;
                        case "boolean":
                        case "number":
                        case "string":
                            return `${this.#encodeQueryComponent(param)}=${this.#encodeQueryComponent(values[index])}`;
                        case "undefined":
                        default:
                            return this.#encodeQueryComponent(param);
                    }
                })
                    .join("&");
            this.#onUpdate?.(this.#param);
        }
        // Add a given param with a given value to the end.
        append(name, value) {
            this.#params.push(name);
            this.#values.push(value);
            this.#updateSearchString(this.#params, this.#values);
        }
        // Remove all occurances of a given param
        delete(name, value) {
            while (this.#params.indexOf(name) > -1) {
                this.#values.splice(this.#params.indexOf(name), 1);
                this.#params.splice(this.#params.indexOf(name), 1);
            }
            this.#updateSearchString(this.#params, this.#values);
        }
        // Return an array to be structured in this way: [[param1, value1], [param2, value2]] to mimic the native method's ES6 iterator.
        entries() {
            return this.#params.map((param, index) => [param, this.#values[index]]);
        }
        // Return the value matched to the first occurance of a given param.
        get(name) {
            return this.#values[this.#params.indexOf(name)];
        }
        // Return all values matched to all occurances of a given param.
        getAll(name) {
            return this.#values.filter((value, index) => this.#params[index] === name);
        }
        // Return a boolean to indicate whether a given param exists.
        has(name, value) {
            return this.#params.indexOf(name) > -1;
        }
        // Return an array of the param names to mimic the native method's ES6 iterator.
        keys() {
            return this.#params;
        }
        // Set a given param to a given value.
        set(name, value) {
            if (this.#params.indexOf(name) === -1) {
                this.append(name, value); // If the given param doesn't already exist, append it.
            }
            else {
                let first = true;
                const newValues = [];
                // If the param already exists, change the value of the first occurance and remove any remaining occurances.
                this.#params = this.#params.filter((currentParam, index) => {
                    if (currentParam !== name) {
                        newValues.push(this.#values[index]);
                        return true;
                        // If the currentParam matches the one being changed and it's the first one, keep the param and change its value to the given one.
                    }
                    else if (first) {
                        first = false;
                        newValues.push(value);
                        return true;
                    }
                    // If the currentParam matches the one being changed, but it's not the first, remove it.
                    return false;
                });
                this.#values = newValues;
                this.#updateSearchString(this.#params, this.#values);
            }
        }
        // Sort all key/value pairs, if any, by their keys then by their values.
        sort() {
            // Call entries to make sorting easier, then rewrite the params and values in the new order.
            const sortedPairs = this.entries().sort();
            this.#params = [];
            this.#values = [];
            sortedPairs.forEach(pair => {
                this.#params.push(pair[0]);
                this.#values.push(pair[1]);
            });
            this.#updateSearchString(this.#params, this.#values);
        }
        // Return the search string without the '?'.
        toString = () => this.#param;
        // Return and array of the param values to mimic the native method's ES6 iterator..
        values = () => this.#values.values();
    }

    class URL {
        constructor(url, base) {
            switch (typeof url) {
                case "string": {
                    const urlIsValid = /^(blob:|file:)?[a-zA-z]+:\/\/.*/.test(url);
                    const baseIsValid = base ? /^(blob:|file:)?[a-zA-z]+:\/\/.*/.test(base) : false;
                    // If a string is passed for url instead of location or link, then set the properties of the URL instance.
                    if (urlIsValid)
                        this.href = url;
                    // If the url isn't valid, but the base is, then prepend the base to the url.
                    else if (baseIsValid)
                        this.href = base + url;
                    // If no valid url or base is given, then throw a type error.
                    else
                        throw new TypeError('URL string is not valid. If using a relative url, a second argument needs to be passed representing the base URL. Example: new URL("relative/path", "http://www.example.com");');
                    break;
                }
                case "object":
                    break;
                default:
                    throw new TypeError("Invalid argument type.");
            }
        }
        #url = {
            hash: "",
            host: "",
            hostname: "",
            href: "",
            password: "",
            pathname: "",
            port: Number.NaN,
            protocol: "",
            search: "",
            searchParams: new URLSearchParams(""),
            username: "",
        };
        // refer: http://www.ietf.org/rfc/rfc3986.txt
        static #URLRegExp = /^(?<scheme>([^:\/?#]+):)?(?:\/\/(?<authority>[^\/?#]*))?(?<path>[^?#]*)(?<query>\?([^#]*))?(?<hash>#(.*))?$/;
        static #AuthorityRegExp = /^(?<authentication>(?<username>[^:]*)(:(?<password>[^@]*))?@)?(?<hostname>[^:]+)(:(?<port>\d+))?$/;
        get hash() {
            return this.#url.hash;
        }
        set hash(value) {
            if (value.length !== 0) {
                if (value.startsWith("#"))
                    value = value.slice(1);
                this.#url.hash = `#${encodeURIComponent(value)}`;
            }
        }
        get host() {
            return this.port.length > 0 ? `${this.hostname}:${this.port}` : this.hostname;
        }
        set host(value) {
            [this.hostname, this.port] = value.split(":", 2);
        }
        get hostname() {
            return encodeURIComponent(this.#url.hostname);
        }
        set hostname(value) {
            this.#url.hostname = value ?? "";
        }
        get href() {
            let authority = "";
            if (this.username.length > 0) {
                authority += this.username;
                if (this.password.length > 0)
                    authority += `:${this.password}`;
                authority += "@";
            }
            return `${this.protocol}//${authority}${this.host}${this.pathname}${this.search}${this.hash}`;
        }
        set href(value) {
            if (value.startsWith("blob:") || value.startsWith("file:"))
                value = value.slice(5);
            const urlMatch = value.match(URL.#URLRegExp);
            if (!urlMatch)
                throw new TypeError("Invalid URL format.");
            this.protocol = urlMatch.groups.scheme ?? "";
            const authorityMatch = urlMatch.groups.authority.match(URL.#AuthorityRegExp);
            this.username = authorityMatch.groups.username ?? "";
            this.password = authorityMatch.groups.password ?? "";
            this.hostname = authorityMatch.groups.hostname ?? "";
            this.port = authorityMatch.groups.port ?? "";
            this.pathname = urlMatch.groups.path ?? "";
            this.search = urlMatch.groups.query ?? "";
            this.hash = urlMatch.groups.hash ?? "";
        }
        get origin() {
            return `${this.protocol}//${this.host}`;
        }
        get password() {
            return encodeURIComponent(this.#url.password);
        }
        set password(value) {
            if (this.username.length > 0)
                this.#url.password = value ?? "";
        }
        get pathname() {
            return `/${this.#url.pathname}`;
        }
        set pathname(value) {
            value = `${value}`;
            if (value.startsWith("/"))
                value = value.slice(1);
            this.#url.pathname = value;
        }
        get port() {
            if (Number.isNaN(this.#url.port))
                return "";
            const port = this.#url.port.toString();
            if (this.protocol === "ftp:" && port === "21")
                return "";
            if (this.protocol === "http:" && port === "80")
                return "";
            if (this.protocol === "https:" && port === "443")
                return "";
            return port;
        }
        set port(value) {
            switch (value) {
                case "":
                    this.#url.port = Number.NaN;
                    break;
                default: {
                    const port = Number.parseInt(value, 10);
                    if (port >= 0 && port < 65535)
                        this.#url.port = port;
                }
            }
        }
        get protocol() {
            return `${this.#url.protocol}:`;
        }
        set protocol(value) {
            if (value.endsWith(":"))
                value = value.slice(0, -1);
            this.#url.protocol = value;
        }
        get search() {
            if (this.#url.search.length > 0)
                return `?${this.#url.search}`;
            else
                return "";
        }
        set search(value) {
            value = `${value}`;
            if (value.startsWith("?"))
                value = value.slice(1);
            this.#url.search = value;
            this.#url.searchParams = new URLSearchParams(this.#url.search, search => {
                this.#url.search = search;
            });
        }
        get searchParams() {
            return this.#url.searchParams;
        }
        get username() {
            return encodeURIComponent(this.#url.username);
        }
        set username(value) {
            this.#url.username = value ?? "";
        }
        static parse = (url, base) => new URL(url, base);
        /**
         * Returns the string representation of the URL.
         *
         * @returns {string} The href of the URL.
         */
        toString = () => this.href;
        /**
         * Converts the URL object properties to a JSON string.
         *
         * @returns {string} A JSON string representation of the URL object.
         */
        toJSON = () => JSON.stringify({
            hash: this.hash,
            host: this.host,
            hostname: this.hostname,
            href: this.href,
            origin: this.origin,
            password: this.password,
            pathname: this.pathname,
            port: this.port,
            protocol: this.protocol,
            search: this.search,
            searchParams: this.searchParams,
            username: this.username,
        });
    }

    /**
     * 当前运行平台名称（脚本平台优先，模块系统次之）。
     * Current runtime platform name (script platform first, module system second).
     *
     * 识别顺序:
     * Detection order:
     * 1) `$task` -> Quantumult X
     * 2) `$loon` -> Loon
     * 3) `$rocket` -> Shadowrocket
     * 4) `Egern` -> Egern
     * 5) `$environment["surge-version"]` -> Surge
     * 6) `$environment["stash-version"]` -> Stash
     * 7) `Cloudflare` -> Worker
     * 8) `process.versions.node` -> Node.js
     * 9) 默认回落 -> undefined
     *    default fallback -> undefined
     *
     * 说明:
     * Notes:
     * - 使用 `'key' in globalThis`，避免 `Object.keys` 对不可枚举全局变量漏检。
     * - Use `'key' in globalThis` to avoid missing non-enumerable globals with `Object.keys`.
     *
     * @type {("Quantumult X" | "Loon" | "Shadowrocket" | "Egern" | "Surge" | "Stash" | "Worker" | "Node.js" | undefined)}
     */
    const $app = (() => {
    	const has = key => key in globalThis;
    	switch (true) {
    		case has("$task"):
    			return "Quantumult X";
    		case has("$loon"):
    			return "Loon";
    		case has("$rocket"):
    			return "Shadowrocket";
    		case has("Egern"):
    			return "Egern";
    		case Boolean(globalThis.$environment?.["surge-version"]):
    			return "Surge";
    		case Boolean(globalThis.$environment?.["stash-version"]):
    			return "Stash";
    		case has("Cloudflare"):
    			//case has("ServiceWorkerGlobalScope") && has("self") && has("caches") && has("scheduler"):
    			return "Worker";
    		case Boolean(globalThis.process?.versions?.node):
    			return "Node.js";
    		default:
    			return undefined;
    	}
    })();

    /**
     * 统一日志工具，兼容各脚本平台、Worker 与 Node.js。
     * Unified logger compatible with script platforms, Worker, and Node.js.
     *
     * logLevel 用法:
     * logLevel usage:
     * - 可读: `Console.logLevel` 返回 `OFF|ERROR|WARN|INFO|DEBUG|ALL`
     * - Read: `Console.logLevel` returns `OFF|ERROR|WARN|INFO|DEBUG|ALL`
     * - 可写: 数字 `0~5` 或字符串 `off/error/warn/info/debug/all`
     * - Write: number `0~5` or string `off/error/warn/info/debug/all`
     *
     * @example
     * Console.logLevel = "debug";
     * Console.debug("only shown when level >= DEBUG");
     * Console.logLevel = 2; // WARN
     */
    class Console {
    	static #counts = new Map([]);
    	static #groups = [];
    	static #times = new Map([]);

    	/**
    	 * 清空控制台（当前为空实现）。
    	 * Clear console (currently a no-op).
    	 *
    	 * @returns {void}
    	 */
    	static clear = () => {};

    	/**
    	 * 增加计数器并打印当前值。
    	 * Increment counter and print the current value.
    	 *
    	 * @param {string} [label="default"] 计数器名称 / Counter label.
    	 * @returns {void}
    	 */
    	static count = (label = "default") => {
    		switch (Console.#counts.has(label)) {
    			case true:
    				Console.#counts.set(label, Console.#counts.get(label) + 1);
    				break;
    			case false:
    				Console.#counts.set(label, 0);
    				break;
    		}
    		Console.log(`${label}: ${Console.#counts.get(label)}`);
    	};

    	/**
    	 * 重置计数器。
    	 * Reset a counter.
    	 *
    	 * @param {string} [label="default"] 计数器名称 / Counter label.
    	 * @returns {void}
    	 */
    	static countReset = (label = "default") => {
    		switch (Console.#counts.has(label)) {
    			case true:
    				Console.#counts.set(label, 0);
    				Console.log(`${label}: ${Console.#counts.get(label)}`);
    				break;
    			case false:
    				Console.warn(`Counter "${label}" doesn’t exist`);
    				break;
    		}
    	};

    	/**
    	 * 输出调试日志。
    	 * Print debug logs.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static debug = (...msg) => {
    		if (Console.#level < 4) return;
    		msg = msg.map(m => `🅱️ ${m}`);
    		Console.log(...msg);
    	};

    	/**
    	 * 输出错误日志。
    	 * Print error logs.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static error(...msg) {
    		if (Console.#level < 1) return;
    		switch ($app) {
    			case "Surge":
    			case "Loon":
    			case "Stash":
    			case "Egern":
    			case "Shadowrocket":
    			case "Quantumult X":
    			default:
    				msg = msg.map(m => `❌ ${m}`);
    				break;
    			case "Worker":
    			case "Node.js":
    				msg = msg.map(m => `❌ ${m?.stack ?? m}`);
    				break;
    		}
    		Console.log(...msg);
    	}

    	/**
    	 * `error` 的别名。
    	 * Alias of `error`.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static exception = (...msg) => Console.error(...msg);

    	/**
    	 * 进入日志分组。
    	 * Enter a log group.
    	 *
    	 * @param {string} label 分组名 / Group label.
    	 * @returns {number}
    	 */
    	static group = label => Console.#groups.unshift(label);

    	/**
    	 * 退出日志分组。
    	 * Exit the latest log group.
    	 *
    	 * @returns {*}
    	 */
    	static groupEnd = () => Console.#groups.shift();

    	/**
    	 * 输出信息日志。
    	 * Print info logs.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static info(...msg) {
    		if (Console.#level < 3) return;
    		msg = msg.map(m => `ℹ️ ${m}`);
    		Console.log(...msg);
    	}

    	static #level = 3;

    	/**
    	 * 获取日志级别文本。
    	 * Get current log level text.
    	 *
    	 * @returns {"OFF"|"ERROR"|"WARN"|"INFO"|"DEBUG"|"ALL"}
    	 */
    	static get logLevel() {
    		switch (Console.#level) {
    			case 0:
    				return "OFF";
    			case 1:
    				return "ERROR";
    			case 2:
    				return "WARN";
    			case 3:
    			default:
    				return "INFO";
    			case 4:
    				return "DEBUG";
    			case 5:
    				return "ALL";
    		}
    	}

    	/**
    	 * 设置日志级别。
    	 * Set current log level.
    	 *
    	 * @param {number|string} level 级别值 / Level value.
    	 */
    	static set logLevel(level) {
    		switch (typeof level) {
    			case "string":
    				level = level.toLowerCase();
    				break;
    			case "number":
    				break;
    			case "undefined":
    			default:
    				level = "warn";
    				break;
    		}
    		switch (level) {
    			case 0:
    			case "off":
    				Console.#level = 0;
    				break;
    			case 1:
    			case "error":
    				Console.#level = 1;
    				break;
    			case 2:
    			case "warn":
    			case "warning":
    			default:
    				Console.#level = 2;
    				break;
    			case 3:
    			case "info":
    				Console.#level = 3;
    				break;
    			case 4:
    			case "debug":
    				Console.#level = 4;
    				break;
    			case 5:
    			case "all":
    				Console.#level = 5;
    				break;
    		}
    	}

    	/**
    	 * 输出通用日志。
    	 * Print generic logs.
    	 *
    	 * 说明:
    	 * Notes:
    	 * - 多行字符串参数会按换行拆分为多个独立日志项。
    	 * - Multi-line string arguments are split into multiple log entries by line breaks.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static log = (...msg) => {
    		if (Console.#level === 0) return;
    		msg = msg.flatMap(log => {
    			switch (typeof log) {
    				case "object":
    					return [JSON.stringify(log)];
    				case "bigint":
    				case "number":
    				case "boolean":
    					return [log.toString()];
    				case "string":
    					return log.split(/\r?\n/u);
    				case "undefined":
    				default:
    					return [log];
    			}
    		});
    		Console.#groups.forEach(group => {
    			msg = msg.map(log => `  ${log}`);
    			msg.unshift(`▼ ${group}:`);
    		});
    		msg = ["", ...msg];
    		console.log(msg.join("\n"));
    	};

    	/**
    	 * 开始计时。
    	 * Start timer.
    	 *
    	 * @param {string} [label="default"] 计时器名称 / Timer label.
    	 * @returns {Map<string, number>}
    	 */
    	static time = (label = "default") => Console.#times.set(label, Date.now());

    	/**
    	 * 结束计时并移除计时器。
    	 * End timer and remove it.
    	 *
    	 * @param {string} [label="default"] 计时器名称 / Timer label.
    	 * @returns {boolean}
    	 */
    	static timeEnd = (label = "default") => Console.#times.delete(label);

    	/**
    	 * 输出当前计时器耗时。
    	 * Print elapsed time for a timer.
    	 *
    	 * @param {string} [label="default"] 计时器名称 / Timer label.
    	 * @returns {void}
    	 */
    	static timeLog = (label = "default") => {
    		const time = Console.#times.get(label);
    		if (time) Console.log(`${label}: ${Date.now() - time}ms`);
    		else Console.warn(`Timer "${label}" doesn’t exist`);
    	};

    	/**
    	 * 输出警告日志。
    	 * Print warning logs.
    	 *
    	 * @param {...any} msg 日志内容 / Log messages.
    	 * @returns {void}
    	 */
    	static warn(...msg) {
    		if (Console.#level < 2) return;
    		msg = msg.map(m => `⚠️ ${m}`);
    		Console.log(...msg);
    	}
    }

    /* https://www.lodashjs.com */
    /**
     * 轻量 Lodash 工具集。
     * Lightweight Lodash-like utilities.
     *
     * 说明:
     * Notes:
     * - 这是 Lodash 的“部分方法”简化实现，不等价于完整 Lodash
     * - This is a simplified subset, not a full Lodash implementation
     * - 各方法语义可参考 Lodash 官方文档
     * - Method semantics can be referenced from official Lodash docs
     * - 导入时建议使用 `Lodash as _`，遵循 lodash 官方示例惯例
     * - Use `Lodash as _` when importing, following official lodash example convention
     *
     * 参考:
     * Reference:
     * - https://www.lodashjs.com
     * - https://lodash.com
     */
    class Lodash {
    	/**
    	 * HTML 特殊字符转义。
    	 * Escape HTML special characters.
    	 *
    	 * @param {string} string 输入文本 / Input text.
    	 * @returns {string}
    	 * @see {@link https://lodash.com/docs/#escape lodash.escape}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.escape lodash.escape (中文)}
    	 */
    	static escape(string) {
    		const map = {
    			"&": "&amp;",
    			"<": "&lt;",
    			">": "&gt;",
    			'"': "&quot;",
    			"'": "&#39;",
    		};
    		return string.replace(/[&<>"']/g, m => map[m]);
    	}

    	/**
    	 * 按路径读取对象值。
    	 * Get object value by path.
    	 *
    	 * @param {object} [object={}] 目标对象 / Target object.
    	 * @param {string|string[]} [path=""] 路径 / Path.
    	 * @param {*} [defaultValue=undefined] 默认值 / Default value.
    	 * @returns {*}
    	 * @see {@link https://lodash.com/docs/#get lodash.get}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.get lodash.get (中文)}
    	 */
    	static get(object = {}, path = "", defaultValue = undefined) {
    		// translate array case to dot case, then split with .
    		// a[0].b -> a.0.b -> ['a', '0', 'b']
    		if (!Array.isArray(path)) path = Lodash.toPath(path);

    		const result = path.reduce((previousValue, currentValue) => {
    			return Object(previousValue)[currentValue]; // null undefined get attribute will throwError, Object() can return a object
    		}, object);
    		return result === undefined ? defaultValue : result;
    	}

    	/**
    	 * 递归合并源对象的自身可枚举属性到目标对象
    	 * Recursively merge source enumerable properties into target object.
    	 * @description 简化版 lodash.merge，用于合并配置对象
    	 * @description A simplified lodash.merge for config merging.
    	 *
    	 * 适用情况:
    	 * - 合并嵌套的配置/设置对象
    	 * - 需要深度合并而非浅层覆盖的场景
    	 * - 多个源对象依次合并到目标对象
    	 *
    	 * 限制:
    	 * - 仅处理普通对象 (Plain Object)，不处理 Date/RegExp 等特殊对象
    	 * - Map/Set 仅支持同类型合并，不递归内部值
    	 * - 数组会被直接覆盖，不会合并数组元素
    	 * - 不处理循环引用，可能导致栈溢出
    	 * - 不复制 Symbol 属性和不可枚举属性
    	 * - 不保留原型链，仅处理自身属性
    	 * - 会修改原始目标对象 (mutates target)
    	 *
    	 * @param {object} object - 目标对象
    	 * @param {object} object - Target object.
    	 * @param {...object} sources - 源对象(可多个)
    	 * @param {...object} sources - Source objects.
    	 * @returns {object} 返回合并后的目标对象
    	 * @returns {object} Merged target object.
    	 * @see {@link https://lodash.com/docs/#merge lodash.merge}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.merge lodash.merge (中文)}
    	 * @example
    	 * const target = { a: { b: 1 }, c: 2 };
    	 * const source = { a: { d: 3 }, e: 4 };
    	 * Lodash.merge(target, source);
    	 * // => { a: { b: 1, d: 3 }, c: 2, e: 4 }
    	 */
    	static merge(object, ...sources) {
    		if (object === null || object === undefined) return object;

    		for (const source of sources) {
    			if (source === null || source === undefined) continue;

    			for (const key of Object.keys(source)) {
    				const sourceValue = source[key];
    				const targetValue = object[key];

    				switch (true) {
    					case Lodash.#isPlainObject(sourceValue) && Lodash.#isPlainObject(targetValue):
    						// 递归合并对象
    						object[key] = Lodash.merge(targetValue, sourceValue);
    						break;
    					case sourceValue instanceof Map && targetValue instanceof Map:
    						// 合并 Map（空 Map 跳过）
    						if (sourceValue.size > 0) {
    							for (const [k, v] of sourceValue) {
    								targetValue.set(k, v);
    							}
    						}
    						break;
    					case sourceValue instanceof Set && targetValue instanceof Set:
    						// 合并 Set（空 Set 跳过）
    						if (sourceValue.size > 0) {
    							for (const v of sourceValue) {
    								targetValue.add(v);
    							}
    						}
    						break;
    					case Array.isArray(sourceValue) && sourceValue.length === 0 && targetValue !== undefined:
    						// 空数组不覆盖已有值
    						break;
    					case (sourceValue instanceof Map && sourceValue.size === 0 && targetValue !== undefined):
    					case (sourceValue instanceof Set && sourceValue.size === 0 && targetValue !== undefined):
    						// 空 Map/Set 不覆盖已有值
    						break;
    					case sourceValue !== undefined:
    						object[key] = sourceValue;
    						break;
    				}
    			}
    		}

    		return object;
    	}

    	/**
    	 * 判断值是否为普通对象 (Plain Object)
    	 * Check whether a value is a plain object.
    	 * @param {*} value - 要检查的值
    	 * @param {*} value - Value to check.
    	 * @returns {boolean} 如果是普通对象返回 true
    	 * @returns {boolean} Returns true when value is a plain object.
    	 * @see {@link https://lodash.com/docs/#isPlainObject lodash.isPlainObject}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.isPlainObject lodash.isPlainObject (中文)}
    	 */
    	static #isPlainObject(value) {
    		if (value === null || typeof value !== "object") return false;
    		const proto = Object.getPrototypeOf(value);
    		return proto === null || proto === Object.prototype;
    	}

    	/**
    	 * 删除对象指定路径并返回对象。
    	 * Omit paths from object and return the same object.
    	 *
    	 * @param {object} [object={}] 目标对象 / Target object.
    	 * @param {string|string[]} [paths=[]] 要删除的路径 / Paths to remove.
    	 * @returns {object}
    	 * @see {@link https://lodash.com/docs/#omit lodash.omit}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.omit lodash.omit (中文)}
    	 */
    	static omit(object = {}, paths = []) {
    		if (!Array.isArray(paths)) paths = [paths.toString()];
    		paths.forEach(path => Lodash.unset(object, path));
    		return object;
    	}

    	/**
    	 * 仅保留对象指定键（第一层）。
    	 * Pick selected keys from object (top level only).
    	 *
    	 * @param {object} [object={}] 目标对象 / Target object.
    	 * @param {string|string[]} [paths=[]] 需要保留的键 / Keys to keep.
    	 * @returns {object}
    	 * @see {@link https://lodash.com/docs/#pick lodash.pick}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.pick lodash.pick (中文)}
    	 */
    	static pick(object = {}, paths = []) {
    		if (!Array.isArray(paths)) paths = [paths.toString()];
    		const filteredEntries = Object.entries(object).filter(([key, value]) => paths.includes(key));
    		return Object.fromEntries(filteredEntries);
    	}

    	/**
    	 * 按路径写入对象值。
    	 * Set object value by path.
    	 *
    	 * @param {object} object 目标对象 / Target object.
    	 * @param {string|string[]} path 路径 / Path.
    	 * @param {*} value 写入值 / Value.
    	 * @returns {object}
    	 * @see {@link https://lodash.com/docs/#set lodash.set}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.set lodash.set (中文)}
    	 */
    	static set(object, path, value) {
    		if (!Array.isArray(path)) path = Lodash.toPath(path);
    		path.slice(0, -1).reduce((previousValue, currentValue, currentIndex) => (Object(previousValue[currentValue]) === previousValue[currentValue] ? previousValue[currentValue] : (previousValue[currentValue] = /^\d+$/.test(path[currentIndex + 1]) ? [] : {})), object)[path[path.length - 1]] = value;
    		return object;
    	}

    	/**
    	 * 将点路径或数组下标路径转换为数组。
    	 * Convert dot/array-index path string into path segments.
    	 *
    	 * @param {string} value 路径字符串 / Path string.
    	 * @returns {string[]}
    	 * @see {@link https://lodash.com/docs/#toPath lodash.toPath}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.toPath lodash.toPath (中文)}
    	 */
    	static toPath(value) {
    		return value
    			.replace(/\[(\d+)\]/g, ".$1")
    			.split(".")
    			.filter(Boolean);
    	}

    	/**
    	 * HTML 实体反转义。
    	 * Unescape HTML entities.
    	 *
    	 * @param {string} string 输入文本 / Input text.
    	 * @returns {string}
    	 * @see {@link https://lodash.com/docs/#unescape lodash.unescape}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.unescape lodash.unescape (中文)}
    	 */
    	static unescape(string) {
    		const map = {
    			"&amp;": "&",
    			"&lt;": "<",
    			"&gt;": ">",
    			"&quot;": '"',
    			"&#39;": "'",
    		};
    		return string.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => map[m]);
    	}

    	/**
    	 * 删除对象路径对应的值。
    	 * Remove value by object path.
    	 *
    	 * @param {object} [object={}] 目标对象 / Target object.
    	 * @param {string|string[]} [path=""] 路径 / Path.
    	 * @returns {boolean}
    	 * @see {@link https://lodash.com/docs/#unset lodash.unset}
    	 * @see {@link https://www.lodashjs.com/docs/lodash.unset lodash.unset (中文)}
    	 */
    	static unset(object = {}, path = "") {
    		if (!Array.isArray(path)) path = Lodash.toPath(path);
    		const result = path.reduce((previousValue, currentValue, currentIndex) => {
    			if (currentIndex === path.length - 1) {
    				delete previousValue[currentValue];
    				return true;
    			}
    			return Object(previousValue)[currentValue];
    		}, object);
    		return result;
    	}
    }

    /* https://github.com/ljharb/qs */
    /**
     * 轻量 `qs` 查询字符串工具。
     * Lightweight `qs` query-string utilities.
     *
     * 说明:
     * Notes:
     * - 参考 `qs` 的 `parse` / `stringify` 接口设计
     * - Modeled after the `qs` `parse` / `stringify` API
     * - `parse` 保持当前项目原有 `$argument` 字符串解析语义
     * - `parse` preserves the existing `$argument` string parsing semantics
     * - `stringify` 基于项目内 `Lodash` 路径能力展开对象
     * - `stringify` expands objects via the in-project `Lodash` path helpers
     *
     * 参考:
     * Reference:
     * - https://github.com/ljharb/qs
     * - https://www.npmjs.com/package/qs
     */
    class qs {
    	/**
    	 * 将查询字符串解析为对象。
    	 * Parse a query string into an object.
    	 *
    	 * @param {string | Record<string, unknown> | null | undefined} [query=""] 查询字符串或对象 / Query string or object.
    	 * @returns {Record<string, unknown>}
    	 */
    	static parse(query) {
    		let result = {};
    		switch (typeof query) {
    			case "string": {
    				const source = query.replace(/^\?/, "");
    				if (!source) break;
    				const obj = Object.fromEntries(
    					source
    						.split("&")
    						.filter(Boolean)
    						.map(item => {
    							const [rawKey = "", rawValue = ""] = item.split("=", 2);
    							const key = qs.#decode(rawKey).replace(/\[([^\[\]]+)\]/g, ".$1");
    							return [key, qs.#decode(rawValue).replace(/\"/g, "")];
    						}),
    				);
    				Object.keys(obj).forEach(key => Lodash.set(result, key, obj[key]));
    				break;
    			}
    			case "object": {
    				switch (query) {
    					case null:
    						break;
    					default: {
    						const obj = {};
    						Object.keys(query).forEach(key => Lodash.set(obj, key, query[key]));
    						result = obj;
    						break;
    					}
    				}
    				break;
    			}
    			case "undefined":
    				result = {};
    				break;
    		}
    		return result;
    	}

    	/**
    	 * 将对象序列化为查询字符串。
    	 * Serialize an object into a query string.
    	 *
    	 * @param {Record<string, unknown>} [object={}] 输入对象 / Input object.
    	 * @returns {string}
    	 */
    	static stringify(object = {}) {
    		if (!object || typeof object !== "object") return "";

    		const entries = [];
    		Object.keys(object).forEach(key => qs.#collect(object, key, entries));

    		if (entries.length === 0) return "";
    		return entries
    			.map(([key, value]) => `${qs.#encode(qs.#formatPath(key))}=${qs.#encode(value)}`)
    			.join("&");
    	}

    	/**
    	 * 收集待序列化的键值对。
    	 * Collect key-value pairs for stringification.
    	 *
    	 * @param {Record<string, unknown>} object 输入对象 / Input object.
    	 * @param {string} path 当前路径 / Current path.
    	 * @param {[string, string][]} entries 输出数组 / Output entries.
    	 * @returns {void}
    	 */
    	static #collect(object, path, entries) {
    		const value = Lodash.get(object, path);
    		if (value === undefined) return;
    		if (value === null) {
    			entries.push([path, ""]);
    			return;
    		}
    		if (Array.isArray(value)) {
    			value.forEach((item, index) => {
    				if (item === undefined) return;
    				qs.#collect(object, `${path}[${index}]`, entries);
    			});
    			return;
    		}
    		if (qs.#isPlainObject(value)) {
    			Object.keys(value).forEach(key => qs.#collect(object, `${path}.${key}`, entries));
    			return;
    		}
    		entries.push([path, String(value)]);
    	}

    	/**
    	 * 使用 `Lodash.toPath` 规范化输出路径。
    	 * Normalize output path via `Lodash.toPath`.
    	 *
    	 * @param {string} path 原始路径 / Raw path.
    	 * @returns {string}
    	 */
    	static #formatPath(path) {
    		const [head, ...tail] = Lodash.toPath(path);
    		return tail.reduce((result, segment) => (/^\d+$/.test(segment) ? `${result}[${segment}]` : `${result}.${segment}`), head);
    	}

    	/**
    	 * 判断值是否为普通对象。
    	 * Check whether a value is a plain object.
    	 *
    	 * @param {unknown} value 输入值 / Input value.
    	 * @returns {boolean}
    	 */
    	static #isPlainObject(value) {
    		if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    		const proto = Object.getPrototypeOf(value);
    		return proto === null || proto === Object.prototype;
    	}

    	/**
    	 * 编码查询字符串片段。
    	 * Encode a query-string fragment.
    	 *
    	 * @param {string} value 原始值 / Raw value.
    	 * @returns {string}
    	 */
    	static #encode(value) {
    		return encodeURIComponent(value);
    	}

    	/**
    	 * 解码查询字符串片段。
    	 * Decode a query-string fragment.
    	 *
    	 * @param {string} value 编码值 / Encoded value.
    	 * @returns {string}
    	 */
    	static #decode(value) {
    		return decodeURIComponent(value.replace(/\+/g, " "));
    	}
    }

    /**
     * 统一 `$argument` 输入格式并展开深路径。
     * Normalize `$argument` input format and expand deep paths.
     *
     * 平台差异:
     * Platform differences:
     * - Surge / Stash / Egern 常见为字符串参数: `a=1&b=2`
     * - Surge / Stash / Egern usually pass string args: `a=1&b=2`
     * - Loon 支持字符串和对象两种形态
     * - Loon supports both string and object forms
     * - Quantumult X / Shadowrocket 一般不提供 `$argument`
     * - Quantumult X / Shadowrocket usually do not expose `$argument`
     *
     * 执行时机:
     * Execution timing:
     * - 该模块为即时执行模块，`import` 时立即处理全局 `$argument`
     * - This module executes immediately and mutates global `$argument` on import
     *
     * 归一化规则补充:
     * Normalization details:
     * - 使用 `globalThis.$argument` 读写，避免运行环境下未声明变量引用问题
     * - Read/write via `globalThis.$argument` to avoid undeclared variable access
     * - 当 `$argument` 为 `null` 或 `undefined` 时，会重置为 `{}`
     * - When `$argument` is `null` or `undefined`, it is normalized to `{}`
     */
    (() => {
    	Console.debug("☑️ $argument");
    	globalThis.$argument = qs.parse(globalThis.$argument);
    	if (globalThis.$argument.LogLevel) Console.logLevel = globalThis.$argument.LogLevel;
    	Console.debug("✅ $argument", `$argument: ${JSON.stringify(globalThis.$argument)}`);
    })();

    /**
     * HTTP 状态码文本映射表。
     * HTTP status code to status text map.
     *
     * 主要用途:
     * Primary usage:
     * - 为 Quantumult X 的 `$done` 状态行拼接提供状态文本
     * - Provide status text for Quantumult X `$done` status-line composition
     * - QX 在部分场景要求 `status` 为完整状态行（如 `HTTP/1.1 200 OK`）
     * - QX may require full status line (e.g. `HTTP/1.1 200 OK`) in some cases
     *
     * 参考:
     * Reference:
     * - https://github.com/crossutility/Quantumult-X/raw/refs/heads/master/sample-rewrite-response-header.js
     *
     * @type {Record<number, string>}
     */
    const StatusTexts = {
    	100: "Continue",
    	101: "Switching Protocols",
    	102: "Processing",
    	103: "Early Hints",
    	200: "OK",
    	201: "Created",
    	202: "Accepted",
    	203: "Non-Authoritative Information",
    	204: "No Content",
    	205: "Reset Content",
    	206: "Partial Content",
    	207: "Multi-Status",
    	208: "Already Reported",
    	226: "IM Used",
    	300: "Multiple Choices",
    	301: "Moved Permanently",
    	302: "Found",
    	304: "Not Modified",
    	307: "Temporary Redirect",
    	308: "Permanent Redirect",
    	400: "Bad Request",
    	401: "Unauthorized",
    	402: "Payment Required",
    	403: "Forbidden",
    	404: "Not Found",
    	405: "Method Not Allowed",
    	406: "Not Acceptable",
    	407: "Proxy Authentication Required",
    	408: "Request Timeout",
    	409: "Conflict",
    	410: "Gone",
    	411: "Length Required",
    	412: "Precondition Failed",
    	413: "Content Too Large",
    	414: "URI Too Long",
    	415: "Unsupported Media Type",
    	416: "Range Not Satisfiable",
    	417: "Expectation Failed",
    	418: "I'm a teapot",
    	421: "Misdirected Request",
    	422: "Unprocessable Entity",
    	423: "Locked",
    	424: "Failed Dependency",
    	425: "Too Early",
    	426: "Upgrade Required",
    	428: "Precondition Required",
    	429: "Too Many Requests",
    	431: "Request Header Fields Too Large",
    	451: "Unavailable For Legal Reasons",
    	500: "Internal Server Error",
    	501: "Not Implemented",
    	502: "Bad Gateway",
    	503: "Service Unavailable",
    	504: "Gateway Timeout",
    	505: "HTTP Version Not Supported",
    	506: "Variant Also Negotiates",
    	507: "Insufficient Storage",
    	508: "Loop Detected",
    	510: "Not Extended",
    	511: "Network Authentication Required",
    };

    /**
     * `done` 的统一入参结构。
     * Unified `done` input payload.
     *
     * @typedef {object} DonePayload
     * @property {number|string} [status] 响应状态码或状态行 / Response status code or status line.
     * @property {string} [url] 响应 URL / Response URL.
     * @property {Record<string, any>} [headers] 响应头 / Response headers.
     * @property {string|ArrayBuffer|ArrayBufferView} [body] 响应体 / Response body.
     * @property {ArrayBuffer} [bodyBytes] 二进制响应体 / Binary response body.
     * @property {string} [policy] 指定策略名 / Preferred policy name.
     */

    /**
     * 结束脚本执行并按平台转换参数。
     * Complete script execution with platform-specific parameter mapping.
     *
     * 说明:
     * Notes:
     * - 这是调用入口，平台原生 `$done` 差异在内部处理
     * - This is the call entry and native `$done` differences are handled internally
     * - Worker 不调用 `$done` 或退出进程，仅记录日志
     * - Worker neither calls `$done` nor exits the process; it only logs
     * - Node.js 不调用 `$done`，而是直接退出进程
     * - Node.js does not call `$done`; it exits the process directly
     * - 未识别平台仅记录结束日志，不会强制退出
     * - Unknown runtimes only log completion and do not force an exit
     *
     * @param {DonePayload} [object={}] 统一响应对象 / Unified response object.
     * @returns {void}
     */
    function done(object = {}) {
    	switch ($app) {
    		case "Surge":
    			if (object.policy) Lodash.set(object, "headers.X-Surge-Policy", object.policy);
    			Console.log("🚩 执行结束!", `🕛 ${new Date().getTime() / 1000 - $script.startTime} 秒`);
    			$done(object);
    			break;
    		case "Loon":
    			if (object.policy) object.node = object.policy;
    			Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
    			$done(object);
    			break;
    		case "Stash":
    			if (object.policy) Lodash.set(object, "headers.X-Stash-Selected-Proxy", encodeURI(object.policy));
    			Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
    			$done(object);
    			break;
    		case "Egern":
    			Console.log("🚩 执行结束!");
    			$done(object);
    			break;
    		case "Shadowrocket":
    			Console.log("🚩 执行结束!");
    			$done(object);
    			break;
    		case "Quantumult X":
    			if (object.policy) Lodash.set(object, "opts.policy", object.policy);
    			object = Lodash.pick(object, ["status", "url", "headers", "body", "bodyBytes"]);
    			switch (typeof object.status) {
    				case "number":
    					object.status = `HTTP/1.1 ${object.status} ${StatusTexts[object.status]}`;
    					break;
    				case "string":
    				case "undefined":
    					break;
    				default:
    					throw new TypeError(`${Function.name}: 参数类型错误, status 必须为数字或字符串`);
    			}
    			if (object.body instanceof ArrayBuffer) {
    				object.bodyBytes = object.body;
    				object.body = undefined;
    			} else if (ArrayBuffer.isView(object.body)) {
    				object.bodyBytes = object.body.buffer.slice(object.body.byteOffset, object.body.byteLength + object.body.byteOffset);
    				object.body = undefined;
    			} else if (object.body) object.bodyBytes = undefined;
    			Console.log("🚩 执行结束!");
    			$done(object);
    			break;
    		case "Worker":
    			Console.log("🚩 执行结束!");
    			break;
    		case "Node.js":
    			Console.log("🚩 执行结束!");
    			process.exit(1);
    			break;
    		default:
    			Console.log("🚩 执行结束!");
    			break;
    	}
    }

    /**
     * 统一请求参数。
     * Unified request payload.
     *
     * @typedef {object} FetchRequest
     * @property {string} url 请求地址 / Request URL.
     * @property {string} [method] 请求方法 / HTTP method.
     * @property {Record<string, any>} [headers] 请求头 / Request headers.
     * @property {string|ArrayBuffer|ArrayBufferView|object} [body] 请求体 / Request body.
     * @property {ArrayBuffer} [bodyBytes] 二进制请求体 / Binary request body.
     * @property {number|string} [timeout] 超时（秒或毫秒）/ Timeout (seconds or milliseconds).
     * @property {string} [policy] 指定策略 / Preferred policy.
     * @property {boolean} [redirection] 是否跟随重定向 / Whether to follow redirects.
     * @property {boolean} ["auto-redirect"] 平台重定向字段 / Platform redirect flag.
     * @property {boolean|number|string} ["auto-cookie"] Worker / Node.js Cookie 开关 / Worker / Node.js Cookie toggle.
     * @property {Record<string, any>} [opts] 平台扩展字段 / Platform extension fields.
     */

    /**
     * 统一响应结构。
     * Unified response payload.
     *
     * @typedef {object} FetchResponse
     * @property {boolean} ok 请求是否成功 / Whether request is successful.
     * @property {number} status 状态码 / HTTP status code.
     * @property {number} [statusCode] 状态码别名 / Status code alias.
     * @property {string} [statusText] 状态文本 / HTTP status text.
     * @property {Record<string, any>} [headers] 响应头 / Response headers.
     * @property {string|ArrayBuffer} [body] 响应体 / Response body.
     * @property {ArrayBuffer} [bodyBytes] 二进制响应体 / Binary response body.
     */

    /**
     * 跨平台 `fetch` 适配层。
     * Cross-platform `fetch` adapter.
     *
     * 设计目标:
     * Design goal:
     * - 仿照 Web API `fetch`（`Window.fetch`）接口设计
     * - Modeled after Web API `fetch` (`Window.fetch`)
     * - 统一 VPN App、Worker 与 Node.js 环境中的请求调用
     * - Unify request calls across VPN apps, Worker, and Node.js
     *
     * 功能:
     * Features:
     * - 统一 Quantumult X / Loon / Surge / Stash / Egern / Shadowrocket / Worker / Node.js 请求接口
     * - Normalize request APIs across Quantumult X / Loon / Surge / Stash / Egern / Shadowrocket / Worker / Node.js
     * - 统一返回体字段（`ok/status/statusText/body/bodyBytes`）
     * - Normalize response fields (`ok/status/statusText/body/bodyBytes`)
     *
     * 与 Web `fetch` 的已知差异:
     * Known differences from Web `fetch`:
     * - 支持 `policy`、`auto-redirect` 等平台扩展字段
     * - Supports platform extension fields like `policy` and `auto-redirect`
     * - Worker / Node.js 共享基于 `fetch` 的请求分支
     * - Worker / Node.js share the `fetch`-based request branch
     * - Node.js ESM 的 `auto-cookie` 由 `fetch.node.mjs` 处理，本文件只使用宿主 `fetch`
     * - Node.js ESM `auto-cookie` is handled by `fetch.node.mjs`; this module only uses the host `fetch`
     * - 非浏览器平台通过 `$httpClient/$task` 实现，不是原生 Fetch 实现
     * - Non-browser platforms use `$httpClient/$task` instead of native Fetch engine
     * - 返回结构包含 `statusCode/bodyBytes` 等兼容字段
     * - Response includes compatibility fields like `statusCode/bodyBytes`
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
     * @link https://developer.mozilla.org/zh-CN/docs/Web/API/Window/fetch
     * @async
     * @param {FetchRequest|string} resource 请求对象或 URL / Request object or URL string.
     * @param {Partial<FetchRequest>} [options={}] 追加参数 / Extra options.
     * @returns {Promise<FetchResponse>}
     */
    async function fetch(resource, options = {}) {
    	// 初始化参数。
    	// Initialize request input.
    	switch (typeof resource) {
    		case "object":
    			resource = { ...options, ...resource };
    			break;
    		case "string":
    			resource = { ...options, url: resource };
    			break;
    		case "undefined":
    		default:
    			throw new TypeError(`${Function.name}: 参数类型错误, resource 必须为对象或字符串`);
    	}
    	// 自动判断请求方法。
    	// Infer the HTTP method automatically.
    	if (!resource.method) {
    		resource.method = "GET";
    		if (resource.body ?? resource.bodyBytes) resource.method = "POST";
    	}
    	// 移除需要由底层实现自动生成的请求头。
    	// Remove headers that should be generated by the underlying runtime.
    	delete resource.headers?.Host;
    	delete resource.headers?.[":authority"];
    	delete resource.headers?.["Content-Length"];
    	delete resource.headers?.["content-length"];
    	// 统一请求方法为小写，方便后续索引平台 API。
    	// Normalize the method to lowercase for platform API lookups.
    	const method = resource.method.toLocaleLowerCase();
    	// 默认请求超时时间为 5 秒。
    	// Default request timeout to 5 seconds.
    	if (!resource.timeout) resource.timeout = 5;
    	if (resource.timeout) {
    		resource.timeout = Number.parseInt(resource.timeout, 10);
    		// 统一先转换为秒，大于 500 视为毫秒输入。
    		// Convert to seconds first and treat values above 500 as milliseconds.
    		if (resource.timeout > 500) resource.timeout = Math.round(resource.timeout / 1000);
    	}
    	if (resource.timeout) {
    		switch ($app) {
    			case "Loon":
    			case "Quantumult X":
    			case "Worker":
    			case "Node.js":
    				// 这些平台要求毫秒，因此把秒重新换算为毫秒。
    				// These platforms expect milliseconds, so convert seconds back to milliseconds.
    				resource.timeout = resource.timeout * 1000;
    				break;
    		}
    	}
    	// 根据当前平台选择请求实现。
    	// Select the request engine for the current platform.
    	switch ($app) {
    		case "Loon":
    		case "Surge":
    		case "Stash":
    		case "Egern":
    		case "Shadowrocket":
    			// 转换通用请求参数到 `$httpClient` 语义。
    			// Map shared request fields to `$httpClient` semantics.
    			if (resource.policy) {
    				switch ($app) {
    					case "Loon":
    						resource.node = resource.policy;
    						break;
    					case "Stash":
    						Lodash.set(resource, "headers.X-Stash-Selected-Proxy", encodeURI(resource.policy));
    						break;
    					case "Shadowrocket":
    						Lodash.set(resource, "headers.X-Surge-Proxy", resource.policy);
    						break;
    				}
    			}
    			if (typeof resource.redirection === "boolean") resource["auto-redirect"] = resource.redirection;
    			// 优先把 `bodyBytes` 映射回 `$httpClient` 能接受的 `body`。
    			// Prefer mapping `bodyBytes` back to the `body` field expected by `$httpClient`.
    			if (resource.bodyBytes && !resource.body) {
    				resource.body = resource.bodyBytes;
    				resource.bodyBytes = undefined;
    			}
    			// 根据 `Accept` 推断是否需要二进制响应体。
    			// Infer whether the response should be treated as binary from `Accept`.
    			switch ((resource.headers?.Accept || resource.headers?.accept)?.split(";")?.[0]) {
    				case "application/protobuf":
    				case "application/x-protobuf":
    				case "application/vnd.google.protobuf":
    				case "application/vnd.apple.flatbuffer":
    				case "application/grpc":
    				case "application/grpc-web":
    				case "application/grpc+proto":
    				case "application/octet-stream":
    					resource["binary-mode"] = true;
    					break;
    			}
    			// 发送 `$httpClient` 请求并归一化返回结构。
    			// Send the `$httpClient` request and normalize the response payload.
    			return new Promise((resolve, reject) => {
    				globalThis.$httpClient[method](resource, (error, response, body) => {
    					if (error) reject(error);
    					else {
    						response.ok = /^2\d\d$/.test(response.status);
    						response.statusCode = response.status;
    						response.statusText = StatusTexts[response.status];
    						if (body) {
    							response.body = body;
    							if (resource["binary-mode"] == true) response.bodyBytes = body;
    						}
    						resolve(response);
    					}
    				});
    			});
    		case "Quantumult X":
    			// 转换 Quantumult X 专有请求参数。
    			// Map request fields to Quantumult X specific options.
    			if (resource.policy) Lodash.set(resource, "opts.policy", resource.policy);
    			if (typeof resource["auto-redirect"] === "boolean") Lodash.set(resource, "opts.redirection", resource["auto-redirect"]);
    			// Quantumult X 使用 `bodyBytes` 传输二进制请求体。
    			// Quantumult X uses `bodyBytes` for binary request payloads.
    			if (resource.body instanceof ArrayBuffer) {
    				resource.bodyBytes = resource.body;
    				resource.body = undefined;
    			} else if (ArrayBuffer.isView(resource.body)) {
    				resource.bodyBytes = resource.body.buffer.slice(resource.body.byteOffset, resource.body.byteLength + resource.body.byteOffset);
    				resource.body = undefined;
    			} else if (resource.body) resource.bodyBytes = undefined;
    			// 发送请求，并用 `Promise.race` 提供统一超时保护。
    			// Send the request and enforce timeout with `Promise.race`.
    			return Promise.race([
    				globalThis.$task.fetch(resource).then(
    					response => {
    						response.ok = /^2\d\d$/.test(response.statusCode);
    						response.status = response.statusCode;
    						response.statusText = StatusTexts[response.status];
    						switch ((response.headers?.["Content-Type"] ?? response.headers?.["content-type"])?.split(";")?.[0]) {
    							case "application/protobuf":
    							case "application/x-protobuf":
    							case "application/vnd.google.protobuf":
    							case "application/vnd.apple.flatbuffer":
    							case "application/grpc":
    							case "application/grpc-web":
    							case "application/grpc+proto":
    							case "application/octet-stream":
    								response.body = response.bodyBytes;
    								break;
    						}
    						response.bodyBytes = undefined;
    						return response;
    					},
    					reason => Promise.reject(reason.error),
    				),
    				new Promise((resolve, reject) => {
    					setTimeout(() => {
    						reject(new Error(`${Function.name}: 请求超时, 请检查网络后重试`));
    					}, resource.timeout);
    				}),
    			]);
    		case "Worker":
    		case "Node.js":
    		default: {
    			let request;
    			let timeout;
    			let shouldWrapError = false;
    			switch ($app) {
    				case "Worker":
    				case "Node.js":
    					switch (typeof globalThis.fetch) {
    						case "function":
    							break;
    						default:
    							throw new Error(`${Function.name}: 当前运行环境不支持 Fetch API`);
    					}
    					// 将通用字段映射到 Worker / Node.js Fetch 语义。
    					// Map shared fields to Worker / Node.js Fetch semantics.
    					resource.redirect = resource.redirection ? "follow" : "manual";
    					request = resource;
    					timeout = resource.timeout;
    					shouldWrapError = true;
    					break;
    				default: {
    					// 未识别宿主也可使用完整标准 Fetch API；不将能力推断为宿主类型。
    					// An unrecognized host may still use the complete standard Fetch API; capability does not imply a host type.
    					if (typeof globalThis.fetch !== "function" || typeof globalThis.Headers !== "function" || typeof globalThis.Request !== "function" || typeof globalThis.Response !== "function") {
    						throw new Error(`${Function.name}: 当前运行环境不支持 Fetch API`);
    					}
    					const { url, bodyBytes, redirection, timeout: _timeout, policy: _policy, "auto-redirect": _autoRedirect, "auto-cookie": _autoCookie, opts: _opts, ...fetchOptions } = resource;
    					if (bodyBytes !== undefined && fetchOptions.body === undefined) fetchOptions.body = bodyBytes;
    					fetchOptions.redirect = redirection ? "follow" : "manual";
    					request = { url, ...fetchOptions };
    					timeout = resource.timeout * 1000;
    					break;
    				}
    			}
    			const { url, ...options } = request;
    			// 发起请求并归一化响应头、文本与二进制响应体。
    			// Send the request and normalize headers, text, and binary response data.
    			const responsePromise = globalThis.fetch(url, options).then(async response => {
    				const bodyBytes = await response.arrayBuffer();
    				let headers;
    				try {
    					headers = response.headers.raw();
    				} catch {
    					headers = Array.from(response.headers.entries()).reduce((acc, [key, value]) => {
    						acc[key] = acc[key] ? [...acc[key], value] : [value];
    						return acc;
    					}, {});
    				}
    				return {
    					ok: response.ok ?? /^2\d\d$/.test(response.status),
    					status: response.status,
    					statusCode: response.status,
    					statusText: response.statusText,
    					body: new TextDecoder("utf-8").decode(bodyBytes),
    					bodyBytes: bodyBytes,
    					headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, key.toLowerCase() !== "set-cookie" ? value.toString() : value])),
    				};
    			});
    			return Promise.race([
    				shouldWrapError ? responsePromise.catch(error => Promise.reject(error.message)) : responsePromise,
    				new Promise((_resolve, reject) => {
    					setTimeout(() => {
    						reject(new Error(`${Function.name}: 请求超时, 请检查网络后重试`));
    					}, timeout);
    				}),
    			]);
    		}
    	}
    }

    /**
     * 跨平台持久化存储适配器。
     * Cross-platform persistent storage adapter.
     *
     * 设计目标:
     * Design goal:
     * - 仿照 Web Storage (`Storage`) 接口设计
     * - Modeled after Web Storage (`Storage`) interface
     * - 统一 VPN App 脚本环境中的持久化读写接口
     * - Unify persistence APIs across VPN app script environments
     *
     * 支持后端:
     * Supported backends:
     * - Surge/Loon/Stash/Egern/Shadowrocket: `$persistentStore`
     * - Quantumult X: `$prefs`
     * - Worker: 内存缓存（非持久化）
     * - Worker: in-memory cache (non-persistent)
     * - Node.js: 由 Node.js ESM 入口注入持久化后端
     * - Node.js: persistent backend injected by the Node.js ESM entry
     *
     * 支持路径键:
     * Supports path key:
     * - `@root.path.to.value`
     *
     * 与 Web Storage 的已知差异:
     * Known differences from Web Storage:
     * - 支持 `@key.path` 深路径读写（Web Storage 原生不支持）
     * - Supports `@key.path` deep-path access (not native in Web Storage)
     * - `removeItem/clear` 并非所有平台都可用
     * - `removeItem/clear` are not available on every platform
     * - 读取时会尝试 `JSON.parse`，写入对象会 `JSON.stringify`
     * - Reads try `JSON.parse`, writes stringify objects
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/API/Storage
     * @link https://developer.mozilla.org/zh-CN/docs/Web/API/Storage
     */
    class Storage {
    	/**
    	 * Worker / Node.js 环境下的内存数据缓存。
    	 * In-memory data cache for Worker / Node.js runtime.
    	 *
    	 * @type {Record<string, any>|null}
    	 */
    	static data = null;

    	/**
    	 * Node.js 持久化文件名。
    	 * Data file name used in Node.js.
    	 *
    	 * @type {string}
    	 */
    	static dataFile = "box.dat";

    	/**
    	 * Node.js ESM 入口注入的存储后端。
    	 * Storage backend injected by the Node.js ESM entry.
    	 *
    	 * @type {{load: (dataFile: string) => Record<string, any>, write: (dataFile: string, data: Record<string, any>) => void}|null}
    	 */
    	static nodeBackend = null;

    	/**
    	 * `@key.path` 解析正则。
    	 * Regex for `@key.path` parsing.
    	 *
    	 * @type {RegExp}
    	 */
    	static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;

    	/**
    	 * 读取存储值。
    	 * Read value from persistent storage.
    	 *
    	 * @param {string} keyName 键名或路径键 / Key or path key.
    	 * @param {*} [defaultValue=null] 默认值 / Default value when key is missing.
    	 * @returns {*}
    	 */
    	static getItem(keyName, defaultValue = null) {
    		let keyValue = defaultValue;
    		// 如果以 @
    		switch (keyName.startsWith("@")) {
    			case true: {
    				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
    				keyName = key;
    				let value = Storage.getItem(keyName, {});
    				if (typeof value !== "object") value = {};
    				keyValue = Lodash.get(value, path);
    				try {
    					keyValue = JSON.parse(keyValue);
    				} catch {}
    				break;
    			}
    			default:
    				switch ($app) {
    					case "Surge":
    					case "Loon":
    					case "Stash":
    					case "Egern":
    					case "Shadowrocket":
    						keyValue = $persistentStore.read(keyName);
    						break;
    					case "Quantumult X":
    						keyValue = $prefs.valueForKey(keyName);
    						break;
    					case "Worker":
    						Storage.data = Storage.data ?? {};
    						keyValue = Storage.data[keyName];
    						break;
    					case "Node.js":
    						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
    						keyValue = Storage.data?.[keyName];
    						break;
    					default:
    						keyValue = Storage.data?.[keyName] || null;
    						break;
    				}
    				try {
    					keyValue = JSON.parse(keyValue);
    				} catch {
    					// do nothing
    				}
    				break;
    		}
    		return keyValue ?? defaultValue;
    	}

    	/**
    	 * 写入存储值。
    	 * Write value into persistent storage.
    	 *
    	 * @param {string} keyName 键名或路径键 / Key or path key.
    	 * @param {*} keyValue 写入值 / Value to store.
    	 * @returns {boolean}
    	 */
    	static setItem(keyName = new String(), keyValue = new String()) {
    		let result = false;
    		switch (typeof keyValue) {
    			case "object":
    				keyValue = JSON.stringify(keyValue);
    				break;
    			default:
    				keyValue = String(keyValue);
    				break;
    		}
    		switch (keyName.startsWith("@")) {
    			case true: {
    				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
    				keyName = key;
    				let value = Storage.getItem(keyName, {});
    				if (typeof value !== "object") value = {};
    				Lodash.set(value, path, keyValue);
    				result = Storage.setItem(keyName, value);
    				break;
    			}
    			default:
    				switch ($app) {
    					case "Surge":
    					case "Loon":
    					case "Stash":
    					case "Egern":
    					case "Shadowrocket":
    						result = $persistentStore.write(keyValue, keyName);
    						break;
    					case "Quantumult X":
    						result = $prefs.setValueForKey(keyValue, keyName);
    						break;
    					case "Worker":
    						Storage.data = Storage.data ?? {};
    						Storage.data[keyName] = keyValue;
    						result = true;
    						break;
    					case "Node.js":
    						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
    						Storage.data[keyName] = keyValue;
    						Storage.nodeBackend.write(Storage.dataFile, Storage.data);
    						result = true;
    						break;
    					default:
    						result = Storage.data?.[keyName] || null;
    						break;
    				}
    				break;
    		}
    		return result;
    	}

    	/**
    	 * 删除存储值。
    	 * Remove value from persistent storage.
    	 *
    	 * 平台说明:
    	 * Platform notes:
    	 * - Quantumult X: `$prefs.removeValueForKey`
    	 * - Surge: 通过 `$persistentStore.write(null, keyName)` 删除
    	 * - 其余平台当前返回 `false`
    	 *
    	 * @param {string} keyName 键名或路径键 / Key or path key.
    	 * @returns {boolean}
    	 */
    	static removeItem(keyName) {
    		let result = false;
    		switch (keyName.startsWith("@")) {
    			case true: {
    				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
    				keyName = key;
    				let value = Storage.getItem(keyName);
    				if (typeof value !== "object") value = {};
    				Lodash.unset(value, path);
    				result = Storage.setItem(keyName, value);
    				break;
    			}
    			default:
    				switch ($app) {
    					case "Surge":
    						result = $persistentStore.write(null, keyName);
    						break;
    					case "Loon":
    					case "Stash":
    					case "Egern":
    					case "Shadowrocket":
    						result = false;
    						break;
    					case "Quantumult X":
    						result = $prefs.removeValueForKey(keyName);
    						break;
    					case "Worker":
    						Storage.data = Storage.data ?? {};
    						delete Storage.data[keyName];
    						result = true;
    						break;
    					case "Node.js":
    						// result = false;
    						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
    						delete Storage.data[keyName];
    						Storage.nodeBackend.write(Storage.dataFile, Storage.data);
    						result = true;
    						break;
    					default:
    						result = false;
    						break;
    				}
    				break;
    		}
    		return result;
    	}

    	/**
    	 * 清空存储。
    	 * Clear storage.
    	 *
    	 * @returns {boolean}
    	 */
    	static clear() {
    		let result = false;
    		switch ($app) {
    			case "Surge":
    			case "Loon":
    			case "Stash":
    			case "Egern":
    			case "Shadowrocket":
    				result = false;
    				break;
    			case "Quantumult X":
    				result = $prefs.removeAllValues();
    				break;
    			case "Worker":
    				Storage.data = {};
    				result = true;
    				break;
    			case "Node.js":
    				// result = false;
    				Storage.data = Storage.nodeBackend.load(Storage.dataFile);
    				Storage.data = {};
    				Storage.nodeBackend.write(Storage.dataFile, Storage.data);
    				result = true;
    				break;
    			default:
    				result = false;
    				break;
    		}
    		return result;
    	}
    }

    /**
     * 校验原始路径片段，不进行 URL 编码转换。
     * Validate raw path segments without URL encoding conversion.
     * @param {string[]} parts 原始路径片段 / Raw path segments.
     * @returns {string[]} 同一数组，不复制或修改 / The same array without copying or mutation.
     * @throws {TypeError} 空片段、非法字符或原型属性名 / Empty segments, invalid characters or prototype property names.
     */
    function validatePathParts(parts) {
        if (!parts.every(part => typeof part === "string" && /^[a-zA-Z0-9_-]+$/.test(part) && !["__proto__", "prototype", "constructor"].includes(part))) throw new TypeError("Invalid key path");
        return parts;
    }

    const MISSING = Symbol("missing");

    /**
     * PreferencePanes 后端 API，只处理模块数据和持久化请求。
     * PreferencePanes backend API handling only module data and persistence requests.
     */
    class API {
        /**
         * 处理当前代理请求并将结果交给宿主。
         * Handle the current proxy request and deliver its result to the host.
         * @returns {Promise<void>} 响应已交给代理宿主 / Response delivered to the proxy host.
         */
        async run() {
            const request = globalThis.$request;
            let result;
            try {
                result = await this.handle(request);
            } catch (error) {
                console.error(`PreferencePanes: ${error.message}`);
                result = this.#response(request, error.status ?? 500, { error: error.message });
            }
            if (!result) done({});
            else done($app === "Quantumult X" ? result : { response: result });
        }

        /**
         * 处理 `/api/{module}` 及其动作，不接管页面或静态资源。
         * Handle `/api/{module}` and its actions without intercepting pages or static assets.
         * @param {import("./index.js").SettingsRequest} request 代理请求 / Proxy request.
         * @returns {Promise<import("./index.js").SettingsResponse | undefined>} API 响应或未接管 / API response or pass-through.
         */
        async handle(request) {
            const url = new URL(request.url);
            const match = /^\/api\/([a-zA-Z0-9_-]+)(?:\/(get|set|delete))?\/?$/.exec(url.pathname);
            if (!match) return;
            const [, module, action] = match;
            const configuration = `${url.origin}/configs/${module}`;
            switch (true) {
                case !action && request.method === "HEAD":
                    return this.#probe(request, configuration);
                case Boolean(action) && request.method === "POST":
                    return this.#action(request, module, action, configuration);
                default:
                    return this.#response(request, 405, { error: "Use HEAD for module probes and POST for module actions" });
            }
        }

        async #probe(request, configuration) {
            let result;
            try {
                result = await fetch({ url: configuration, method: "HEAD", timeout: 5000, headers: { Accept: "application/json" } });
            } catch (error) {
                return this.#response(request, 502, { error: error.message });
            }
            const version = this.#header(result.headers, "x-preferencepanes-version");
            return this.#response(request, result.statusCode ?? result.status, undefined, version ? { "X-PreferencePanes-Version": version } : {});
        }

        async #action(request, module, action, configuration) {
            const payload = this.#jsonBody(request);
            const target = await this.#load(module, configuration);
            switch (action) {
                case "get": {
                    const value = Storage.getItem(payload?.scope ? this.#scopePath(target, payload.scope) : this.#storagePath(target, payload?.key), MISSING);
                    return value === MISSING ? this.#response(request, 404, { error: "Stored path does not exist" }) : this.#response(request, 200, value);
                }
                case "set":
                    if (!Object.hasOwn(payload ?? {}, "value")) throw Object.assign(new TypeError("A value is required"), { status: 400 });
                    if (!Storage.setItem(this.#storagePath(target, payload.key), payload.value)) throw new Error("Storage write failed");
                    return this.#response(request, 200, { saved: true });
                case "delete": {
                    const path = payload?.scope ? this.#scopePath(target, payload.scope) : this.#storagePath(target, payload?.key);
                    if (!Storage.removeItem(path)) throw new Error("Storage write failed");
                    return this.#response(request, 200, { deleted: true });
                }
            }
        }

        async #load(module, configuration) {
            let result;
            try {
                result = await fetch({ url: configuration, method: "GET", timeout: 5000, headers: { Accept: "application/json" } });
            } catch (error) {
                throw Object.assign(new Error(`Configuration request failed: ${error.message}`), { status: 502 });
            }
            const status = result.statusCode ?? result.status;
            if (status !== 200) throw Object.assign(new Error(`Configuration HTTP ${status}`), { status });
            try {
                const body = typeof result.body === "string" ? result.body : new TextDecoder().decode(result.body);
                const boxjs = JSON.parse(body);
                const apps = Array.isArray(boxjs) ? [{ settings: boxjs }] : (boxjs.apps ?? [boxjs]);
                if (!Array.isArray(apps)) throw new TypeError("Expected BoxJS apps array");
                const entries = [];
                let storageKey;
                for (const app of apps) {
                    if (!app || !Array.isArray(app.settings)) throw new TypeError("Expected BoxJS settings array");
                    for (const entry of app.settings) {
                        if (typeof entry.id !== "string") throw new TypeError("BoxJS settings require string IDs");
                        if (!entry.id.startsWith("@")) {
                            if (Array.isArray(boxjs)) throw new TypeError("BoxJS settings require @root.path IDs");
                            continue;
                        }
                        const [root, ...parts] = entry.id.slice(1).split(".");
                        if (!root || root.startsWith("@") || parts.length < 2) throw new TypeError("A BoxJS setting must be below a literal storage root and module");
                        validatePathParts(parts);
                        if (parts[0] !== module) continue;
                        if (storageKey && storageKey !== root) throw new TypeError(`A module must use one storage root: ${module}`);
                        storageKey = root;
                        entries.push(entry);
                    }
                }
                if (!entries.length) throw new TypeError(`No BoxJS settings for module: ${module}`);
                return { entries, module, storageKey, version: this.#header(result.headers, "x-preferencepanes-version") };
            } catch (error) {
                throw Object.assign(new Error(`Invalid BoxJS: ${error.message}`), { status: 422 });
            }
        }

        #jsonBody(request) {
            const headers = Object.fromEntries(Object.entries(request.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
            if (headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") throw Object.assign(new TypeError("Expected application/json"), { status: 415 });
            if (typeof request.body !== "string" || request.body.length > 65536) throw Object.assign(new TypeError("Expected a JSON body up to 65536 characters"), { status: 400 });
            try {
                return JSON.parse(request.body);
            } catch (error) {
                throw Object.assign(error, { status: 400 });
            }
        }

        #storagePath(target, key) {
            if (typeof key !== "string") throw Object.assign(new TypeError("A BoxJS field path is required"), { status: 400 });
            const path = `@${target.storageKey}.${key}`;
            if (!target.entries.some(entry => entry.id === path)) throw Object.assign(new TypeError(`Unknown BoxJS field: ${key}`), { status: 400 });
            return path;
        }

        #scopePath(target, scope) {
            switch (scope) {
                case "settings":
                    return `@${target.storageKey}.${target.module}.Settings`;
                case "caches":
                    return `@${target.storageKey}.${target.module}.Caches`;
                case "module":
                    return `@${target.storageKey}.${target.module}`;
                default:
                    throw Object.assign(new TypeError("Scope must be settings, caches or module"), { status: 400 });
            }
        }

        #response(request, status, body, extraHeaders = {}) {
            return {
                status,
                headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders },
                body: request.method === "HEAD" ? "" : JSON.stringify(body),
            };
        }

        #header(headers, name) {
            const entry = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name);
            return entry?.[1] === undefined ? undefined : String(entry[1]).trim();
        }
    }

    new API().run();

})();
