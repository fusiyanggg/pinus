"use strict";
/*!
 * Pomelo -- proto
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 */
const utils = require("./util/utils");
const pinus_logger_1 = require("pinus-logger");
var logger = pinus_logger_1.getLogger('pinus', __filename);
const events_1 = require("events");
const events_2 = require("./util/events");
const appUtil = require("./util/appUtil");
const Constants = require("./util/constants");
const appManager = require("./common/manager/appManager");
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
/**
 * Application states
 */
var STATE_INITED = 1; // app has inited
var STATE_START = 2; // app start
var STATE_STARTED = 3; // app has started
var STATE_STOPED = 4; // app has stoped
class Application {
    constructor() {
        this.loaded = []; // loaded component list
        this.components = {}; // name -> component map
        this.settings = {}; // collection keep set/get
        this.event = new events_1.EventEmitter(); // event object to sub/pub events
        // current server info
        this.serverId = null; // current server id
        this.serverType = null; // current server type
        this.curServer = null; // current server info
        this.startTime = null; // current server start time
        // global server infos
        this.master = null; // master server info
        this.servers = {}; // current global server info maps, id -> info
        this.serverTypeMaps = {}; // current global type maps, type -> [info]
        this.serverTypes = []; // current global server type list
        this.lifecycleCbs = {}; // current server custom lifecycle callbacks
        this.clusterSeq = {}; // cluster id seqence
        this.astart = utils.promisify(this.start);
        this.aconfigure = utils.promisify(this.configure);
    }
    /**
     * Initialize the server.
     *
     *   - setup default configuration
     */
    init(opts) {
        opts = opts || {};
        var base = opts.base || path.dirname(require.main.filename);
        this.set(Constants.RESERVED.BASE, base);
        this.base = base;
        appUtil.defaultConfiguration(this);
        this.state = STATE_INITED;
        logger.info('application inited: %j', this.getServerId());
    }
    ;
    /**
     * Get application base path
     *
     *  // cwd: /home/game/
     *  pinus start
     *  // app.getBase() -> /home/game
     *
     * @return {String} application base path
     *
     * @memberOf Application
     */
    getBase() {
        return this.get(Constants.RESERVED.BASE);
    }
    ;
    /**
     * Override require method in application
     *
     * @param {String} relative path of file
     *
     * @memberOf Application
     */
    require(ph) {
        return require(path.join(this.getBase(), ph));
    }
    ;
    /**
     * Configure logger with {$base}/config/log4js.json
     *
     * @param {Object} logger pinus-logger instance without configuration
     *
     * @memberOf Application
     */
    configureLogger(logger) {
        if (process.env.POMELO_LOGGER !== 'off') {
            var base = this.getBase();
            var env = this.get(Constants.RESERVED.ENV);
            var originPath = path.join(base, Constants.FILEPATH.LOG);
            var presentPath = path.join(base, Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
            if (fs.existsSync(originPath)) {
                logger.configure(originPath, { serverId: this.serverId, base: base });
            }
            else if (fs.existsSync(presentPath)) {
                logger.configure(presentPath, { serverId: this.serverId, base: base });
            }
            else {
                logger.error('logger file path configuration is error.');
            }
        }
    }
    ;
    /**
     * add a filter to before and after filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    filter(filter) {
        this.before(filter);
        this.after(filter);
    }
    ;
    /**
     * Add before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    before(bf) {
        addFilter(this, Constants.KEYWORDS.BEFORE_FILTER, bf);
    }
    ;
    /**
     * Add after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    after(af) {
        addFilter(this, Constants.KEYWORDS.AFTER_FILTER, af);
    }
    ;
    /**
     * add a global filter to before and after global filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    globalFilter(filter) {
        this.globalBefore(filter);
        this.globalAfter(filter);
    }
    ;
    /**
     * Add global before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    globalBefore(bf) {
        addFilter(this, Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
    }
    ;
    /**
     * Add global after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    globalAfter(af) {
        addFilter(this, Constants.KEYWORDS.GLOBAL_AFTER_FILTER, af);
    }
    ;
    /**
     * Add rpc before filter.
     *
     * @param {Object|Function} bf before fileter, bf(serverId, msg, opts, next)
     * @memberOf Application
     */
    rpcBefore(bf) {
        addFilter(this, Constants.KEYWORDS.RPC_BEFORE_FILTER, bf);
    }
    ;
    /**
     * Add rpc after filter.
     *
     * @param {Object|Function} af after filter, `af(serverId, msg, opts, next)`
     * @memberOf Application
     */
    rpcAfter(af) {
        addFilter(this, Constants.KEYWORDS.RPC_AFTER_FILTER, af);
    }
    ;
    /**
     * add a rpc filter to before and after rpc filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    rpcFilter(filter) {
        this.rpcBefore(filter);
        this.rpcAfter(filter);
    }
    ;
    load(name, component, opts) {
        if (typeof name !== 'string') {
            opts = component;
            component = name;
            name = null;
        }
        if (util_1.isFunction(component)) {
            component = new component(this, opts);
        }
        if (!name && typeof component.name === 'string') {
            name = component.name;
        }
        if (name && this.components[name]) {
            // ignore duplicat component
            logger.warn('ignore duplicate component: %j', name);
            return;
        }
        this.loaded.push(component);
        if (name) {
            // components with a name would get by name throught app.components later.
            this.components[name] = component;
        }
        return component;
    }
    ;
    /**
     * Load Configure json file to settings.(support different enviroment directory & compatible for old path)
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @param {Boolean} reload whether reload after change default false
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfigBaseApp(key, val, reload = false) {
        var self = this;
        var env = this.get(Constants.RESERVED.ENV);
        var originPath = path.join(this.getBase(), val);
        var presentPath = path.join(this.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(val));
        var realPath;
        if (fs.existsSync(originPath)) {
            realPath = originPath;
            var file = require(originPath);
            if (file[env]) {
                file = file[env];
            }
            this.set(key, file);
        }
        else if (fs.existsSync(presentPath)) {
            realPath = presentPath;
            var pfile = require(presentPath);
            this.set(key, pfile);
        }
        else {
            logger.error('invalid configuration with file path: %s', key);
        }
        if (!!realPath && !!reload) {
            fs.watch(realPath, function (event, filename) {
                if (event === 'change') {
                    delete require.cache[require.resolve(realPath)];
                    self.loadConfigBaseApp(key, val);
                }
            });
        }
    }
    ;
    /**
     * Load Configure json file to settings.
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfig(key, val) {
        var env = this.get(Constants.RESERVED.ENV);
        val = require(val);
        if (val[env]) {
            val = val[env];
        }
        this.set(key, val);
    }
    ;
    /**
     * Set the route function for the specified server type.
     *
     * Examples:
     *
     *  app.route('area', routeFunc);
     *
     *  var routeFunc = function(session, msg, app, cb) {
     *    // all request to area would be route to the first area server
     *    var areas = app.getServersByType('area');
     *    cb(null, areas[0].id);
     *  };
     *
     * @param  {String} serverType server type string
     * @param  {Function} routeFunc  route function. routeFunc(session, msg, app, cb)
     * @return {Object}     current application instance for chain invoking
     * @memberOf Application
     */
    route(serverType, routeFunc) {
        var routes = this.get(Constants.KEYWORDS.ROUTE);
        if (!routes) {
            routes = {};
            this.set(Constants.KEYWORDS.ROUTE, routes);
        }
        routes[serverType] = routeFunc;
        return this;
    }
    ;
    /**
     * Set before stop function. It would perform before servers stop.
     *
     * @param  {Function} fun before close function
     * @return {Void}
     * @memberOf Application
     */
    beforeStopHook(fun) {
        logger.warn('this method was deprecated in pinus 0.8');
        if (!!fun && typeof fun === 'function') {
            this.set(Constants.KEYWORDS.BEFORE_STOP_HOOK, fun);
        }
    }
    ;
    /**
     * Start application. It would load the default components and start all the loaded components.
     *
     * @param  {Function} cb callback function
     * @memberOf Application
     */
    start(cb) {
        this.startTime = Date.now();
        if (this.state > STATE_INITED) {
            utils.invokeCallback(cb, new Error('application has already start.'));
            return;
        }
        var self = this;
        appUtil.startByType(self, function () {
            appUtil.loadDefaultComponents(self);
            var startUp = function () {
                appUtil.optComponents(self.loaded, Constants.RESERVED.START, function (err) {
                    self.state = STATE_START;
                    if (err) {
                        utils.invokeCallback(cb, err);
                    }
                    else {
                        logger.info('%j enter after start...', self.getServerId());
                        self.afterStart(cb);
                    }
                });
            };
            var beforeFun = self.lifecycleCbs[Constants.LIFECYCLE.BEFORE_STARTUP];
            if (!!beforeFun) {
                beforeFun.call(null, self, startUp);
            }
            else {
                startUp();
            }
        });
    }
    ;
    /**
     * Lifecycle callback for after start.
     *
     * @param  {Function} cb callback function
     * @return {Void}
     */
    afterStart(cb) {
        if (this.state !== STATE_START) {
            utils.invokeCallback(cb, new Error('application is not running now.'));
            return;
        }
        var afterFun = this.lifecycleCbs[Constants.LIFECYCLE.AFTER_STARTUP];
        var self = this;
        appUtil.optComponents(this.loaded, Constants.RESERVED.AFTER_START, function (err) {
            self.state = STATE_STARTED;
            var id = self.getServerId();
            if (!err) {
                logger.info('%j finish start', id);
            }
            if (!!afterFun) {
                afterFun.call(null, self, function () {
                    utils.invokeCallback(cb, err);
                });
            }
            else {
                utils.invokeCallback(cb, err);
            }
            var usedTime = Date.now() - self.startTime;
            logger.info('%j startup in %s ms', id, usedTime);
            self.event.emit(events_2.default.START_SERVER, id);
        });
    }
    ;
    /**
     * Stop components.
     *
     * @param  {Boolean} force whether stop the app immediately
     */
    stop(force) {
        if (this.state > STATE_STARTED) {
            logger.warn('[pinus application] application is not running now.');
            return;
        }
        this.state = STATE_STOPED;
        var self = this;
        this.stopTimer = setTimeout(function () {
            process.exit(0);
        }, Constants.TIME.TIME_WAIT_STOP);
        var cancelShutDownTimer = function () {
            if (!!self.stopTimer) {
                clearTimeout(self.stopTimer);
            }
        };
        var shutDown = function () {
            appUtil.stopComps(self.loaded, 0, force, function () {
                cancelShutDownTimer();
                if (force) {
                    process.exit(0);
                }
            });
        };
        var fun = this.get(Constants.KEYWORDS.BEFORE_STOP_HOOK);
        var stopFun = this.lifecycleCbs[Constants.LIFECYCLE.BEFORE_SHUTDOWN];
        if (!!stopFun) {
            stopFun.call(null, this, shutDown, cancelShutDownTimer);
        }
        else if (!!fun) {
            utils.invokeCallback(fun, self, shutDown, cancelShutDownTimer);
        }
        else {
            shutDown();
        }
    }
    ;
    /**
     * Assign `setting` to `val`, or return `setting`'s value.
     *
     * Example:
     *
     *  app.set('key1', 'value1');
     *  app.get('key1');  // 'value1'
     *  app.key1;         // undefined
     *
     *  app.set('key2', 'value2', true);
     *  app.get('key2');  // 'value2'
     *  app.key2;         // 'value2'
     *
     * @param {String} setting the setting of application
     * @param {String} val the setting's value
     * @param {Boolean} attach whether attach the settings to application
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    set(setting, val, attach) {
        this.settings[setting] = val;
        if (attach) {
            this[setting] = val;
        }
        return this;
    }
    ;
    /**
     * Get property from setting
     *
     * @param {String} setting application setting
     * @return {String} val
     * @memberOf Application
     */
    get(setting) {
        return this.settings[setting];
    }
    ;
    /**
     * Check if `setting` is enabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    enabled(setting) {
        return !!this.get(setting);
    }
    ;
    /**
     * Check if `setting` is disabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    disabled(setting) {
        return !this.get(setting);
    }
    ;
    /**
     * Enable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    enable(setting) {
        return this.set(setting, true);
    }
    ;
    /**
     * Disable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    disable(setting) {
        return this.set(setting, false);
    }
    ;
    configure(env, type, fn) {
        var args = [].slice.call(arguments);
        fn = args.pop();
        env = type = Constants.RESERVED.ALL;
        if (args.length > 0) {
            env = args[0];
        }
        if (args.length > 1) {
            type = args[1];
        }
        if (env === Constants.RESERVED.ALL || contains(this.settings.env, env)) {
            if (type === Constants.RESERVED.ALL || contains(this.settings.serverType, type)) {
                fn.call(this);
            }
        }
        return this;
    }
    ;
    registerAdmin(moduleId, module, opts) {
        var modules = this.get(Constants.KEYWORDS.MODULE);
        if (!modules) {
            modules = {};
            this.set(Constants.KEYWORDS.MODULE, modules);
        }
        if (typeof moduleId !== 'string') {
            opts = module;
            module = moduleId;
            if (module) {
                moduleId = (module.moduleId);
                if (!moduleId)
                    moduleId = module.constructor.name;
            }
        }
        if (!moduleId) {
            return;
        }
        modules[moduleId] = {
            moduleId: moduleId,
            module: module,
            opts: opts
        };
    }
    ;
    /**
     * Use plugin.
     *
     * @param  {Object} plugin plugin instance
     * @param  {[type]} opts    (optional) construct parameters for the factory function
     * @memberOf Application
     */
    use(plugin, opts) {
        if (!plugin.components) {
            logger.error('invalid components, no components exist');
            return;
        }
        var self = this;
        opts = opts || {};
        var dir = path.dirname(plugin.components);
        if (!fs.existsSync(plugin.components)) {
            logger.error('fail to find components, find path: %s', plugin.components);
            return;
        }
        fs.readdirSync(plugin.components).forEach(function (filename) {
            if (!/\.js$/.test(filename)) {
                return;
            }
            var name = path.basename(filename, '.js');
            var param = opts[name] || {};
            var absolutePath = path.join(dir, Constants.DIR.COMPONENT, filename);
            if (!fs.existsSync(absolutePath)) {
                logger.error('component %s not exist at %s', name, absolutePath);
            }
            else {
                self.load(require(absolutePath), param);
            }
        });
        // load events
        if (!plugin.events) {
            return;
        }
        else {
            if (!fs.existsSync(plugin.events)) {
                logger.error('fail to find events, find path: %s', plugin.events);
                return;
            }
            fs.readdirSync(plugin.events).forEach(function (filename) {
                if (!/\.js$/.test(filename)) {
                    return;
                }
                var absolutePath = path.join(dir, Constants.DIR.EVENT, filename);
                if (!fs.existsSync(absolutePath)) {
                    logger.error('events %s not exist at %s', filename, absolutePath);
                }
                else {
                    bindEvents(require(absolutePath), self);
                }
            });
        }
    }
    ;
    /**
     * Application transaction. Transcation includes conditions and handlers, if conditions are satisfied, handlers would be executed.
     * And you can set retry times to execute handlers. The transaction log is in file logs/transaction.log.
     *
     * @param {String} name transaction name
     * @param {Object} conditions functions which are called before transaction
     * @param {Object} handlers functions which are called during transaction
     * @param {Number} retry retry times to execute handlers if conditions are successfully executed
     * @memberOf Application
     */
    transaction(name, conditions, handlers, retry) {
        appManager.transaction(name, conditions, handlers, retry);
    }
    ;
    /**
     * Get master server info.
     *
     * @return {Object} master server info, {id, host, port}
     * @memberOf Application
     */
    getMaster() {
        return this.master;
    }
    ;
    /**
     * Get current server info.
     *
     * @return {Object} current server info, {id, serverType, host, port}
     * @memberOf Application
     */
    getCurServer() {
        return this.curServer;
    }
    ;
    /**
     * Get current server id.
     *
     * @return {String|Number} current server id from servers.json
     * @memberOf Application
     */
    getServerId() {
        return this.serverId;
    }
    ;
    /**
     * Get current server type.
     *
     * @return {String|Number} current server type from servers.json
     * @memberOf Application
     */
    getServerType() {
        return this.serverType;
    }
    ;
    /**
     * Get all the current server infos.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServers() {
        return this.servers;
    }
    ;
    /**
     * Get all server infos from servers.json.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServersFromConfig() {
        return this.get(Constants.KEYWORDS.SERVER_MAP);
    }
    ;
    /**
     * Get all the server type.
     *
     * @return {Array} server type list
     * @memberOf Application
     */
    getServerTypes() {
        return this.serverTypes;
    }
    ;
    /**
     * Get server info by server id from current server cluster.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */
    getServerById(serverId) {
        return this.servers[serverId];
    }
    ;
    /**
     * Get server info by server id from servers.json.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */
    getServerFromConfig(serverId) {
        return this.get(Constants.KEYWORDS.SERVER_MAP)[serverId];
    }
    ;
    /**
     * Get server infos by server type.
     *
     * @param  {String} serverType server type
     * @return {Array}      server info list
     * @memberOf Application
     */
    getServersByType(serverType) {
        return this.serverTypeMaps[serverType];
    }
    ;
    /**
     * Check the server whether is a frontend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     *
     * @memberOf Application
     */
    isFrontend(server) {
        server = server || this.getCurServer();
        return !!server && server.frontend === 'true';
    }
    ;
    /**
     * Check the server whether is a backend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     * @memberOf Application
     */
    isBackend(server) {
        server = server || this.getCurServer();
        return !!server && !server.frontend;
    }
    ;
    /**
     * Check whether current server is a master server
     *
     * @return {Boolean}
     * @memberOf Application
     */
    isMaster() {
        return this.serverType === Constants.RESERVED.MASTER;
    }
    ;
    /**
     * Add new server info to current application in runtime.
     *
     * @param {Array} servers new server info list
     * @memberOf Application
     */
    addServers(servers) {
        if (!servers || !servers.length) {
            return;
        }
        var item, slist;
        for (var i = 0, l = servers.length; i < l; i++) {
            item = servers[i];
            // update global server map
            this.servers[item.id] = item;
            // update global server type map
            slist = this.serverTypeMaps[item.serverType];
            if (!slist) {
                this.serverTypeMaps[item.serverType] = slist = [];
            }
            replaceServer(slist, item);
            // update global server type list
            if (this.serverTypes.indexOf(item.serverType) < 0) {
                this.serverTypes.push(item.serverType);
            }
        }
        this.event.emit(events_2.default.ADD_SERVERS, servers);
    }
    ;
    /**
     * Remove server info from current application at runtime.
     *
     * @param  {Array} ids server id list
     * @memberOf Application
     */
    removeServers(ids) {
        if (!ids || !ids.length) {
            return;
        }
        var id, item, slist;
        for (var i = 0, l = ids.length; i < l; i++) {
            id = ids[i];
            item = this.servers[id];
            if (!item) {
                continue;
            }
            // clean global server map
            delete this.servers[id];
            // clean global server type map
            slist = this.serverTypeMaps[item.serverType];
            removeServer(slist, id);
            // TODO: should remove the server type if the slist is empty?
        }
        this.event.emit(events_2.default.REMOVE_SERVERS, ids);
    }
    ;
    /**
     * Replace server info from current application at runtime.
     *
     * @param  {Object} server id map
     * @memberOf Application
     */
    replaceServers(servers) {
        if (!servers) {
            return;
        }
        this.servers = servers;
        this.serverTypeMaps = {};
        this.serverTypes = [];
        var serverArray = [];
        for (var id in servers) {
            var server = servers[id];
            var serverType = server[Constants.RESERVED.SERVER_TYPE];
            var slist = this.serverTypeMaps[serverType];
            if (!slist) {
                this.serverTypeMaps[serverType] = slist = [];
            }
            this.serverTypeMaps[serverType].push(server);
            // update global server type list
            if (this.serverTypes.indexOf(serverType) < 0) {
                this.serverTypes.push(serverType);
            }
            serverArray.push(server);
        }
        this.event.emit(events_2.default.REPLACE_SERVERS, serverArray);
    }
    ;
    /**
     * Add crons from current application at runtime.
     *
     * @param  {Array} crons new crons would be added in application
     * @memberOf Application
     */
    addCrons(crons) {
        if (!crons || !crons.length) {
            logger.warn('crons is not defined.');
            return;
        }
        this.event.emit(events_2.default.ADD_CRONS, crons);
    }
    ;
    /**
     * Remove crons from current application at runtime.
     *
     * @param  {Array} crons old crons would be removed in application
     * @memberOf Application
     */
    removeCrons(crons) {
        if (!crons || !crons.length) {
            logger.warn('ids is not defined.');
            return;
        }
        this.event.emit(events_2.default.REMOVE_CRONS, crons);
    }
    ;
}
exports.Application = Application;
var replaceServer = function (slist, serverInfo) {
    for (var i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === serverInfo.id) {
            slist[i] = serverInfo;
            return;
        }
    }
    slist.push(serverInfo);
};
var removeServer = function (slist, id) {
    if (!slist || !slist.length) {
        return;
    }
    for (var i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === id) {
            slist.splice(i, 1);
            return;
        }
    }
};
var contains = function (str, settings) {
    if (!settings) {
        return false;
    }
    var ts = settings.split("|");
    for (var i = 0, l = ts.length; i < l; i++) {
        if (str === ts[i]) {
            return true;
        }
    }
    return false;
};
var bindEvents = function (Event, app) {
    var emethods = new Event(app);
    for (var m in emethods) {
        if (typeof emethods[m] === 'function') {
            app.event.on(m, emethods[m].bind(emethods));
        }
    }
};
var addFilter = function (app, type, filter) {
    var filters = app.get(type);
    if (!filters) {
        filters = [];
        app.set(type, filters);
    }
    filters.push(filter);
};
//# sourceMappingURL=application.js.map