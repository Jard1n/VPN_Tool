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

    var assets = {"page":{"type":"text/html","body":"<!doctype html>\n<html lang=\"zh-CN\">\n    <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n        <meta name=\"color-scheme\" content=\"light dark\">\n        <title>Module Preferences</title>\n        <style>body { margin: 0; }</style>\n        <!--__PREFERENCE_PANES_STYLESHEET__-->\n    </head>\n    <body>\n        <main id=\"preferences\"></main>\n        <script type=\"module\" src=\"/settings/assets/index.mjs?v=1.2.0\"></script>\n    </body>\n</html>\n"},"/settings/assets/index.mjs":{"type":"text/javascript","body":"/**\n * 校验原始路径片段，不进行 URL 编码转换。\n * Validate raw path segments without URL encoding conversion.\n * @param {string[]} parts 原始路径片段 / Raw path segments.\n * @returns {string[]} 同一数组，不复制或修改 / The same array without copying or mutation.\n * @throws {TypeError} 空片段、非法字符或原型属性名 / Empty segments, invalid characters or prototype property names.\n */\nfunction validatePathParts(parts) {\n    if (!parts.every(part => typeof part === \"string\" && /^[a-zA-Z0-9_-]+$/.test(part) && ![\"__proto__\", \"prototype\", \"constructor\"].includes(part))) throw new TypeError(\"Invalid key path\");\n    return parts;\n}\n\n/**\n * 将 BoxJS 数组、app 或订阅转换为浏览器字段定义。\n * Normalize a BoxJS array, app or subscription into browser field definitions.\n * @param {unknown} config 原始 BoxJS JSON / Raw BoxJS JSON.\n * @param {string} [module] API 模块路径段；省略时要求输入只有一个模块 / API module path segment; omission requires exactly one module.\n * @returns {import(\"../index.js\").ModuleDefinition} 浏览器字段定义 / Browser field definition.\n */\nfunction normalizeBoxJs(config, module) {\n    if (!config || typeof config !== \"object\") throw new TypeError(\"Expected BoxJS JSON\");\n    const document = JSON.parse(JSON.stringify(config));\n    const apps = Array.isArray(document) ? [{ settings: document }] : (document.apps ?? [document]);\n    if (!Array.isArray(apps)) throw new TypeError(\"Expected BoxJS apps array\");\n    const modules = new Map();\n    for (const app of apps) {\n        if (!app || !Array.isArray(app.settings)) throw new TypeError(\"Expected BoxJS settings array\");\n        for (const entry of app.settings) {\n            if (typeof entry.id !== \"string\") throw new TypeError(\"BoxJS settings require string IDs\");\n            if (!entry.id.startsWith(\"@\")) {\n                if (Array.isArray(document)) throw new TypeError(\"BoxJS settings require @root.path IDs\");\n                continue;\n            }\n            const [storageKey, ...parts] = entry.id.slice(1).split(\".\");\n            if (!storageKey || storageKey.startsWith(\"@\") || parts.length < 2) throw new TypeError(\"A BoxJS setting must be below a literal storage root and module\");\n            validatePathParts(parts);\n            const name = parts[0];\n            if ([\"get\", \"set\", \"delete\"].includes(name)) throw new TypeError(`Reserved API module name: ${name}`);\n            let target = modules.get(name);\n            if (!target) {\n                target = { module: name, storageKey, entries: [], owners: new Set() };\n                modules.set(name, target);\n            }\n            if (target.storageKey !== storageKey) throw new TypeError(`A module must use one storage root: ${name}`);\n            target.entries.push(entry);\n            target.owners.add(app);\n        }\n    }\n    if (module === undefined && modules.size !== 1) throw new TypeError(\"Import BoxJS JSON for exactly one module\");\n    const target = module === undefined ? modules.values().next().value : modules.get(module);\n    if (!target) throw new TypeError(`No BoxJS settings for module: ${module}`);\n    const metadata = normalizeMetadata(target.owners.size === 1 ? presentation([...target.owners][0]) : {});\n    const fields = [];\n    for (const entry of target.entries) {\n        const parts = entry.id.slice(1).split(\".\").slice(1);\n        const type = { boolean: \"boolean\", checkboxes: \"array\", selects: \"select\", text: \"string\", textarea: \"string\", number: \"number\" }[entry.type];\n        if (!type) throw new TypeError(`Unsupported BoxJS control: ${entry.type}`);\n        const field = {\n            key: parts.join(\".\"),\n            type: type === \"select\" ? typeof entry.val : type,\n\n            name: entry.name,\n            description: entry.desc ?? \"\",\n            control: entry.type,\n            ...(entry.placeholder === undefined ? {} : { placeholder: entry.placeholder }),\n            ...(entry.rows === undefined ? {} : { rows: entry.rows }),\n            ...(entry.autoGrow === undefined ? {} : { autoGrow: entry.autoGrow }),\n        };\n        if (type === \"select\" && ![\"string\", \"number\", \"boolean\"].includes(field.type)) throw new TypeError(`Select requires a scalar val: ${entry.id}`);\n        if (entry.items) field.options = entry.items.map(item => ({ key: item.key, label: item.label }));\n        if (Object.hasOwn(entry, \"val\")) field.defaultValue = normalizeStoredValue(field, entry.val);\n        if (\n            typeof field.name !== \"string\" ||\n            (field.placeholder !== undefined && typeof field.placeholder !== \"string\") ||\n            (field.rows !== undefined && (!Number.isInteger(field.rows) || field.rows < 1)) ||\n            (field.autoGrow !== undefined && typeof field.autoGrow !== \"boolean\") ||\n            fields.some(other => other.key === field.key || other.key.startsWith(`${field.key}.`) || field.key.startsWith(`${other.key}.`))\n        )\n            throw new TypeError(`Invalid or overlapping BoxJS field: ${entry.id}`);\n        if (field.options && (new Set(field.options.map(item => item.key)).size !== field.options.length || field.options.some(item => !scalar(item.key) || typeof item.label !== \"string\"))) throw new TypeError(`Invalid options: ${entry.id}`);\n        if (Object.hasOwn(field, \"defaultValue\") && !validValue(field, field.defaultValue)) throw new TypeError(`Invalid BoxJS val: ${entry.id}`);\n        fields.push(field);\n    }\n    if (!fields.length) throw new TypeError(`No BoxJS settings for module: ${target.module}`);\n    const common = fields[0].key.split(\".\").slice(0, -1);\n    for (const field of fields) while (!field.key.startsWith(`${common.join(\".\")}.`)) common.pop();\n    return {\n        module: target.module,\n        storageKey: target.storageKey,\n        fields,\n        settingsPath: common,\n        ...(Object.keys(metadata).length ? { metadata } : {}),\n    };\n}\n\n/**\n * 保留字段所属 app 的原始展示信息。\n * Retain raw presentation metadata from the app owning the fields.\n * @param {object} source BoxJS app / BoxJS app.\n * @returns {Record<string, unknown>} 原始展示信息 / Raw presentation metadata.\n */\nfunction presentation(source) {\n    const result = {};\n    for (const key of [\"id\", \"name\", \"author\", \"repo\", \"script\", \"icon\", \"description\", \"desc\", \"icons\", \"descs\"]) {\n        if (source[key] === undefined) continue;\n        result[key] = source[key];\n    }\n    return result;\n}\n\n/**\n * 校验供浏览器展示的标准 BoxJS 元数据。\n * Validate standard BoxJS metadata used by the browser renderer.\n * @param {Record<string, unknown>} source 原始展示元数据 / Raw presentation metadata.\n * @returns {import(\"../index.js\").BoxJSMetadata} 规范化展示元数据 / Normalized presentation metadata.\n */\nfunction normalizeMetadata(source) {\n    const result = {};\n    for (const [key, value] of Object.entries(source)) {\n        const multiple = key === \"icons\" || key === \"descs\";\n        const values = multiple ? value : [value];\n        if (!Array.isArray(values) || values.some(item => typeof item !== \"string\")) throw new TypeError(`Invalid BoxJS app ${key}`);\n        result[key] = multiple ? [...values] : value;\n    }\n    return result;\n}\n\n/**\n * 归一化 BoxJS 的字符串存储值，不改变普通文本内容。\n * Normalize BoxJS string persistence without changing free-text values.\n * @param {import(\"../index.js\").SettingsField} field 前端字段约束 / Frontend field constraints.\n * @param {unknown} value 存储值 / Stored value.\n * @returns {unknown} 转换后的控件值；是否允许写入由 validValue 单独校验 / Converted control value; write eligibility is checked separately by validValue.\n */\nfunction normalizeStoredValue(field, value) {\n    switch (field.type) {\n        case \"boolean\":\n            if (value === \"true\" || value === \"false\") return value === \"true\";\n            break;\n        case \"number\":\n            if (typeof value === \"string\" && value.trim() !== \"\") return Number(value);\n            break;\n        case \"array\":\n            if (typeof value === \"string\") value = value === \"\" || value === \"[]\" ? [] : value.split(\",\");\n            break;\n    }\n    if (field.options) {\n        const match = item => field.options.find(option => String(option.key) === String(item))?.key ?? item;\n        return field.type === \"array\" && Array.isArray(value) ? value.map(match) : match(value);\n    }\n    return value;\n}\n\n/**\n * 校验支持的标量范围，包括文本长度与数值有限性。\n * Validate supported scalar bounds, including text length and numeric finiteness.\n * @param {unknown} value 待检查值 / Value to inspect.\n * @returns {boolean} 是否为有效标量 / Whether the scalar is valid.\n */\nfunction scalar(value) {\n    switch (typeof value) {\n        case \"boolean\":\n            return true;\n        case \"string\":\n            return value.length <= 2048;\n        case \"number\":\n            return Number.isFinite(value);\n        default:\n            return false;\n    }\n}\n\n/**\n * 检查值类型、数组唯一性及声明的选项，不进行转换。\n * Check value type, array uniqueness and declared choices without coercion.\n * @param {import(\"../index.js\").SettingsField} field 前端归一化字段 / Normalized frontend field.\n * @param {unknown} value 待写入的 JSON 值 / JSON value to write.\n * @returns {boolean} 是否符合字段约束 / Whether the value satisfies field constraints.\n */\nfunction validValue(field, value) {\n    if (field.type === \"array\") {\n        if (!Array.isArray(value) || value.some(item => !scalar(item)) || new Set(value).size !== value.length) return false;\n    } else if (typeof value !== field.type || !scalar(value)) return false;\n    return !field.options || (field.type === \"array\" ? value : [value]).every(item => field.options.some(option => option.key === item));\n}\n\n/**\n * 创建元素，所有展示文本通过 textContent 写入。\n * Create elements and assign display text through textContent only.\n * @template {keyof HTMLElementTagNameMap} T\n * @param {T} tag 元素标签 / Element tag.\n * @param {string} className 样式类名 / CSS class.\n * @param {string} [text] 纯文本 / Plain text.\n * @returns {HTMLElementTagNameMap[T]} 创建的元素 / Created element.\n */\nfunction element(tag, className, text) {\n    const node = document.createElement(tag);\n    node.className = className;\n    if (text !== undefined) node.textContent = text;\n    return node;\n}\n\n/**\n * 创建通用设置行；外部 CSS 可通过 pp 类名覆盖视觉样式。\n * Create a generic settings row whose appearance can be overridden through pp classes.\n * @template {\"div\" | \"label\"} T\n * @param {T} tag 行元素 / Row element.\n * @returns {HTMLElementTagNameMap[T]} 设置行 / Settings row.\n */\nfunction settingRow(tag) {\n    return element(tag, \"pp-row\");\n}\n\n/**\n * 为标准 HTML 输入控件添加通用面板类名。\n * Add the generic panel class to a standard HTML input control.\n * @param {HTMLElement} control 已创建的原生控件 / Existing native control.\n * @returns {HTMLElement} 输入控件 / Input control.\n */\nfunction fieldControl(control) {\n    control.classList.add(\"pp-editor\");\n    return control;\n}\n\n/**\n * 元数据地址只允许 HTTP(S) 和相对地址。\n * Allow only HTTP(S) and relative metadata addresses.\n * @param {string} value 元数据地址 / Metadata address.\n * @returns {string} 完整地址 / Absolute address.\n */\nfunction resourceURL(value) {\n    const url = new URL(value, document.baseURI);\n    if (![\"http:\", \"https:\"].includes(url.protocol)) throw new TypeError(\"Metadata URLs must use HTTP(S)\");\n    return url.href;\n}\n\n/**\n * 创建覆盖可用内容区的通用读取状态，失败时可附加重试动作。\n * Create a shared status view that fills the available content area and may include retry.\n * @param {string} message 状态文本 / Status message.\n * @param {(() => unknown) | undefined} [retry] 重试动作 / Retry action.\n * @returns {HTMLElement} 居中状态视图 / Centered status view.\n */\nfunction statusView(message, retry) {\n    const view = element(\"section\", \"pp-status\");\n    view.setAttribute(\"role\", \"status\");\n    view.setAttribute(\"aria-live\", \"polite\");\n    const spinner = element(\"span\", \"pp-status-spinner\");\n    spinner.setAttribute(\"aria-hidden\", \"true\");\n    view.append(spinner, element(\"p\", \"pp-status-message\", message));\n    if (retry) {\n        const button = element(\"button\", \"pp-status-action\", \"重新读取\");\n        button.type = \"button\";\n        button.onclick = retry;\n        view.append(button);\n    }\n    return view;\n}\n\n/**\n * 请求宿主确认；独立网页使用浏览器对话框。\n * Request confirmation from the host, using the browser dialog for standalone pages.\n * @param {Window} host 模块窗口 / Module window.\n * @param {string} message 确认内容 / Confirmation message.\n * @returns {Promise<boolean>} 用户是否确认 / Whether the user confirmed.\n */\nfunction requestConfirmation(host, message) {\n    return new Promise((resolve, reject) => {\n        const frame = host.frameElement;\n        if (frame) {\n            const event = new frame.ownerDocument.defaultView.CustomEvent(\"preferencepanes:confirm\", { cancelable: true, detail: { message, resolve, reject } });\n            if (!frame.dispatchEvent(event)) return;\n        }\n        resolve(host.confirm(message));\n    });\n}\n\n/**\n * 独立页面的三点按钮和底部操作菜单；嵌入页面由宿主提供对应界面。\n * Overflow trigger and bottom action sheet for standalone pages; embedded pages use host-provided chrome.\n */\nclass ActionMenu {\n    #button;\n    #layer;\n    #items;\n    #select;\n    #document;\n    #disabled = true;\n    #key = event => {\n        if (event.key === \"Escape\" && !this.#layer.hidden) {\n            event.preventDefault();\n            this.close();\n            this.#button.focus();\n        }\n    };\n\n    /**\n     * 创建菜单，操作逻辑由调用方提供。\n     * Create a menu whose actions are handled by the caller.\n     * @param {(id: string) => void} select 菜单选择回调 / Selection callback.\n     */\n    constructor(select) {\n        this.#document = document;\n        this.#select = select;\n        this.element = document.createElement(\"span\");\n        const triggerRoot = this.element.attachShadow({ mode: \"open\" });\n        triggerRoot.innerHTML = `<style>\n          :host{display:inline-flex;width:44px;height:44px;color:inherit}\n          :host([hidden]){display:none!important}\n          button{width:44px;height:44px;padding:10px;font:inherit;cursor:pointer;border:0;color:inherit;background:none}\n          button:disabled{opacity:.4;cursor:default}\n          button:focus-visible{outline:2px solid currentColor;outline-offset:-3px}\n          svg{display:block;width:24px;height:24px;fill:currentColor}\n        </style><button type=\"button\" aria-label=\"更多操作\" aria-haspopup=\"menu\" aria-expanded=\"false\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"4\" cy=\"12\" r=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><circle cx=\"20\" cy=\"12\" r=\"2\"/></svg></button>`;\n        this.#button = triggerRoot.querySelector(\"button\");\n        this.#layer = document.createElement(\"span\");\n        const layerRoot = this.#layer.attachShadow({ mode: \"open\" });\n        layerRoot.innerHTML = `<style>\n          :host{position:fixed;inset:0;z-index:2147483647;color:var(--pp-text,CanvasText);font:16px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}\n          :host([hidden]){display:none!important}\n          *,*::before,*::after{box-sizing:border-box}\n          button{font:inherit;cursor:pointer;border:0;color:inherit;background:none}\n          button:focus-visible{outline:2px solid var(--pp-accent,Highlight);outline-offset:-3px}\n          #backdrop{position:absolute;inset:0;width:100%;height:100%;padding:0;background:#0008;animation:pp-fade-in .18s ease-out}\n          #sheet{position:absolute;z-index:1;left:0;right:0;bottom:0;width:100%;max-width:540px;max-height:calc(100% - 24px);margin:auto;padding:8px 8px calc(8px + env(safe-area-inset-bottom));animation:pp-sheet-in .22s cubic-bezier(.2,.8,.2,1)}\n          #items,#cancel{overflow:hidden;background:var(--pp-surface,Canvas);border:1px solid var(--pp-border,#8884);border-radius:14px;box-shadow:0 8px 28px #0004}\n          #items{max-height:calc(100vh - 116px - env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch}\n          #items button,#cancel{display:block;width:100%;min-height:54px;padding:14px 18px;text-align:center}\n          #items button+button{border-top:1px solid var(--pp-border,#8884)}\n          #items button[data-danger]{color:var(--pp-danger,#e45656)}\n          #cancel{margin-top:8px;color:var(--pp-accent,Highlight);font-weight:600}\n          @keyframes pp-fade-in{from{opacity:0}}\n          @keyframes pp-sheet-in{from{transform:translateY(100%)}}\n          @media (prefers-reduced-motion:reduce){#backdrop,#sheet{animation:none}}\n        </style><button id=\"backdrop\" type=\"button\" tabindex=\"-1\" aria-label=\"关闭菜单\"></button><section id=\"sheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"更多操作\"><div id=\"items\" role=\"menu\"></div><button id=\"cancel\" type=\"button\">取消</button></section>`;\n        this.#items = layerRoot.querySelector(\"#items\");\n        this.#button.onclick = () => (this.#layer.hidden ? this.open() : this.close());\n        layerRoot.querySelector(\"#backdrop\").onclick = () => {\n            this.close();\n            this.#button.focus();\n        };\n        layerRoot.querySelector(\"#cancel\").onclick = () => {\n            this.close();\n            this.#button.focus();\n        };\n        this.#items.onkeydown = event => {\n            const items = [...this.#items.children];\n            const index = items.indexOf(layerRoot.activeElement);\n            const offsets = { ArrowDown: 1, ArrowUp: -1 };\n            if (event.key in offsets) {\n                event.preventDefault();\n                items[(index + offsets[event.key] + items.length) % items.length].focus();\n            }\n        };\n        document.body.append(this.#layer);\n        document.addEventListener(\"keydown\", this.#key);\n        this.update([]);\n    }\n\n    /**\n     * 同步可用操作和忙碌状态，不重建菜单触发按钮。\n     * Update actions and busy state without replacing the trigger button.\n     * @param {Array<{id: string, label: string, destructive?: boolean}>} items 操作列表 / Actions.\n     * @param {boolean} [disabled] 是否忙碌 / Whether operations are busy.\n     * @returns {void} 无返回值 / No return value.\n     */\n    update(items, disabled = false) {\n        this.close();\n        this.#disabled = disabled || items.length === 0;\n        this.#button.disabled = this.#disabled;\n        this.#items.replaceChildren(\n            ...items.map(item => {\n                const button = this.#document.createElement(\"button\");\n                button.type = \"button\";\n                button.setAttribute(\"role\", \"menuitem\");\n                button.textContent = item.label;\n                button.toggleAttribute(\"data-danger\", Boolean(item.destructive));\n                button.onclick = () => {\n                    this.close();\n                    this.#select(item.id);\n                };\n                return button;\n            }),\n        );\n    }\n\n    /**\n     * 打开当前操作菜单。\n     * Open the current action sheet.\n     * @returns {void} 无返回值 / No return value.\n     */\n    open() {\n        if (this.#disabled) return;\n        const style = getComputedStyle(this.element);\n        for (const property of [\"--pp-text\", \"--pp-surface\", \"--pp-border\", \"--pp-accent\", \"--pp-danger\"]) {\n            const value = style.getPropertyValue(property);\n            if (value) this.#layer.style.setProperty(property, value);\n        }\n        this.#layer.hidden = false;\n        this.#button.setAttribute(\"aria-expanded\", \"true\");\n        this.#items.firstElementChild.focus();\n    }\n\n    /**\n     * 关闭菜单。\n     * Close the menu.\n     * @returns {void} 无返回值 / No return value.\n     */\n    close() {\n        this.#layer.hidden = true;\n        this.#button.setAttribute(\"aria-expanded\", \"false\");\n    }\n\n    /**\n     * 移除监听器与节点。\n     * Remove listeners and elements.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#document.removeEventListener(\"keydown\", this.#key);\n        this.#layer.remove();\n        this.element.remove();\n    }\n}\n\n/**\n * 管理单模块页面的 API 请求、值快照和会话终止。\n * Manage API requests, value snapshots, and session termination for one module page.\n */\nclass PreferencesClient {\n    #module;\n    #definition;\n    #request;\n    #notify;\n    #timeout;\n    #session = new AbortController();\n    #values = {};\n    #saving = false;\n\n    /**\n     * 创建从 BoxJS 定义读取和持久化设置的页面客户端。\n     * Create a page client that reads and persists settings from a BoxJS definition.\n     * @param {import(\"./client.mjs\").PreferencesClientOptions} options 字段定义、请求与通知 / Field definition, requests, and notifications.\n     */\n    constructor({ definition, fetch: request = globalThis.fetch.bind(globalThis), notify = () => {}, timeout = 10000 }) {\n        this.#module = definition.module;\n        this.#definition = definition;\n        this.#request = request;\n        this.#notify = notify;\n        this.#timeout = timeout;\n    }\n\n    /**\n     * 读取一次 Settings 子树并建立页面值快照。\n     * Read the Settings subtree once and establish the page value snapshot.\n     * @returns {Promise<import(\"./client.mjs\").ModuleSnapshot>} 页面快照 / Page snapshot.\n     */\n    async open() {\n        let subtree = await this.readSettings();\n        if (subtree === undefined) subtree = {};\n        if (typeof subtree === \"string\") subtree = JSON.parse(subtree);\n        if (!subtree || typeof subtree !== \"object\" || Array.isArray(subtree)) throw new TypeError(\"Expected a settings subtree object\");\n        const values = {};\n        for (const field of this.#definition.fields) {\n            const stored = field.key\n                .split(\".\")\n                .slice(this.#definition.settingsPath.length)\n                .reduce((parent, part) => Object(parent)[part], subtree);\n            const value = normalizeStoredValue(field, stored === undefined ? field.defaultValue : stored);\n            if (value === undefined) continue;\n            if (!validValue(field, value)) throw new TypeError(`Invalid stored value: ${field.key}`);\n            values[field.key] = value;\n        }\n        this.#values = values;\n        return this.snapshot();\n    }\n\n    /**\n     * 获取当前字段定义和值的深拷贝，不发起网络请求。\n     * Return a deep copy of the current field definition and values without a network request.\n     * @returns {import(\"./client.mjs\").ModuleSnapshot} 会话快照 / Session snapshot.\n     */\n    snapshot() {\n        return structuredClone({ definition: this.#definition, values: this.#values });\n    }\n\n    /**\n     * 读取 Settings 子树。\n     * Read the Settings subtree.\n     * @returns {Promise<unknown>} Settings 内容或 undefined / Settings content or undefined.\n     */\n    async readSettings() {\n        const response = await this.#send(\"get\", `@${this.#definition.storageKey}.${this.#definition.settingsPath.join(\".\")}`);\n        return response.status === 404 ? undefined : response.json();\n    }\n\n    /**\n     * 读取 Caches 子树。\n     * Read the Caches subtree.\n     * @returns {Promise<unknown>} Caches 内容或 undefined / Caches content or undefined.\n     */\n    async readCaches() {\n        const response = await this.#send(\"get\", `@${this.#definition.storageKey}.${this.#module}.Caches`);\n        return response.status === 404 ? undefined : response.json();\n    }\n\n    /**\n     * 删除当前模块的 Caches 子树。\n     * Delete the current module Caches subtree.\n     * @returns {Promise<void>} 操作完成 / Operation completion.\n     */\n    clearCaches() {\n        return this.#change(\"delete\", `${this.#module}.Caches`, undefined, \"clearCaches\");\n    }\n\n    /**\n     * 删除当前模块数据并恢复页面默认值。\n     * Delete current module data and restore page defaults.\n     * @returns {Promise<void>} 操作完成 / Operation completion.\n     */\n    reset() {\n        return this.#change(\"delete\", this.#module, undefined, \"reset\");\n    }\n\n    /**\n     * 终止当前页面仍在进行的请求。\n     * Abort requests still owned by the current page.\n     * @returns {void} 无返回值 / No return value.\n     */\n    leave() {\n        this.#session.abort();\n    }\n\n    /**\n     * 写入单个字段。\n     * Write one field.\n     * @param {string} key 字段路径 / Field path.\n     * @param {unknown} value 已校验值 / Validated value.\n     * @returns {Promise<void>} 操作完成 / Operation completion.\n     */\n    set(key, value) {\n        return this.#change(\"set\", key, value, \"write\");\n    }\n\n    /**\n     * 删除单个字段覆盖值。\n     * Delete one field override.\n     * @param {string} key 字段路径 / Field path.\n     * @returns {Promise<void>} 操作完成 / Operation completion.\n     */\n    remove(key) {\n        return this.#change(\"delete\", key, undefined, \"delete\");\n    }\n\n    /**\n     * 向固定存储 API 发送完整路径的 form 动作。\n     * Send a complete-path form action to the fixed storage API.\n     * @param {\"get\" | \"set\" | \"delete\"} action 存储动作 / Storage action.\n     * @param {string} path 完整 @root.path / Complete @root.path.\n     * @param {unknown} [value] set 写入值 / Value written by set.\n     * @returns {Promise<Response>} 原始响应 / Raw response.\n     */\n    async #send(action, path, value) {\n        const controller = new AbortController();\n        const abort = () => controller.abort();\n        if (this.#session.signal.aborted) abort();\n        this.#session.signal.addEventListener(\"abort\", abort, { once: true });\n        const timer = setTimeout(abort, this.#timeout);\n        try {\n            const response = await this.#request(`/api/${action}`, {\n                method: \"POST\",\n                credentials: \"omit\",\n                cache: \"no-store\",\n                signal: controller.signal,\n                headers: { \"Content-Type\": \"application/x-www-form-urlencoded\" },\n                body: new URLSearchParams([[path, action === \"set\" ? JSON.stringify(value) : \"\"]]).toString(),\n            });\n            if (response.status !== 200 && !(action === \"get\" && response.status === 404)) throw new Error(`HTTP ${response.status}`);\n            return response;\n        } finally {\n            clearTimeout(timer);\n            this.#session.signal.removeEventListener(\"abort\", abort);\n        }\n    }\n\n    /**\n     * 执行写入动作；成功后只更新当前页面值。\n     * Execute a mutation and update only the current page values after success.\n     * @param {\"set\" | \"delete\"} action API 动作 / API action.\n     * @param {string} key 不含存储根的路径 / Path without the storage root.\n     * @param {unknown} value set 写入值 / Value written by set.\n     * @param {\"write\" | \"delete\" | \"clearCaches\" | \"reset\"} operation 通知操作 / Notification operation.\n     * @returns {Promise<void>} 操作完成 / Operation completion.\n     */\n    async #change(action, key, value, operation) {\n        if (this.#saving) throw new Error(\"A settings write is already in progress\");\n        this.#saving = true;\n        try {\n            let field;\n            if (operation === \"write\" || operation === \"delete\") {\n                field = this.#definition.fields.find(candidate => candidate.key === key);\n                if (!field || (operation === \"write\" && !validValue(field, value))) throw new TypeError(\"Invalid setting value\");\n            }\n            await this.#send(action, `@${this.#definition.storageKey}.${key}`, value);\n            switch (operation) {\n                case \"write\":\n                    this.#values[key] = structuredClone(value);\n                    break;\n                case \"delete\": {\n                    delete this.#values[key];\n                    if (Object.hasOwn(field, \"defaultValue\")) this.#values[key] = structuredClone(field.defaultValue);\n                    break;\n                }\n                case \"clearCaches\":\n                    break;\n                case \"reset\":\n                    for (const field of this.#definition.fields) {\n                        delete this.#values[field.key];\n                        if (Object.hasOwn(field, \"defaultValue\")) this.#values[field.key] = structuredClone(field.defaultValue);\n                    }\n                    break;\n            }\n            this.#notify({ kind: \"success\", operation, module: this.#module, key });\n        } catch (error) {\n            this.#notify({ kind: \"error\", operation, module: this.#module, key, message: error.message });\n            throw error;\n        } finally {\n            this.#saving = false;\n        }\n    }\n}\n\n/**\n * 同一文档内的主页/子页导航；iframe 各自的实例通过浏览器联合历史协作。\n * Navigate home/detail views within a document; iframe instances cooperate through joint browser history.\n */\nclass Navigation extends EventTarget {\n    #container;\n    #home;\n    #create;\n    #window;\n    #key = null;\n    #view;\n    #retiring;\n    #controller;\n    #animation;\n    #scroll = new WeakMap();\n    #onHistory = () => this.#route();\n    #onPageShow = event => {\n        if (event.persisted) this.#route(true);\n    };\n\n    /**\n     * 根视图始终保留；工厂按需提供子页，可用 signal 取消离开后的异步加载。\n     * Retain the home view and create details on demand; signal cancels async work after departure.\n     * @param {HTMLElement} container 由调用方布局的页面容器 / Caller-styled view container.\n     * @param {HTMLElement} home 已创建的主页节点 / Existing home view.\n     * @param {(key: string, signal: AbortSignal) => HTMLElement | undefined} create 子页工厂；未知路径返回 undefined / Detail factory; undefined for unknown routes.\n     */\n    constructor(container, home, create) {\n        super();\n        this.#container = container;\n        this.#home = home;\n        this.#create = create;\n        this.#window = container.ownerDocument.defaultView;\n        container.replaceChildren(home);\n        this.#window.addEventListener(\"popstate\", this.#onHistory);\n        this.#window.addEventListener(\"hashchange\", this.#onHistory);\n        this.#window.addEventListener(\"pageshow\", this.#onPageShow);\n        this.#route();\n    }\n\n    /**\n     * 当前子页键；空字符串表示主页。\n     * Current detail key; empty means home.\n     */\n    get current() {\n        return this.#key;\n    }\n\n    /**\n     * 是否可以返回上一级或先前文档。\n     * Whether a parent view or previous document is available.\n     */\n    get canGoBack() {\n        return Boolean(this.#key) || this.#window.history.length > 1;\n    }\n\n    /**\n     * 加入子页历史；使用文档自身 URL，避免 srcdoc 按宿主 base URL 跳转。\n     * Push a detail using the document URL, avoiding srcdoc navigation against the host base URL.\n     * @param {string} key 子页键 / Detail key.\n     * @returns {void} 无返回值 / No return value.\n     */\n    open(key) {\n        if (key === this.#key) return;\n        const url = new URL(this.#window.location.href);\n        url.hash = encodeURIComponent(key);\n        this.#window.history.pushState({ ...this.#window.history.state, preferencePanesRoute: key }, \"\", url.href);\n        this.#route();\n    }\n\n    /**\n     * 沿浏览器联合历史返回，根页可退回宿主或上个文档。\n     * Go back through joint history, including a host or previous document from home.\n     * @returns {void} 无返回值 / No return value.\n     */\n    back() {\n        if (this.canGoBack) this.#window.history.back();\n    }\n\n    /**\n     * 解析 URL 并统一处理页面切换、加载取消与动画结束后的释放。\n     * Resolve the URL and coordinate transitions, cancellation and release after animation.\n     * @param {boolean} [reload] 从页面缓存恢复时重新创建子页 / Recreate a detail after bfcache restoration.\n     * @returns {void} 无返回值 / No return value.\n     */\n    #route(reload = false) {\n        const url = new URL(this.#window.location.href);\n        let key;\n        try {\n            key = decodeURIComponent(url.hash.slice(1));\n        } catch (error) {\n            if (!(error instanceof URIError)) throw error;\n            key = \"\";\n        }\n        if (!reload && key === this.#key) return;\n        this.#controller?.abort();\n        this.#controller = new AbortController();\n        const next = key ? this.#create(key, this.#controller.signal) : undefined;\n        if (!next) key = \"\";\n        const history = this.#window.history;\n        // 直接打开子页时建立一次主页历史；刷新不重复堆叠。\n        // Seed home history once for direct details, without stacking entries on reload.\n        if (url.hash && history.state?.preferencePanesRoute !== key) {\n            url.hash = \"\";\n            history.replaceState({ ...history.state, preferencePanesRoute: \"\" }, \"\", url.href);\n            if (key) {\n                url.hash = encodeURIComponent(key);\n                history.pushState({ ...history.state, preferencePanesRoute: key }, \"\", url.href);\n            }\n        }\n        const previous = this.#view;\n        const position = previous ? this.#window.getComputedStyle(previous).transform : \"none\";\n        this.#animation?.cancel();\n        this.#retiring?.remove();\n        this.#retiring = previous;\n        if (previous) {\n            this.#scroll.set(previous, previous.scrollTop);\n            previous.inert = true;\n        }\n        this.#key = key;\n        this.#view = next;\n        this.#home.inert = Boolean(next);\n        if (next) {\n            next.inert = false;\n            this.#container.append(next);\n            next.scrollTop = this.#scroll.get(next) ?? 0;\n        }\n        const moving = next ?? previous;\n        if (moving) {\n            const animation = moving.animate([{ transform: next ? \"translateX(100%)\" : position }, { transform: next ? \"translateX(0)\" : \"translateX(100%)\" }], { duration: this.#window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches ? 0 : 280, easing: \"cubic-bezier(.22,.61,.36,1)\", fill: \"forwards\" });\n            this.#animation = animation;\n            animation.onfinish = () => {\n                if (this.#animation !== animation) return;\n                this.#retiring?.remove();\n                this.#retiring = undefined;\n                animation.cancel();\n                this.#animation = undefined;\n            };\n        }\n        this.dispatchEvent(new Event(\"change\"));\n    }\n\n    /**\n     * 释放监听器、加载、动画和节点；调用方可重新创建导航。\n     * Release listeners, loads, animations and nodes so callers can recreate navigation.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#window.removeEventListener(\"popstate\", this.#onHistory);\n        this.#window.removeEventListener(\"hashchange\", this.#onHistory);\n        this.#window.removeEventListener(\"pageshow\", this.#onPageShow);\n        this.#controller?.abort();\n        this.#animation?.cancel();\n        this.#retiring?.remove();\n        this.#view?.remove();\n        this.#home.remove();\n    }\n}\n\n/**\n * 管理模块表单、导航、操作队列和短暂通知。\n * Manage the module form, navigation, operation queue, and transient notifications.\n */\nclass PreferencesPanel {\n    #release;\n\n    /**\n     * 挂载 BoxJS 定义对应的模块表单。\n     * Mount the module form described by a BoxJS definition.\n     * @param {HTMLElement} root 包内挂载元素 / Internal mount element.\n     * @param {import(\"../index.js\").ModuleDefinition} definition 已规范化字段定义 / Normalized field definition.\n     */\n    constructor(root, definition) {\n        this.#release = this.#mount(root, definition);\n    }\n\n    /**\n     * 建立面板 DOM、交互和会话，并返回其释放操作。\n     * Build panel DOM, interactions, and session, then return its release operation.\n     * @param {HTMLElement} root 包内挂载元素 / Internal mount element.\n     * @param {import(\"../index.js\").ModuleDefinition} definition 已规范化字段定义 / Normalized field definition.\n     * @returns {() => void} 释放操作 / Release operation.\n     */\n    #mount(root, definition) {\n        const title = definition.metadata?.name ?? definition.module;\n        const document = root.ownerDocument;\n        const window = document.defaultView;\n        const frame = window.frameElement?.dataset.preferencePanes ? window.frameElement : undefined;\n        const shell = element(\"div\", \"pp-panel\");\n        shell.dataset.module = definition.module;\n        const handlers = new Map();\n        const menuItems = [\n            { id: \"viewSettings\", label: \"查看设置\" },\n            { id: \"viewCaches\", label: \"查看缓存\" },\n            { id: \"clearCaches\", label: \"清空缓存\", destructive: true },\n            { id: \"reset\", label: \"重置设置\", destructive: true },\n        ];\n        const viewport = element(\"div\", \"pp-viewport\");\n        let back, heading, menu;\n        if (frame) shell.append(viewport);\n        else {\n            const header = element(\"header\", \"pp-header\");\n            back = element(\"button\", \"pp-back\", \"‹\");\n            back.setAttribute(\"aria-label\", \"返回\");\n            back.type = \"button\";\n            heading = element(\"h1\", \"pp-title\", title);\n            menu = new ActionMenu(id => runAction(id));\n            const trailing = element(\"span\", \"pp-nav-spacer\");\n            trailing.append(menu.element);\n            header.append(back, heading, trailing);\n            shell.append(header, viewport);\n        }\n        let toast;\n        root.append(shell);\n        // 嵌入模式向宿主发布导航状态，宿主不读取或修改模块内部 DOM。\n        // Embedded mode publishes navigation state without host reads or mutations of the module DOM.\n        const publishNavigation = () => {\n            const actions = handlers.size ? menuItems : [];\n            if (frame)\n                frame.dispatchEvent(\n                    new frame.ownerDocument.defaultView.CustomEvent(\"preferencepanes:change\", {\n                        detail: { title: currentTitle, module: definition.module, busy: saving, canGoBack, actions },\n                    }),\n                );\n            else {\n                heading.textContent = currentTitle;\n                back.disabled = !canGoBack;\n                menu.update(actions, saving);\n            }\n        };\n        const onAction = event => {\n            if (!saving && handlers.has(event.detail)) runAction(event.detail);\n        };\n        frame?.addEventListener(\"preferencepanes:action\", onAction);\n        let timer,\n            navigation,\n            generation = 0,\n            active = null,\n            saving = false,\n            destroyed = false,\n            currentTitle = title,\n            canGoBack = window.history.length > 1;\n        /**\n         * 展示短暂通知，不刷新设置数据。\n         * Display a transient notification without refreshing settings.\n         * @param {{kind: \"success\" | \"error\", operation?: \"write\" | \"delete\" | \"clearCaches\" | \"reset\", message?: string}} event 操作结果 / Operation result.\n         * @returns {void} 无返回值 / No return value.\n         */\n        const notify = event => {\n            if (destroyed) return;\n            let message;\n            switch (true) {\n                case event.kind === \"error\":\n                    message = `操作失败：${event.message}`;\n                    break;\n                case event.operation === \"delete\":\n                    message = \"删除成功\";\n                    break;\n                case event.operation === \"clearCaches\":\n                    message = \"Caches 已清空\";\n                    break;\n                case event.operation === \"reset\":\n                    message = \"设置已重置\";\n                    break;\n                default:\n                    message = \"修改成功\";\n                    break;\n            }\n            // 宿主接管时不创建网页 Toast，也不运行其计时器。\n            // A host-owned notice creates no web Toast and starts no local timer.\n            if (frame && !frame.dispatchEvent(new frame.ownerDocument.defaultView.CustomEvent(\"preferencepanes:notice\", { cancelable: true, detail: { kind: event.kind, message } }))) return;\n            if (!toast) {\n                toast = element(\"div\", \"pp-toast\");\n                toast.setAttribute(\"role\", \"status\");\n                shell.append(toast);\n            }\n            toast.textContent = message;\n            toast.dataset.kind = event.kind;\n            toast.hidden = false;\n            clearTimeout(timer);\n            timer = setTimeout(() => {\n                toast.hidden = true;\n            }, 2400);\n        };\n        const client = new PreferencesClient({ definition, notify });\n        /**\n         * 两种菜单入口共用异步错误处理，包含宿主确认框错误。\n         * Share async error handling between both menus, including host-dialog errors.\n         * @param {string} id 操作标识 / Action identifier.\n         * @returns {Promise<void>} 操作已处理 / Action handled.\n         */\n        async function runAction(id) {\n            try {\n                await handlers.get(id)();\n            } catch (error) {\n                notify({ kind: \"error\", message: error.message });\n            }\n        }\n        /**\n         * 打开模块并忽略已过期的异步结果。\n         * Open a module and ignore stale asynchronous results.\n         * @param {string} module 模块标识 / Module identifier.\n         * @returns {Promise<void>} 视图加载完成，失败显示错误视图 / View load completion; failures display an error view.\n         */\n        async function open(module) {\n            const version = ++generation;\n            active = module;\n            currentTitle = module;\n            canGoBack = window.history.length > 1;\n            publishNavigation();\n            viewport.replaceChildren(statusView(\"读取设置…\"));\n            try {\n                await client.open();\n                if (version === generation) controls();\n            } catch (error) {\n                if (version !== generation) return;\n                viewport.replaceChildren(statusView(`加载失败：${error.message}`, () => open(module)));\n                publishNavigation();\n            }\n        }\n        /**\n         * 从会话快照创建控件与操作按钮，不重新读取网络配置。\n         * Build controls and actions from the session snapshot without fetching config again.\n         * @returns {void} 无返回值 / No return value.\n         */\n        function controls() {\n            const { definition, values } = client.snapshot();\n            currentTitle = definition.metadata?.name || active;\n            const view = element(\"section\", \"pp-fields\");\n            /**\n             * 挂载后执行的多行高度更新\n             * Textarea sizing callbacks run after mounting.\n             * @type {Array<() => void>}\n             */\n            const growingInputs = [];\n            const editors = new Map();\n            const summaries = [];\n            const groups = new Map();\n            let queue = Promise.resolve(),\n                pendingWrites = 0;\n            /**\n             * 导航组件处理页面切换，表单只更新当前标题与返回按钮。\n             * Let navigation own transitions; the form only updates the title and back button.\n             * @returns {void} 无返回值 / No return value.\n             */\n            const updateNavigation = () => {\n                const editor = editors.get(navigation.current);\n                currentTitle = editor?.title ?? definition.metadata?.name ?? active;\n                canGoBack = !saving && navigation.canGoBack;\n                publishNavigation();\n            };\n            /**\n             * 串行执行模块操作，保持输入可编辑。\n             * Serialize module actions while keeping inputs editable.\n             * @param {() => Promise<void>} action 请求或写入 / Request or mutation.\n             * @param {() => void} success 成功后的局部更新 / Local update after success.\n             * @param {() => void} [failure] 失败后恢复当前输入 / Restore the current input on failure.\n             * @returns {Promise<void>} 操作完成 / Operation completion.\n             */\n            function perform(action, success, failure = () => {}) {\n                pendingWrites++;\n                saving = true;\n                canGoBack = false;\n                publishNavigation();\n                queue = queue\n                    .then(action)\n                    .then(() => {\n                        if (!destroyed) success();\n                    })\n                    .catch(() => {\n                        /* 请求层已通知错误。\n                         * The request layer has already reported the error. */\n                        if (!destroyed) failure();\n                    })\n                    .finally(() => {\n                        pendingWrites--;\n                        saving = pendingWrites > 0;\n                        if (destroyed && !saving) client.leave();\n                        canGoBack = !saving && navigation.canGoBack;\n                        publishNavigation();\n                    });\n                return queue;\n            }\n            const metadata = definition.metadata;\n            if (metadata) {\n                const info = element(\"div\", \"pp-module-info\");\n                const details = element(\"div\", \"pp-module-details\");\n                for (const description of [metadata.author, metadata.desc ?? metadata.description, ...(metadata.descs ?? [])]) if (description) details.append(element(\"p\", \"pp-description\", description));\n                if (metadata.repo) {\n                    const link = element(\"a\", \"pp-module-source\", \"项目主页\");\n                    link.href = resourceURL(metadata.repo);\n                    link.target = \"_blank\";\n                    link.rel = \"noopener noreferrer\";\n                    details.append(link);\n                }\n                info.append(details);\n                view.append(info);\n            }\n            for (const field of definition.fields) {\n                const match = /^\\[([^\\]]+)\\]\\s*(.*)$/.exec(field.name);\n                const group = match?.[1] ?? \"通用\";\n                if (!groups.has(group)) {\n                    const section = element(\"section\", \"pp-group\");\n                    const rows = element(\"div\", \"pp-rows\");\n                    section.append(element(\"h2\", \"pp-group-title\", group), rows);\n                    groups.set(group, rows);\n                    view.append(section);\n                }\n                const row = settingRow(\"div\");\n                row.classList.add(\"pp-field\");\n                const label = element(\"div\", \"pp-label\");\n                label.append(element(\"span\", \"pp-field-name\", match?.[2] ?? field.name));\n                if (field.description) label.append(element(\"span\", \"pp-field-description\", field.description));\n                row.append(label);\n                const value = values[field.key];\n                /**\n                 * 读取尚未保存的输入\n                 * Read the unsaved input.\n                 * @type {() => unknown}\n                 */\n                let read;\n                /**\n                 * 更新当前控件\n                 * Update the current control.\n                 * @type {(value: unknown) => void}\n                 */\n                let write;\n                let inputContainer = row;\n                let eventName = \"change\";\n                switch (true) {\n                    case Boolean(field.options) && field.type !== \"array\": {\n                        const select = element(\"select\", \"\");\n                        select.setAttribute(\"aria-label\", field.name);\n                        field.options.forEach((option, index) => {\n                            const item = element(\"option\", \"\", option.label);\n                            item.value = String(index);\n                            select.append(item);\n                        });\n                        write = value => {\n                            select.selectedIndex = field.options.findIndex(option => option.key === value);\n                        };\n                        row.append(fieldControl(select));\n                        read = () => field.options[select.selectedIndex]?.key;\n                        break;\n                    }\n                    case field.type === \"array\" && Boolean(field.options): {\n                        const page = element(\"section\", \"pp-choice-page\");\n                        if (field.description) page.append(element(\"p\", \"pp-description\", field.description));\n                        const choices = element(\"div\", \"pp-rows\");\n                        page.append(choices);\n                        inputContainer = choices;\n                        editors.set(field.key, { node: page, title: match?.[2] ?? field.name });\n                        const summary = element(\"span\", \"pp-summary\");\n                        const link = element(\"button\", \"pp-choice-link\");\n                        link.type = \"button\";\n                        link.setAttribute(\"aria-label\", field.name);\n                        link.append(summary, element(\"span\", \"pp-chevron\", \"›\"));\n                        row.append(link);\n                        const refresh = () => {\n                            const value = client.snapshot().values[field.key];\n                            summary.textContent =\n                                field.options\n                                    .filter(option => Array.isArray(value) && value.includes(option.key))\n                                    .map(option => option.label)\n                                    .join(\"、\") || \"未选择\";\n                        };\n                        summaries.push(refresh);\n                        refresh();\n                        link.onclick = () => navigation.open(field.key);\n                        row.addEventListener(\"click\", event => {\n                            if (!link.contains(event.target)) link.click();\n                        });\n                        const inputs = field.options.map(option => {\n                            const label = settingRow(\"label\");\n                            label.classList.add(\"pp-choice\");\n                            label.textContent = option.label;\n                            const input = element(\"input\", \"\");\n                            input.type = \"checkbox\";\n                            input.setAttribute(\"aria-label\", option.label);\n                            label.append(input);\n                            choices.append(label);\n                            return { input, key: option.key };\n                        });\n                        read = () => inputs.filter(option => option.input.checked).map(option => option.key);\n                        write = value => {\n                            for (const option of inputs) option.input.checked = Array.isArray(value) && value.includes(option.key);\n                        };\n                        break;\n                    }\n                    case field.type === \"boolean\": {\n                        const toggle = element(\"input\", \"pp-switch\");\n                        toggle.type = \"checkbox\";\n                        toggle.setAttribute(\"switch\", \"\");\n                        toggle.setAttribute(\"role\", \"switch\");\n                        toggle.setAttribute(\"aria-label\", field.name);\n                        write = value => {\n                            toggle.checked = value === true;\n                        };\n                        read = () => toggle.checked;\n                        row.append(toggle);\n                        break;\n                    }\n                    default: {\n                        const multiline = field.control === \"textarea\" || field.type === \"array\";\n                        const input = element(multiline ? \"textarea\" : \"input\", \"\");\n                        if (multiline) row.classList.add(\"pp-multiline\");\n                        input.setAttribute(\"aria-label\", field.name);\n                        if (field.placeholder) input.placeholder = field.placeholder;\n                        if (multiline && field.rows) input.rows = field.rows;\n                        /**\n                         * 在挂载后根据内容调整高度，同时保留基础行数。\n                         * Size mounted textareas to their contents while retaining baseline rows.\n                         * @returns {void} 无返回值 / No return value.\n                         */\n                        const grow = () => {\n                            if (!multiline || !field.autoGrow || !input.isConnected) return;\n                            input.style.height = \"auto\";\n                            const baseline = input.getBoundingClientRect().height;\n                            const style = window.getComputedStyle(input);\n                            const borders = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);\n                            input.style.height = `${Math.max(baseline, input.scrollHeight + borders)}px`;\n                        };\n                        if (multiline && field.autoGrow) {\n                            input.addEventListener(\"input\", grow);\n                            growingInputs.push(grow);\n                        }\n                        eventName = \"input\";\n                        if (!multiline) input.type = field.type === \"number\" ? \"number\" : \"text\";\n                        write = value => {\n                            input.value = field.type === \"array\" ? JSON.stringify(value ?? []) : (value ?? \"\");\n                            grow();\n                        };\n                        read = () => {\n                            switch (field.type) {\n                                case \"array\":\n                                    return JSON.parse(input.value);\n                                case \"number\":\n                                    return input.value === \"\" ? Number.NaN : Number(input.value);\n                                default:\n                                    return input.value;\n                            }\n                        };\n                        row.append(fieldControl(input));\n                        break;\n                    }\n                }\n                write(value);\n                let inputVersion = 0;\n                inputContainer.addEventListener(eventName, event => {\n                    if (event.isComposing) return;\n                    const version = ++inputVersion;\n                    let value;\n                    try {\n                        value = read();\n                    } catch (error) {\n                        notify({ kind: \"error\", message: error.message });\n                        return;\n                    }\n                    const restore = () => {\n                        if (version === inputVersion) write(client.snapshot().values[field.key]);\n                    };\n                    perform(\n                        () => {\n                            if (!validValue(field, value)) {\n                                const error = new TypeError(\"Invalid setting value\");\n                                notify({ kind: \"error\", operation: \"write\", key: field.key, message: error.message });\n                                throw error;\n                            }\n                            return client.set(field.key, value);\n                        },\n                        () => {\n                            for (const refresh of summaries) refresh();\n                        },\n                        restore,\n                    );\n                });\n                if (eventName === \"input\") inputContainer.addEventListener(\"compositionend\", event => event.target.dispatchEvent(new window.Event(\"input\", { bubbles: true })));\n                groups.get(group).append(row);\n            }\n            const settingsPage = element(\"section\", \"pp-settings-page\");\n            const settingsOutput = element(\"pre\", \"pp-cache\");\n            settingsOutput.setAttribute(\"aria-label\", \"Settings 内容\");\n            settingsPage.append(settingsOutput);\n            editors.set(\"$settings\", { node: settingsPage, title: \"设置\" });\n            handlers.set(\"viewSettings\", () => {\n                if (saving) return;\n                let value;\n                return perform(\n                    async () => {\n                        try {\n                            value = await client.readSettings();\n                        } catch (error) {\n                            notify({ kind: \"error\", message: error.message });\n                            throw error;\n                        }\n                    },\n                    () => {\n                        settingsOutput.textContent = value === undefined ? \"暂无设置\" : JSON.stringify(value, null, 2);\n                        navigation.open(\"$settings\");\n                    },\n                );\n            });\n            const cachePage = element(\"section\", \"pp-cache-page\");\n            const output = element(\"pre\", \"pp-cache\");\n            output.textContent = \"暂无缓存\";\n            output.setAttribute(\"aria-label\", \"Caches 内容\");\n            cachePage.append(output);\n            editors.set(\"$caches\", { node: cachePage, title: \"缓存\" });\n            handlers.set(\"viewCaches\", () => {\n                if (saving) return;\n                let value;\n                return perform(\n                    async () => {\n                        try {\n                            value = await client.readCaches();\n                        } catch (error) {\n                            notify({ kind: \"error\", message: error.message });\n                            throw error;\n                        }\n                    },\n                    () => {\n                        output.textContent = value === undefined ? \"暂无缓存\" : JSON.stringify(value, null, 2);\n                        navigation.open(\"$caches\");\n                    },\n                );\n            });\n            handlers.set(\"clearCaches\", async () => {\n                if (saving) return;\n                if (!(await requestConfirmation(window, `清空 ${active} 的全部 Caches？`)) || destroyed || saving) return;\n                return perform(\n                    () => client.clearCaches(),\n                    () => {\n                        output.textContent = \"暂无缓存\";\n                    },\n                );\n            });\n            handlers.set(\"reset\", async () => {\n                if (saving) return;\n                if (!(await requestConfirmation(window, `重置 ${active} 的设置？这将删除该模块的 Settings、Caches 和其它持久化数据。`)) || destroyed || saving) return;\n                return perform(() => client.reset(), controls);\n            });\n            navigation?.destroy();\n            navigation = new Navigation(viewport, view, key => editors.get(key)?.node);\n            navigation.addEventListener(\"change\", updateNavigation);\n            for (const grow of growingInputs) grow();\n            updateNavigation();\n        }\n        /**\n         * 已加载的表单交由导航组件返回；加载阶段可以返回先前文档。\n         * Loaded forms delegate back to navigation; loading views can return to the previous document.\n         * @returns {void} 无返回值 / No return value.\n         */\n        if (back)\n            back.onclick = () => {\n                if (saving) return;\n                if (navigation) navigation.back();\n                else window.history.back();\n            };\n        open(definition.module);\n        return () => {\n            destroyed = true;\n            menu?.destroy();\n            frame?.removeEventListener(\"preferencepanes:action\", onAction);\n            navigation?.destroy();\n            generation++;\n            if (active && !saving) client.leave();\n            clearTimeout(timer);\n            shell.remove();\n        };\n    }\n\n    /**\n     * 移除监听器、定时器、会话和挂载内容。\n     * Remove listeners, timers, session, and mounted content.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#release();\n    }\n}\n\nvar defaults = \"/* 通用默认样式只使用 pp 命名空间；项目可通过 CSS 输入覆盖变量和组件。\\n * Generic defaults use only the pp namespace; projects may override variables and components through CSS input. */\\n.pp-panel {\\n    --pp-text: #18191c;\\n    --pp-background: #f6f7f8;\\n    --pp-surface: #fff;\\n    --pp-field: #f1f2f3;\\n    --pp-border: #e3e5e7;\\n    --pp-muted: #797f87;\\n    --pp-accent: #1677ff;\\n    font:\\n        15px / 1.5 -apple-system,\\n        BlinkMacSystemFont,\\n        \\\"Segoe UI\\\",\\n        sans-serif;\\n    color: var(--pp-text);\\n    background: var(--pp-background);\\n    position: relative;\\n    display: flex;\\n    flex-direction: column;\\n    width: 100%;\\n    max-width: 100vw;\\n    min-width: 0;\\n    height: 100vh;\\n    overflow: hidden;\\n}\\n\\n:root[data-theme=\\\"dark\\\"] .pp-panel {\\n    --pp-text: #f1f2f3;\\n    --pp-background: #0d0e0f;\\n    --pp-surface: #18191c;\\n    --pp-field: #2f3238;\\n    --pp-border: #2f3238;\\n    --pp-muted: #9499a0;\\n}\\n.pp-panel * {\\n    box-sizing: border-box;\\n    letter-spacing: 0;\\n}\\n.pp-header {\\n    flex: none;\\n    height: calc(52px + env(safe-area-inset-top));\\n    padding: env(safe-area-inset-top) 12px 0;\\n    display: flex;\\n    align-items: center;\\n    background: var(--pp-surface);\\n    border-bottom: 1px solid var(--pp-border);\\n    position: relative;\\n    z-index: 2;\\n}\\n.pp-title {\\n    flex: 1;\\n    text-align: center;\\n    font-size: 17px;\\n    font-weight: 500;\\n    margin: 0;\\n    min-width: 0;\\n    overflow-wrap: anywhere;\\n}\\n.pp-nav-spacer {\\n    width: 44px;\\n    flex: none;\\n}\\n.pp-panel button {\\n    font: inherit;\\n    cursor: pointer;\\n    border: 0;\\n    background: none;\\n    color: inherit;\\n}\\n.pp-panel .pp-back {\\n    width: 44px;\\n    height: 44px;\\n    flex: none;\\n    font-size: 34px;\\n    line-height: 32px;\\n    padding: 0;\\n}\\n.pp-panel button:disabled {\\n    opacity: 0.5;\\n    cursor: wait;\\n}\\n.pp-viewport {\\n    position: relative;\\n    flex: 1;\\n    min-width: 0;\\n    min-height: 0;\\n    overflow: hidden;\\n}\\n@supports (height: 100dvh) {\\n    .pp-panel {\\n        height: 100dvh;\\n    }\\n}\\n.pp-fields,\\n.pp-choice-page,\\n.pp-settings-page,\\n.pp-cache-page {\\n    position: absolute;\\n    inset: 0;\\n    min-width: 0;\\n    overflow-x: hidden;\\n    overflow-y: auto;\\n    padding: 12px max(16px, calc((100% - 688px) / 2)) calc(28px + env(safe-area-inset-bottom) + var(--pp-keyboard-height, 0px));\\n    scroll-padding-bottom: var(--pp-keyboard-height, 0px);\\n    background: var(--pp-background);\\n}\\n.pp-choice-link {\\n    display: flex;\\n    align-items: center;\\n    justify-content: flex-end;\\n    gap: 8px;\\n    max-width: 45%;\\n    min-width: 44px;\\n    min-height: 44px;\\n    padding: 0;\\n    text-align: right;\\n    flex: 1;\\n}\\n.pp-summary {\\n    color: var(--pp-muted);\\n    font-size: 13px;\\n    line-height: 18px;\\n    display: -webkit-box;\\n    -webkit-line-clamp: 2;\\n    -webkit-box-orient: vertical;\\n    overflow: hidden;\\n    overflow-wrap: anywhere;\\n}\\n.pp-chevron {\\n    color: var(--pp-muted);\\n    font-size: 22px;\\n    flex: none;\\n}\\n.pp-editor {\\n    flex: none;\\n    width: 45%;\\n    min-width: 0;\\n    min-height: 36px;\\n    padding: 8px 10px;\\n    font: inherit;\\n    color: var(--pp-text);\\n    background: var(--pp-field);\\n    border: 0;\\n    border-radius: 6px;\\n}\\n.pp-panel .pp-multiline {\\n    display: block;\\n}\\n.pp-multiline .pp-editor {\\n    width: 100%;\\n    margin-top: 10px;\\n}\\n.pp-panel [hidden] {\\n    display: none !important;\\n}\\n.pp-label {\\n    flex: 1;\\n    min-width: 0;\\n    display: flex;\\n    flex-direction: column;\\n    align-items: flex-start;\\n    margin-right: 16px;\\n}\\n.pp-field-name {\\n    color: var(--pp-text);\\n    font-size: 15px;\\n}\\n.pp-field-description {\\n    margin-top: 2px;\\n    color: var(--pp-muted);\\n    font-size: 12px;\\n}\\n.pp-group {\\n    margin-top: 16px;\\n}\\n.pp-group-title {\\n    margin: 0 0 8px;\\n    color: var(--pp-muted);\\n    font-size: 15px;\\n    font-weight: 400;\\n}\\n.pp-row {\\n    min-width: 0;\\n    min-height: 48px;\\n    padding: 16px;\\n    display: flex;\\n    align-items: center;\\n    justify-content: space-between;\\n    background: var(--pp-surface);\\n    border-bottom: 1px solid var(--pp-border);\\n}\\n.pp-rows > :last-child {\\n    border-bottom: 0 !important;\\n}\\n.pp-switch {\\n    flex: none;\\n    accent-color: var(--pp-accent);\\n}\\n.pp-choice {\\n    justify-content: space-between;\\n    cursor: pointer;\\n}\\n.pp-choice input {\\n    width: 20px;\\n    height: 20px;\\n    flex: none;\\n    accent-color: var(--pp-accent);\\n    margin: 0;\\n}\\n.pp-description {\\n    font-size: 12px;\\n    line-height: 1.6;\\n    color: var(--pp-muted);\\n    white-space: pre-wrap;\\n    overflow-wrap: anywhere;\\n}\\n.pp-module-info {\\n    display: flex;\\n    gap: 12px;\\n    margin: 12px 0;\\n}\\n.pp-module-details {\\n    min-width: 0;\\n    overflow-wrap: anywhere;\\n}\\n.pp-module-source {\\n    color: inherit;\\n    text-decoration: underline;\\n}\\n.pp-status {\\n    position: fixed;\\n    inset: 0;\\n    display: grid;\\n    place-content: center;\\n    justify-items: center;\\n    gap: 12px;\\n    min-width: 0;\\n    min-height: 0;\\n    margin: 0;\\n    padding: 24px;\\n    color: var(--pp-muted, GrayText);\\n    text-align: center;\\n    background: var(--pp-background, Canvas);\\n}\\n.pp-viewport > .pp-status {\\n    position: absolute;\\n}\\n.pp-status-spinner {\\n    box-sizing: border-box;\\n    width: 28px;\\n    height: 28px;\\n    border: 3px solid color-mix(in srgb, currentColor 25%, transparent);\\n    border-top-color: var(--pp-accent, AccentColor);\\n    border-radius: 50%;\\n    animation: pp-status-spin 0.8s linear infinite;\\n}\\n.pp-status-message {\\n    max-width: 100%;\\n    margin: 0;\\n    overflow-wrap: anywhere;\\n}\\n.pp-status-action {\\n    min-width: 96px;\\n    min-height: 44px;\\n    padding: 8px 16px;\\n    border: 0;\\n    border-radius: 6px;\\n    color: var(--pp-text, ButtonText);\\n    font: inherit;\\n    cursor: pointer;\\n    background: var(--pp-surface, ButtonFace);\\n}\\n@keyframes pp-status-spin {\\n    to {\\n        transform: rotate(1turn);\\n    }\\n}\\n.pp-cache {\\n    white-space: pre-wrap;\\n    overflow-wrap: anywhere;\\n}\\n.pp-toast {\\n    pointer-events: none;\\n    position: fixed;\\n    bottom: calc(30px + env(safe-area-inset-bottom));\\n    left: 50%;\\n    transform: translateX(-50%);\\n    max-width: 90vw;\\n    padding: 10px 16px;\\n    border-radius: 8px;\\n    background: #333e;\\n    color: white;\\n    font-size: 13px;\\n    z-index: 20;\\n}\\n.pp-toast[data-kind=\\\"error\\\"] {\\n    background: #8d2424;\\n}\\n.pp-panel :focus-visible {\\n    outline: 2px solid var(--pp-accent);\\n    outline-offset: -2px;\\n}\\n\";\n\nconst selector = \"style[data-preference-panes-defaults]\";\nconst stylesheetSelector = \"link[data-preference-panes-stylesheet]\";\n\n/**\n * 在文档中安装一次默认样式，并标记当前调用方是否拥有该节点。\n * Install default styles once and report whether the current caller owns the node.\n * @param {Document} document 目标文档 / Target document.\n * @returns {{element: HTMLStyleElement, owned: boolean}} 样式节点及所有权 / Style node and ownership.\n */\nfunction installDefaultStyles(document) {\n    const existing = document.head.querySelector(selector);\n    if (existing) return { element: existing, owned: false };\n    const element = document.createElement(\"style\");\n    element.dataset.preferencePanesDefaults = \"\";\n    element.textContent = defaults;\n    document.head.insertBefore(element, document.head.querySelector(stylesheetSelector));\n    return { element, owned: true };\n}\n\n/**\n * 管理 BoxJS 规范化、主题同步和面板生命周期。\n * Manage BoxJS normalization, theme synchronization, and panel lifecycle.\n */\nclass PreferencesView {\n    #existing;\n    #root;\n    #base;\n    #ownsBase;\n    #previousTitle;\n    #previousTheme;\n    #systemTheme;\n    #previousKeyboard;\n    #host;\n    #observer;\n    #panel;\n\n    /**\n     * 使用原始 BoxJS JSON 挂载设置页。\n     * Mount a settings page from raw BoxJS JSON.\n     * @param {import(\"../index.js\").BoxJSInput} boxjs 单模块 BoxJS JSON / Single-module BoxJS JSON.\n     */\n    constructor(boxjs) {\n        const definition = normalizeBoxJs(boxjs);\n        const metadata = definition.metadata ?? {};\n        const image = metadata.icon || metadata.icons?.[1] || metadata.icons?.[0];\n        if (image) resourceURL(image);\n        if (metadata.repo) resourceURL(metadata.repo);\n\n        this.#existing = document.querySelector(\"#preferences\");\n        this.#root = this.#existing ?? element(\"main\", \"\");\n        if (!this.#existing) {\n            this.#root.id = \"preferences\";\n            document.body.append(this.#root);\n        }\n        const styles = installDefaultStyles(document);\n        this.#base = styles.element;\n        this.#ownsBase = styles.owned;\n        this.#previousTitle = document.title;\n        this.#previousTheme = document.documentElement.dataset.theme;\n        this.#systemTheme = window.matchMedia(\"(prefers-color-scheme: dark)\");\n        this.#previousKeyboard = document.documentElement.style.getPropertyValue(\"--pp-keyboard-height\");\n        this.#host = window.frameElement?.ownerDocument.documentElement;\n        this.#syncAppearance();\n        this.#systemTheme.addEventListener(\"change\", this.#syncAppearance);\n        if (this.#host) {\n            this.#observer = new MutationObserver(this.#syncAppearance);\n            this.#observer.observe(this.#host, { attributes: true, attributeFilter: [\"data-theme\", \"style\"] });\n        }\n        document.title = metadata.name ?? definition.module;\n        try {\n            this.#root.replaceChildren();\n            this.#panel = new PreferencesPanel(this.#root, definition);\n        } catch (error) {\n            this.destroy();\n            throw error;\n        }\n    }\n\n    /**\n     * 跟随嵌入宿主的通用环境状态，不识别业务 App 或解析其 UA。\n     * Follow generic host appearance without detecting a business App or parsing its UA.\n     * @returns {void} 已同步主题与键盘避让 / Theme and keyboard clearance synchronized.\n     */\n    #syncAppearance = () => {\n        const theme = this.#host?.dataset.theme ?? this.#previousTheme ?? (this.#systemTheme.matches ? \"dark\" : \"light\");\n        document.documentElement.dataset.theme = theme;\n        if (this.#host) document.documentElement.style.setProperty(\"--pp-keyboard-height\", this.#host.style.getPropertyValue(\"--pp-keyboard-height\"));\n    };\n\n    /**\n     * 释放模块视图、样式与会话，不操作项目入口页。\n     * Release the module view, styles, and session without operating a project landing page.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#observer?.disconnect();\n        this.#systemTheme.removeEventListener(\"change\", this.#syncAppearance);\n        this.#panel?.destroy();\n        if (this.#ownsBase) this.#base.remove();\n        if (this.#existing) this.#root.replaceChildren();\n        else this.#root.remove();\n        document.title = this.#previousTitle;\n        if (this.#previousTheme === undefined) delete document.documentElement.dataset.theme;\n        else document.documentElement.dataset.theme = this.#previousTheme;\n        document.documentElement.style.setProperty(\"--pp-keyboard-height\", this.#previousKeyboard);\n    }\n}\n\n/**\n * 使用原始 BoxJS JSON 挂载设置页。\n * Mount a settings page from raw BoxJS JSON.\n * @param {import(\"../index.js\").BoxJSInput} boxjs 单模块 BoxJS JSON / Single-module BoxJS JSON.\n * @returns {import(\"./index.js\").MountedPreferences} 模块视图 / Module view.\n */\nfunction mount(boxjs) {\n    return new PreferencesView(boxjs);\n}\n\n/**\n * 管理模块文档的配置请求、重载和错误状态。\n * Manage configuration requests, reloads, and error states for a module document.\n */\nclass ModulePage {\n    #window;\n    #root;\n    #view;\n\n    /**\n     * 创建模块页面控制器并安装基础样式。\n     * Create the module page controller and install base styles.\n     * @param {Document} document 模块文档 / Module document.\n     */\n    constructor(document) {\n        this.#window = document.defaultView;\n        this.#root = document.querySelector(\"#preferences\");\n        installDefaultStyles(document);\n        this.#window.addEventListener(\"pageshow\", this.#show);\n    }\n\n    /**\n     * 通过模块 API 读取 BoxJS JSON 并挂载通用前端。\n     * Read BoxJS JSON through the module API and mount the generic frontend.\n     * @returns {Promise<void>} 启动完成 / Startup completion.\n     */\n    async start() {\n        try {\n            this.#view?.destroy();\n            this.#view = undefined;\n            this.#root.replaceChildren(statusView(\"读取设置…\"));\n            const embedded = this.#window.frameElement?.dataset.preferencePanesModule;\n            const match = /^\\/settings\\/([a-zA-Z0-9_-]+)\\/?$/.exec(this.#window.location.pathname);\n            const module = embedded ?? match?.[1];\n            if (!module) throw new TypeError(\"Open a concrete module URL\");\n            const response = await fetch(`/api/${encodeURIComponent(module)}`, { cache: \"no-store\", credentials: \"omit\", headers: { Accept: \"application/json\" } });\n            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);\n            const boxjs = await response.json();\n            normalizeBoxJs(boxjs, module);\n            this.#view = mount(boxjs);\n        } catch (error) {\n            this.#root.replaceChildren(statusView(`加载失败：${error.message}`, () => this.start()));\n        }\n    }\n\n    /**\n     * 释放页面视图和页面级监听器。\n     * Release the page view and page-level listener.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#window.removeEventListener(\"pageshow\", this.#show);\n        this.#view?.destroy();\n        this.#view = undefined;\n    }\n\n    /**\n     * 从前进后退缓存恢复时重新加载模块。\n     * Reload the module when restored from the back-forward cache.\n     * @param {PageTransitionEvent} event 页面显示事件 / Page show event.\n     * @returns {void} 无返回值 / No return value.\n     */\n    #show = event => {\n        if (event.persisted) this.start();\n    };\n}\n\nnew ModulePage(document).start();\n"},"/settings/assets/navigation.mjs":{"type":"text/javascript","body":"/**\n * 独立页面的三点按钮和底部操作菜单；嵌入页面由宿主提供对应界面。\n * Overflow trigger and bottom action sheet for standalone pages; embedded pages use host-provided chrome.\n */\nclass ActionMenu {\n    #button;\n    #layer;\n    #items;\n    #select;\n    #document;\n    #disabled = true;\n    #key = event => {\n        if (event.key === \"Escape\" && !this.#layer.hidden) {\n            event.preventDefault();\n            this.close();\n            this.#button.focus();\n        }\n    };\n\n    /**\n     * 创建菜单，操作逻辑由调用方提供。\n     * Create a menu whose actions are handled by the caller.\n     * @param {(id: string) => void} select 菜单选择回调 / Selection callback.\n     */\n    constructor(select) {\n        this.#document = document;\n        this.#select = select;\n        this.element = document.createElement(\"span\");\n        const triggerRoot = this.element.attachShadow({ mode: \"open\" });\n        triggerRoot.innerHTML = `<style>\n          :host{display:inline-flex;width:44px;height:44px;color:inherit}\n          :host([hidden]){display:none!important}\n          button{width:44px;height:44px;padding:10px;font:inherit;cursor:pointer;border:0;color:inherit;background:none}\n          button:disabled{opacity:.4;cursor:default}\n          button:focus-visible{outline:2px solid currentColor;outline-offset:-3px}\n          svg{display:block;width:24px;height:24px;fill:currentColor}\n        </style><button type=\"button\" aria-label=\"更多操作\" aria-haspopup=\"menu\" aria-expanded=\"false\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"4\" cy=\"12\" r=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><circle cx=\"20\" cy=\"12\" r=\"2\"/></svg></button>`;\n        this.#button = triggerRoot.querySelector(\"button\");\n        this.#layer = document.createElement(\"span\");\n        const layerRoot = this.#layer.attachShadow({ mode: \"open\" });\n        layerRoot.innerHTML = `<style>\n          :host{position:fixed;inset:0;z-index:2147483647;color:var(--pp-text,CanvasText);font:16px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}\n          :host([hidden]){display:none!important}\n          *,*::before,*::after{box-sizing:border-box}\n          button{font:inherit;cursor:pointer;border:0;color:inherit;background:none}\n          button:focus-visible{outline:2px solid var(--pp-accent,Highlight);outline-offset:-3px}\n          #backdrop{position:absolute;inset:0;width:100%;height:100%;padding:0;background:#0008;animation:pp-fade-in .18s ease-out}\n          #sheet{position:absolute;z-index:1;left:0;right:0;bottom:0;width:100%;max-width:540px;max-height:calc(100% - 24px);margin:auto;padding:8px 8px calc(8px + env(safe-area-inset-bottom));animation:pp-sheet-in .22s cubic-bezier(.2,.8,.2,1)}\n          #items,#cancel{overflow:hidden;background:var(--pp-surface,Canvas);border:1px solid var(--pp-border,#8884);border-radius:14px;box-shadow:0 8px 28px #0004}\n          #items{max-height:calc(100vh - 116px - env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch}\n          #items button,#cancel{display:block;width:100%;min-height:54px;padding:14px 18px;text-align:center}\n          #items button+button{border-top:1px solid var(--pp-border,#8884)}\n          #items button[data-danger]{color:var(--pp-danger,#e45656)}\n          #cancel{margin-top:8px;color:var(--pp-accent,Highlight);font-weight:600}\n          @keyframes pp-fade-in{from{opacity:0}}\n          @keyframes pp-sheet-in{from{transform:translateY(100%)}}\n          @media (prefers-reduced-motion:reduce){#backdrop,#sheet{animation:none}}\n        </style><button id=\"backdrop\" type=\"button\" tabindex=\"-1\" aria-label=\"关闭菜单\"></button><section id=\"sheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"更多操作\"><div id=\"items\" role=\"menu\"></div><button id=\"cancel\" type=\"button\">取消</button></section>`;\n        this.#items = layerRoot.querySelector(\"#items\");\n        this.#button.onclick = () => (this.#layer.hidden ? this.open() : this.close());\n        layerRoot.querySelector(\"#backdrop\").onclick = () => {\n            this.close();\n            this.#button.focus();\n        };\n        layerRoot.querySelector(\"#cancel\").onclick = () => {\n            this.close();\n            this.#button.focus();\n        };\n        this.#items.onkeydown = event => {\n            const items = [...this.#items.children];\n            const index = items.indexOf(layerRoot.activeElement);\n            const offsets = { ArrowDown: 1, ArrowUp: -1 };\n            if (event.key in offsets) {\n                event.preventDefault();\n                items[(index + offsets[event.key] + items.length) % items.length].focus();\n            }\n        };\n        document.body.append(this.#layer);\n        document.addEventListener(\"keydown\", this.#key);\n        this.update([]);\n    }\n\n    /**\n     * 同步可用操作和忙碌状态，不重建菜单触发按钮。\n     * Update actions and busy state without replacing the trigger button.\n     * @param {Array<{id: string, label: string, destructive?: boolean}>} items 操作列表 / Actions.\n     * @param {boolean} [disabled] 是否忙碌 / Whether operations are busy.\n     * @returns {void} 无返回值 / No return value.\n     */\n    update(items, disabled = false) {\n        this.close();\n        this.#disabled = disabled || items.length === 0;\n        this.#button.disabled = this.#disabled;\n        this.#items.replaceChildren(\n            ...items.map(item => {\n                const button = this.#document.createElement(\"button\");\n                button.type = \"button\";\n                button.setAttribute(\"role\", \"menuitem\");\n                button.textContent = item.label;\n                button.toggleAttribute(\"data-danger\", Boolean(item.destructive));\n                button.onclick = () => {\n                    this.close();\n                    this.#select(item.id);\n                };\n                return button;\n            }),\n        );\n    }\n\n    /**\n     * 打开当前操作菜单。\n     * Open the current action sheet.\n     * @returns {void} 无返回值 / No return value.\n     */\n    open() {\n        if (this.#disabled) return;\n        const style = getComputedStyle(this.element);\n        for (const property of [\"--pp-text\", \"--pp-surface\", \"--pp-border\", \"--pp-accent\", \"--pp-danger\"]) {\n            const value = style.getPropertyValue(property);\n            if (value) this.#layer.style.setProperty(property, value);\n        }\n        this.#layer.hidden = false;\n        this.#button.setAttribute(\"aria-expanded\", \"true\");\n        this.#items.firstElementChild.focus();\n    }\n\n    /**\n     * 关闭菜单。\n     * Close the menu.\n     * @returns {void} 无返回值 / No return value.\n     */\n    close() {\n        this.#layer.hidden = true;\n        this.#button.setAttribute(\"aria-expanded\", \"false\");\n    }\n\n    /**\n     * 移除监听器与节点。\n     * Remove listeners and elements.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#document.removeEventListener(\"keydown\", this.#key);\n        this.#layer.remove();\n        this.element.remove();\n    }\n}\n\n/**\n * 模块文档容器：发送 GET 请求并将原始 HTML 交给 iframe，只在元素上标记模块身份。\n * Module document container: send a GET request, preserve HTML verbatim and mark only the module identity on the iframe.\n */\nclass ModuleFrame extends EventTarget {\n    #url;\n    #options;\n    #controller = new AbortController();\n    #abort = () => this.destroy();\n    #state;\n    #change = event => {\n        this.#state = { ...event.detail, actions: event.detail.actions ?? [] };\n        this.dispatchEvent(new Event(\"change\"));\n    };\n    #confirmation = event => {\n        const request = new CustomEvent(\"confirm\", { cancelable: true, detail: event.detail });\n        if (!this.dispatchEvent(request)) event.preventDefault();\n    };\n    #notice = event => {\n        const notice = new CustomEvent(\"notice\", { cancelable: true, detail: event.detail });\n        if (!this.dispatchEvent(notice)) event.preventDefault();\n    };\n\n    /**\n     * 建立 iframe；调用方挂载 element 后调用 load。\n     * Create the iframe; callers mount element and then call load.\n     * @param {string | URL} url 模块请求地址 / Module request URL.\n     * @param {{signal?: AbortSignal, headers?: HeadersInit}} [options] 请求选项 / Request options.\n     */\n    constructor(url, options = {}) {\n        super();\n        this.#url = new URL(url, document.baseURI);\n        const match = /^\\/settings\\/([a-zA-Z0-9_-]+)\\/?$/.exec(this.#url.pathname);\n        if (!match) throw new TypeError(\"Open a concrete module URL\");\n        this.#options = { signal: options.signal, headers: options.headers };\n        this.element = document.createElement(\"iframe\");\n        this.element.title = `${match[1]} 设置`;\n        this.element.dataset.preferencePanes = \"true\";\n        this.element.dataset.preferencePanesModule = match[1];\n        this.element.addEventListener(\"preferencepanes:change\", this.#change);\n        this.element.addEventListener(\"preferencepanes:confirm\", this.#confirmation);\n        this.element.addEventListener(\"preferencepanes:notice\", this.#notice);\n        this.#state = { title: match[1], module: match[1], busy: false, canGoBack: true, actions: [] };\n        options.signal?.addEventListener(\"abort\", this.#abort, { once: true });\n    }\n\n    /**\n     * 当前模块导航状态。\n     * Current module navigation state.\n     */\n    get state() {\n        return { ...this.#state };\n    }\n\n    /**\n     * 获取原始 HTML；晚到响应在退出后不得重新挂载。\n     * Fetch unmodified HTML; a late response must not remount after departure.\n     * @returns {Promise<void>} HTML 已交给 iframe；表单状态通过 change 事件提供 / HTML assigned; form state is reported through change.\n     */\n    async load() {\n        if (this.#options.signal?.aborted) this.destroy();\n        const timer = setTimeout(() => this.#controller.abort(), 10000);\n        try {\n            const response = await fetch(this.#url, { method: \"GET\", cache: \"no-store\", credentials: \"omit\", headers: this.#options.headers, signal: this.#controller.signal });\n            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);\n            const html = await response.text();\n            this.#controller.signal.throwIfAborted();\n            this.element.srcdoc = html;\n        } finally {\n            clearTimeout(timer);\n        }\n    }\n\n    /**\n     * 使用 iframe 的联合历史返回；写入期间不导航。\n     * Navigate joint iframe history back, except while a write is pending.\n     * @returns {void} 无返回值 / No return value.\n     */\n    back() {\n        if (!this.#state.busy && this.#state.canGoBack) this.element.contentWindow.history.back();\n    }\n\n    /**\n     * 向模块发送菜单操作，不让宿主访问内部 DOM 或存储客户端。\n     * Dispatch a menu action without host access to internal DOM or the storage client.\n     * @param {string} id 当前可用操作 / Available action identifier.\n     * @returns {void} 无返回值 / No return value.\n     */\n    perform(id) {\n        if (this.#state.busy || !this.#state.actions.some(action => action.id === id)) throw new Error(\"Action is not available\");\n        this.element.dispatchEvent(new CustomEvent(\"preferencepanes:action\", { detail: id }));\n    }\n\n    /**\n     * 取消加载与事件订阅；节点保留到 Navigation 的退出动画结束。\n     * Cancel loading and subscriptions; Navigation retains the node until its exit animation ends.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#controller.abort();\n        this.#options.signal?.removeEventListener(\"abort\", this.#abort);\n        this.element.removeEventListener(\"preferencepanes:change\", this.#change);\n        this.element.removeEventListener(\"preferencepanes:confirm\", this.#confirmation);\n        this.element.removeEventListener(\"preferencepanes:notice\", this.#notice);\n    }\n}\n\n/**\n * 模块探测请求选项。\n * Options for a module probe request.\n * @typedef {object} ModuleProbeOptions\n * @property {typeof globalThis.fetch} [fetch] 可注入的 fetch / Injectable fetch.\n * @property {AbortSignal} [signal] 外部取消信号 / External cancellation signal.\n * @property {number} [timeout] 超时毫秒数，默认 3500 / Timeout in milliseconds, defaults to 3500.\n */\n\n/**\n * 通过模块 API 的 HEAD 响应检测安装状态和业务版本。\n * Probe installation and business version from the module API HEAD response.\n * @param {string | URL} url 模块 API 地址 / Module API URL.\n * @param {ModuleProbeOptions} [options] 请求选项 / Request options.\n * @returns {Promise<Response>} 原始 HTTP 响应，可直接读取 status 和响应头 / Native HTTP response; read status and headers directly.\n */\nasync function probeModule(url, { fetch: request = globalThis.fetch, signal, timeout = 3500 } = {}) {\n    const controller = new AbortController();\n    const abort = () => controller.abort();\n    if (signal?.aborted) abort();\n    signal?.addEventListener(\"abort\", abort, { once: true });\n    const timer = setTimeout(() => controller.abort(), timeout);\n    try {\n        return await request(url, { method: \"HEAD\", cache: \"no-store\", credentials: \"omit\", signal: controller.signal });\n    } finally {\n        clearTimeout(timer);\n        signal?.removeEventListener(\"abort\", abort);\n    }\n}\n\n/**\n * 模块入口的固定状态行，只通过 HEAD 探测安装状态和业务版本。\n * Fixed module status row, probing installation and business version with HEAD only.\n */\nclass ModuleStatus extends EventTarget {\n    #element;\n    #controller;\n    #state = { status: \"checking\", version: null };\n\n    /**\n     * 绑定调用方提供的状态行。\n     * Bind a caller-owned status row.\n     * @param {HTMLElement} element 状态文字容器 / Status text container.\n     */\n    constructor(element) {\n        super();\n        this.#element = element;\n        this.#render(\"checking\");\n    }\n\n    /**\n     * 当前安装状态与业务版本。\n     * Current installation state and business version.\n     */\n    get state() {\n        return { ...this.#state };\n    }\n\n    /**\n     * 每次进入重新探测，取消旧请求并忽略其迟到结果。\n     * Reprobe on entry, cancelling old requests and ignoring late results.\n     * @param {string | URL} url 模块 API 地址 / Module API URL.\n     * @param {ModuleProbeOptions} [options] 请求选项 / Request options.\n     * @returns {Promise<Response | undefined>} 原始响应；被取消时无返回值 / Native response; undefined when cancelled.\n     */\n    async check(url, options = {}) {\n        this.#controller?.abort();\n        const controller = new AbortController();\n        this.#controller = controller;\n        const externalSignal = options.signal;\n        const abort = () => controller.abort();\n        if (externalSignal?.aborted) abort();\n        externalSignal?.addEventListener(\"abort\", abort, { once: true });\n        this.#render(\"checking\");\n        try {\n            const response = await probeModule(url, { ...options, signal: controller.signal });\n            if (controller !== this.#controller) return response;\n            const version = response.status === 200 ? response.headers.get(\"X-PreferencePanes-Version\")?.trim() || null : null;\n            this.#render(version ? \"installed\" : \"missing\", version);\n            return response;\n        } catch (error) {\n            if (controller !== this.#controller) return;\n            if (externalSignal?.aborted) throw error;\n            this.#render(\"missing\");\n        } finally {\n            externalSignal?.removeEventListener(\"abort\", abort);\n        }\n    }\n\n    /**\n     * 更新状态标签，缺少版本时不伪造版本号。\n     * Render the label without inventing a missing version.\n     * @param {\"checking\" | \"installed\" | \"missing\"} status 状态 / State.\n     * @param {string | null} [version] 业务版本 / Business version.\n     * @returns {void} 无返回值 / No return value.\n     */\n    #render(status, version = null) {\n        this.#state = { status, version: status === \"installed\" ? version : null };\n        switch (status) {\n            case \"checking\":\n                this.#element.textContent = \"检测中\";\n                break;\n            case \"installed\":\n                this.#element.textContent = version ?? \"版本未知\";\n                break;\n            case \"missing\":\n                this.#element.textContent = \"未安装\";\n                break;\n        }\n        this.#element.dataset.state = status;\n        this.#element.title = this.#element.textContent;\n        this.dispatchEvent(new Event(\"change\"));\n    }\n\n    /**\n     * 释放尚未完成的探测。\n     * Release pending probes.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#controller?.abort();\n        this.#controller = undefined;\n    }\n}\n\n/**\n * 同一文档内的主页/子页导航；iframe 各自的实例通过浏览器联合历史协作。\n * Navigate home/detail views within a document; iframe instances cooperate through joint browser history.\n */\nclass Navigation extends EventTarget {\n    #container;\n    #home;\n    #create;\n    #window;\n    #key = null;\n    #view;\n    #retiring;\n    #controller;\n    #animation;\n    #scroll = new WeakMap();\n    #onHistory = () => this.#route();\n    #onPageShow = event => {\n        if (event.persisted) this.#route(true);\n    };\n\n    /**\n     * 根视图始终保留；工厂按需提供子页，可用 signal 取消离开后的异步加载。\n     * Retain the home view and create details on demand; signal cancels async work after departure.\n     * @param {HTMLElement} container 由调用方布局的页面容器 / Caller-styled view container.\n     * @param {HTMLElement} home 已创建的主页节点 / Existing home view.\n     * @param {(key: string, signal: AbortSignal) => HTMLElement | undefined} create 子页工厂；未知路径返回 undefined / Detail factory; undefined for unknown routes.\n     */\n    constructor(container, home, create) {\n        super();\n        this.#container = container;\n        this.#home = home;\n        this.#create = create;\n        this.#window = container.ownerDocument.defaultView;\n        container.replaceChildren(home);\n        this.#window.addEventListener(\"popstate\", this.#onHistory);\n        this.#window.addEventListener(\"hashchange\", this.#onHistory);\n        this.#window.addEventListener(\"pageshow\", this.#onPageShow);\n        this.#route();\n    }\n\n    /**\n     * 当前子页键；空字符串表示主页。\n     * Current detail key; empty means home.\n     */\n    get current() {\n        return this.#key;\n    }\n\n    /**\n     * 是否可以返回上一级或先前文档。\n     * Whether a parent view or previous document is available.\n     */\n    get canGoBack() {\n        return Boolean(this.#key) || this.#window.history.length > 1;\n    }\n\n    /**\n     * 加入子页历史；使用文档自身 URL，避免 srcdoc 按宿主 base URL 跳转。\n     * Push a detail using the document URL, avoiding srcdoc navigation against the host base URL.\n     * @param {string} key 子页键 / Detail key.\n     * @returns {void} 无返回值 / No return value.\n     */\n    open(key) {\n        if (key === this.#key) return;\n        const url = new URL(this.#window.location.href);\n        url.hash = encodeURIComponent(key);\n        this.#window.history.pushState({ ...this.#window.history.state, preferencePanesRoute: key }, \"\", url.href);\n        this.#route();\n    }\n\n    /**\n     * 沿浏览器联合历史返回，根页可退回宿主或上个文档。\n     * Go back through joint history, including a host or previous document from home.\n     * @returns {void} 无返回值 / No return value.\n     */\n    back() {\n        if (this.canGoBack) this.#window.history.back();\n    }\n\n    /**\n     * 解析 URL 并统一处理页面切换、加载取消与动画结束后的释放。\n     * Resolve the URL and coordinate transitions, cancellation and release after animation.\n     * @param {boolean} [reload] 从页面缓存恢复时重新创建子页 / Recreate a detail after bfcache restoration.\n     * @returns {void} 无返回值 / No return value.\n     */\n    #route(reload = false) {\n        const url = new URL(this.#window.location.href);\n        let key;\n        try {\n            key = decodeURIComponent(url.hash.slice(1));\n        } catch (error) {\n            if (!(error instanceof URIError)) throw error;\n            key = \"\";\n        }\n        if (!reload && key === this.#key) return;\n        this.#controller?.abort();\n        this.#controller = new AbortController();\n        const next = key ? this.#create(key, this.#controller.signal) : undefined;\n        if (!next) key = \"\";\n        const history = this.#window.history;\n        // 直接打开子页时建立一次主页历史；刷新不重复堆叠。\n        // Seed home history once for direct details, without stacking entries on reload.\n        if (url.hash && history.state?.preferencePanesRoute !== key) {\n            url.hash = \"\";\n            history.replaceState({ ...history.state, preferencePanesRoute: \"\" }, \"\", url.href);\n            if (key) {\n                url.hash = encodeURIComponent(key);\n                history.pushState({ ...history.state, preferencePanesRoute: key }, \"\", url.href);\n            }\n        }\n        const previous = this.#view;\n        const position = previous ? this.#window.getComputedStyle(previous).transform : \"none\";\n        this.#animation?.cancel();\n        this.#retiring?.remove();\n        this.#retiring = previous;\n        if (previous) {\n            this.#scroll.set(previous, previous.scrollTop);\n            previous.inert = true;\n        }\n        this.#key = key;\n        this.#view = next;\n        this.#home.inert = Boolean(next);\n        if (next) {\n            next.inert = false;\n            this.#container.append(next);\n            next.scrollTop = this.#scroll.get(next) ?? 0;\n        }\n        const moving = next ?? previous;\n        if (moving) {\n            const animation = moving.animate([{ transform: next ? \"translateX(100%)\" : position }, { transform: next ? \"translateX(0)\" : \"translateX(100%)\" }], { duration: this.#window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches ? 0 : 280, easing: \"cubic-bezier(.22,.61,.36,1)\", fill: \"forwards\" });\n            this.#animation = animation;\n            animation.onfinish = () => {\n                if (this.#animation !== animation) return;\n                this.#retiring?.remove();\n                this.#retiring = undefined;\n                animation.cancel();\n                this.#animation = undefined;\n            };\n        }\n        this.dispatchEvent(new Event(\"change\"));\n    }\n\n    /**\n     * 释放监听器、加载、动画和节点；调用方可重新创建导航。\n     * Release listeners, loads, animations and nodes so callers can recreate navigation.\n     * @returns {void} 无返回值 / No return value.\n     */\n    destroy() {\n        this.#window.removeEventListener(\"popstate\", this.#onHistory);\n        this.#window.removeEventListener(\"hashchange\", this.#onHistory);\n        this.#window.removeEventListener(\"pageshow\", this.#onPageShow);\n        this.#controller?.abort();\n        this.#animation?.cancel();\n        this.#retiring?.remove();\n        this.#view?.remove();\n        this.#home.remove();\n    }\n}\n\nexport { ActionMenu, ModuleFrame, ModuleStatus, Navigation, probeModule };\n"}};

    /**
     * 按标准 URL 语义解析样式地址，并限制为 HTTP(S)。
     * Resolve a stylesheet reference with standard URL semantics and require HTTP(S).
     * @param {string} source 样式地址 / Stylesheet reference.
     * @param {URL} base 模块页面地址 / Module page URL.
     * @returns {URL} 绝对样式地址 / Absolute stylesheet URL.
     */
    function stylesheetURL(source, base) {
        const scheme = /^([a-zA-Z][a-zA-Z\d+.-]*:)/.exec(source)?.[1].toLowerCase();
        if (scheme && !["http:", "https:"].includes(scheme)) throw new TypeError("CSS resource must use HTTP(S)");
        let resource;
        if (scheme) resource = new URL(source);
        else if (source.startsWith("//")) resource = new URL(`${base.protocol}${source}`);
        else {
            const [, path, query, hash] = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(source);
            const pathname = path.startsWith("/") ? path : `${base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1)}${path}`;
            const segments = [];
            for (const segment of pathname.split("/")) {
                if (segment === ".") continue;
                if (segment === "..") {
                    if (segments.length > 1) segments.pop();
                } else segments.push(segment);
            }
            const normalized = segments.join("/") || "/";
            resource = new URL(`${base.origin}${normalized}${query ?? (path ? "" : base.search)}${hash ?? ""}`);
        }
        if (!["http:", "https:"].includes(resource.protocol.toLowerCase())) throw new TypeError("CSS resource must use HTTP(S)");
        return resource;
    }

    /**
     * 返回模块页面及其公共浏览器资源，不处理 API、网络或持久化。
     * Serve module pages and common browser assets without handling APIs, network access or persistence.
     * @returns {void} 响应已交给代理宿主 / Response delivered to the proxy host.
     */
    function run() {
        const request = globalThis.$request;
        let result;
        try {
            const url = new URL(request.url);
            if (/^\/settings\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) {
                if (!["GET", "HEAD"].includes(request.method)) result = response(request, 405, { error: "Method not allowed" });
                else {
                    const header = Object.entries(request.headers ?? {}).find(([name]) => name.toLowerCase() === "x-preferencepanes-css");
                    const source = (header ? header[1] : url.searchParams.get("css"))?.trim();
                    let stylesheet = "";
                    if (source) {
                        const resource = stylesheetURL(source, url);
                        const href = resource.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
                        stylesheet = `<link data-preference-panes-stylesheet rel="stylesheet" href="${href}">`;
                    }
                    result = response(request, 200, assets.page.body.replace("<!--__PREFERENCE_PANES_STYLESHEET__-->", stylesheet), "text/html");
                }
            } else {
                const asset = assets[url.pathname];
                if (asset) result = ["GET", "HEAD"].includes(request.method) ? response(request, 200, asset.body, asset.type) : response(request, 405, { error: "Method not allowed" });
            }
        } catch (error) {
            console.error(`PreferencePanes Web: ${error.message}`);
            result = response(request, 500, { error: error.message });
        }
        if (!result) done({});
        else done($app === "Quantumult X" ? result : { response: result });
    }

    /**
     * 构造静态资源响应，HEAD 请求不返回正文。
     * Build a static resource response without a body for HEAD requests.
     * @param {import("./index.js").SettingsRequest} request 代理请求 / Proxy request.
     * @param {number} status HTTP 状态 / HTTP status.
     * @param {unknown} body 响应正文 / Response body.
     * @param {string} [type] 媒体类型 / Media type.
     * @returns {import("./index.js").SettingsResponse} 静态资源响应 / Static resource response.
     */
    function response(request, status, body, type = "application/json") {
        return {
            status,
            headers: { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
            body: request.method === "HEAD" ? "" : type === "application/json" ? JSON.stringify(body) : body,
        };
    }

    run();

})();
