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

    /**
     * PreferencePanes 后端 API，只提供通用持久化操作。
     * PreferencePanes backend API providing generic persistence operations only.
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
         * 处理固定存储动作，不接管模块配置、页面或静态资源。
         * Handle fixed storage actions without intercepting module configurations, pages, or static assets.
         * @param {import("./index.js").SettingsRequest} request 代理请求 / Proxy request.
         * @returns {Promise<import("./index.js").SettingsResponse | undefined>} API 响应或未接管 / API response or pass-through.
         */
        async handle(request) {
            const url = new URL(request.url);
            const action = /^\/api\/(get|set|delete)$/.exec(url.pathname)?.[1];
            if (action) return this.#store(request, action);
            return;
        }

        /**
         * 使用唯一 form 字段中的完整 @root.path 执行存储操作。
         * Execute a storage operation using the complete @root.path from the sole form field.
         * @param {import("./index.js").SettingsRequest} request 代理请求 / Proxy request.
         * @param {"get" | "set" | "delete"} action 存储动作 / Storage action.
         * @returns {import("./index.js").SettingsResponse} 操作响应 / Operation response.
         */
        #store(request, action) {
            const reply = (status, data) => this.#response(request, status, data);
            if (request.method !== "POST") return reply(405, { error: "Use POST with a form body" });
            const headers = Object.fromEntries(Object.entries(request.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
            if (headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") return reply(415, { error: "Expected application/x-www-form-urlencoded" });
            if (typeof request.body !== "string" || request.body.length > 65536) return reply(400, { error: "Expected a form body up to 65536 characters" });
            let parts, value;
            try {
                const fields = request.body.split("&");
                if (fields.length !== 1) throw new TypeError("Send exactly one storage key");
                const separator = fields[0].indexOf("=");
                if (separator < 0) throw new TypeError("Expected @root.path=value");
                const key = decodeURIComponent(fields[0].slice(0, separator).replace(/\+/g, " "));
                value = decodeURIComponent(fields[0].slice(separator + 1).replace(/\+/g, " "));
                if (!key.startsWith("@")) throw new TypeError("Storage keys must start with @");
                parts = validatePathParts(key.slice(1).split("."));
                if (parts.length < 2) throw new TypeError("Specify a storage root and child path");
            } catch (error) {
                return reply(400, { error: error.message });
            }
            if (action === "set") {
                try {
                    value = JSON.parse(value);
                } catch (error) {
                    if (!(error instanceof SyntaxError)) throw error;
                }
            }
            const [storageKey, ...path] = parts;
            try {
                const root = Storage.getItem(storageKey, {});
                if (!isRecord(root)) throw new TypeError("Stored root must be an object");
                const parent = storageParent(root, path, action === "set");
                const key = path.at(-1);
                switch (action) {
                    case "get": {
                        const result = parent ? Lodash.get(parent, [key]) : undefined;
                        return result === undefined ? reply(404, { error: "Stored path does not exist" }) : reply(200, result);
                    }
                    case "set":
                        Lodash.set(parent, [key], value);
                        break;
                    case "delete":
                        if (parent) Lodash.unset(parent, [key]);
                        break;
                }
                if (!Storage.setItem(storageKey, root)) throw new Error("Storage write failed");
                return reply(200, action === "set" ? { saved: true } : { deleted: true });
            } catch (error) {
                return reply(500, { error: error.message });
            }
        }

        #response(request, status, body) {
            return {
                status,
                headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
                body: request.method === "HEAD" ? "" : JSON.stringify(body),
            };
        }
    }

    /**
     * 判断存储根是否为普通对象。
     * Determine whether a storage root is a plain object.
     * @param {unknown} value 待检查值 / Value to inspect.
     * @returns {boolean} 是否为普通对象 / Whether this is a plain object.
     */
    function isRecord(value) {
        return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
    }

    /**
     * 遍历父路径，并解码旧存储中的 JSON 字符串中间节点。
     * Traverse parent paths and decode legacy intermediate nodes stored as JSON strings.
     * @param {Record<string, unknown>} root 存储根 / Storage root.
     * @param {string[]} parts 完整路径 / Complete path.
     * @param {boolean} create 是否创建缺失节点 / Whether to create missing parents.
     * @returns {object | undefined} 父节点或 undefined / Parent node or undefined.
     */
    function storageParent(root, parts, create) {
        let parent = root;
        for (const part of parts.slice(0, -1)) {
            let next = Lodash.get(parent, [part]);
            switch (typeof next) {
                case "undefined":
                    if (!create) return;
                    next = {};
                    break;
                case "string":
                    next = JSON.parse(next);
                    break;
            }
            if (!isRecord(next) && !Array.isArray(next)) throw new TypeError("Stored parent is not an object or array");
            Lodash.set(parent, [part], next);
            parent = next;
        }
        return parent;
    }

    new API().run();

})();
