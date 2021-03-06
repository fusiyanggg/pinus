/// <reference types="node" />
/*!
 * Pomelo -- proto
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */
import { EventEmitter } from 'events';
import { IComponent } from './interfaces/Component';
import { DictionaryComponent } from './components/dictionary';
import { PushSchedulerComponent } from './components/pushScheduler';
import { BackendSessionService } from './common/service/backendSessionService';
import { ChannelService } from './common/service/channelService';
import { SessionComponent } from './components/session';
import { ServerComponent } from './components/server';
import { RemoteComponent } from './components/remote';
import { ProxyComponent } from './components/proxy';
import { ProtobufComponent } from './components/protobuf';
import { MonitorComponent } from './components/monitor';
import { MasterComponent } from './components/master';
import { ConnectorComponent } from './components/connector';
import { ConnectionComponent } from './components/connection';
import { SessionService } from './common/service/sessionService';
import { ObjectType } from './interfaces/define';
import { IModule, IModuleFactory } from 'pinus-admin';
import { ChannelComponent } from './components/channel';
import { BackendSessionComponent } from './components/backendSession';
export declare type ConfigureCallback = () => void;
export declare type AConfigureFunc1 = () => Promise<void>;
export declare type AConfigureFunc2 = (env: string) => Promise<void>;
export declare type AConfigureFunc3 = (env: string, type: string) => Promise<void>;
export declare class Application {
    loaded: any[];
    components: {
        __backendSession__?: BackendSessionComponent;
        __channel__?: ChannelComponent;
        __connection__?: ConnectionComponent;
        __connector__?: ConnectorComponent;
        __dictionary__?: DictionaryComponent;
        __master__?: MasterComponent;
        __monitor__?: MonitorComponent;
        __protobuf__?: ProtobufComponent;
        __proxy__?: ProxyComponent;
        __remote__?: RemoteComponent;
        __server__?: ServerComponent;
        __session__?: SessionComponent;
        __pushScheduler__?: PushSchedulerComponent;
        [key: string]: IComponent;
    };
    sessionService?: SessionService;
    backendSessionService?: BackendSessionService;
    channelService?: ChannelService;
    settings: any;
    event: EventEmitter;
    serverId: any;
    serverType: any;
    curServer: any;
    startTime: any;
    master: any;
    servers: {};
    serverTypeMaps: {};
    serverTypes: any[];
    lifecycleCbs: {};
    clusterSeq: {};
    state: number;
    base: string;
    startId: string;
    type: string;
    stopTimer: any;
    /**
     * Initialize the server.
     *
     *   - setup default configuration
     */
    init(opts: any): void;
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
    getBase(): any;
    /**
     * Override require method in application
     *
     * @param {String} relative path of file
     *
     * @memberOf Application
     */
    require(ph: any): any;
    /**
     * Configure logger with {$base}/config/log4js.json
     *
     * @param {Object} logger pinus-logger instance without configuration
     *
     * @memberOf Application
     */
    configureLogger(logger: any): void;
    /**
     * add a filter to before and after filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    filter(filter: any): void;
    /**
     * Add before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    before(bf: any): void;
    /**
     * Add after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    after(af: any): void;
    /**
     * add a global filter to before and after global filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    globalFilter(filter: any): void;
    /**
     * Add global before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    globalBefore(bf: any): void;
    /**
     * Add global after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    globalAfter(af: any): void;
    /**
     * Add rpc before filter.
     *
     * @param {Object|Function} bf before fileter, bf(serverId, msg, opts, next)
     * @memberOf Application
     */
    rpcBefore(bf: any): void;
    /**
     * Add rpc after filter.
     *
     * @param {Object|Function} af after filter, `af(serverId, msg, opts, next)`
     * @memberOf Application
     */
    rpcAfter(af: any): void;
    /**
     * add a rpc filter to before and after rpc filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    rpcFilter(filter: any): void;
    /**
     * Load component
     *
     * @param  {String} name    (optional) name of the component
     * @param  {Object} component component instance or factory function of the component
     * @param  {[type]} opts    (optional) construct parameters for the factory function
     * @return {Object}     app instance for chain invoke
     * @memberOf Application
     */
    load<T extends IComponent>(component: ObjectType<T>, opts?: any): T;
    load<T extends IComponent>(name: string, component: ObjectType<T>, opts?: any): T;
    load<T extends IComponent>(component: T, opts?: any): T;
    load<T extends IComponent>(name: string, component: T, opts?: any): T;
    /**
     * Load Configure json file to settings.(support different enviroment directory & compatible for old path)
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @param {Boolean} reload whether reload after change default false
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfigBaseApp(key: any, val: any, reload?: boolean): void;
    /**
     * Load Configure json file to settings.
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfig(key: any, val: any): void;
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
    route(serverType: any, routeFunc: any): this;
    /**
     * Set before stop function. It would perform before servers stop.
     *
     * @param  {Function} fun before close function
     * @return {Void}
     * @memberOf Application
     */
    beforeStopHook(fun: any): void;
    /**
     * Start application. It would load the default components and start all the loaded components.
     *
     * @param  {Function} cb callback function
     * @memberOf Application
     */
    start(cb?: (err?: Error, result?: void) => void): void;
    /**
     * Lifecycle callback for after start.
     *
     * @param  {Function} cb callback function
     * @return {Void}
     */
    afterStart(cb?: Function): void;
    /**
     * Stop components.
     *
     * @param  {Boolean} force whether stop the app immediately
     */
    stop(force: any): void;
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
    set(setting: any, val: any, attach?: boolean): this;
    /**
     * Get property from setting
     *
     * @param {String} setting application setting
     * @return {String} val
     * @memberOf Application
     */
    get(setting: any): any;
    /**
     * Check if `setting` is enabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    enabled(setting: any): boolean;
    /**
     * Check if `setting` is disabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    disabled(setting: any): boolean;
    /**
     * Enable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    enable(setting: any): this;
    /**
     * Disable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    disable(setting: any): this;
    /**
     * Configure callback for the specified env and server type.
     * When no env is specified that callback will
     * be invoked for all environments and when no type is specified
     * that callback will be invoked for all server types.
     *
     * Examples:
     *
     *  app.configure(function(){
     *    // executed for all envs and server types
     *  });
     *
     *  app.configure('development', function(){
     *    // executed development env
     *  });
     *
     *  app.configure('development', 'connector', function(){
     *    // executed for development env and connector server type
     *  });
     *
     * @param {String} env application environment
     * @param {Function} fn callback function
     * @param {String} type server type
     * @return {Application} for chaining
     * @memberOf Application
     */
    configure(fn: ConfigureCallback): Application;
    configure(env: string, fn: ConfigureCallback): Application;
    configure(env: string, type: string, fn: ConfigureCallback): Application;
    /**
     * Register admin modules. Admin modules is the extends point of the monitor system.
     *
     * @param {String} module (optional) module id or provoided by module.moduleId
     * @param {Object} module module object or factory function for module
     * @param {Object} opts construct parameter for module
     * @memberOf Application
     */
    registerAdmin(module: IModule, opts?: any): any;
    registerAdmin(moduleId: string, module?: IModule, opts?: any): any;
    registerAdmin(module: IModuleFactory, opts?: any): any;
    registerAdmin(moduleId: string, module?: IModuleFactory, opts?: any): any;
    /**
     * Use plugin.
     *
     * @param  {Object} plugin plugin instance
     * @param  {[type]} opts    (optional) construct parameters for the factory function
     * @memberOf Application
     */
    use(plugin: any, opts: any): void;
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
    transaction(name: any, conditions: any, handlers: any, retry: any): void;
    /**
     * Get master server info.
     *
     * @return {Object} master server info, {id, host, port}
     * @memberOf Application
     */
    getMaster(): any;
    /**
     * Get current server info.
     *
     * @return {Object} current server info, {id, serverType, host, port}
     * @memberOf Application
     */
    getCurServer(): any;
    /**
     * Get current server id.
     *
     * @return {String|Number} current server id from servers.json
     * @memberOf Application
     */
    getServerId(): any;
    /**
     * Get current server type.
     *
     * @return {String|Number} current server type from servers.json
     * @memberOf Application
     */
    getServerType(): any;
    /**
     * Get all the current server infos.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServers(): {};
    /**
     * Get all server infos from servers.json.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServersFromConfig(): any;
    /**
     * Get all the server type.
     *
     * @return {Array} server type list
     * @memberOf Application
     */
    getServerTypes(): any[];
    /**
     * Get server info by server id from current server cluster.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */
    getServerById(serverId: any): any;
    /**
     * Get server info by server id from servers.json.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */
    getServerFromConfig(serverId: any): any;
    /**
     * Get server infos by server type.
     *
     * @param  {String} serverType server type
     * @return {Array}      server info list
     * @memberOf Application
     */
    getServersByType(serverType: any): any;
    /**
     * Check the server whether is a frontend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     *
     * @memberOf Application
     */
    isFrontend(server?: any): boolean;
    /**
     * Check the server whether is a backend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     * @memberOf Application
     */
    isBackend(server: any): boolean;
    /**
     * Check whether current server is a master server
     *
     * @return {Boolean}
     * @memberOf Application
     */
    isMaster(): boolean;
    /**
     * Add new server info to current application in runtime.
     *
     * @param {Array} servers new server info list
     * @memberOf Application
     */
    addServers(servers: any): void;
    /**
     * Remove server info from current application at runtime.
     *
     * @param  {Array} ids server id list
     * @memberOf Application
     */
    removeServers(ids: any): void;
    /**
     * Replace server info from current application at runtime.
     *
     * @param  {Object} server id map
     * @memberOf Application
     */
    replaceServers(servers: any): void;
    /**
     * Add crons from current application at runtime.
     *
     * @param  {Array} crons new crons would be added in application
     * @memberOf Application
     */
    addCrons(crons: any): void;
    /**
     * Remove crons from current application at runtime.
     *
     * @param  {Array} crons old crons would be removed in application
     * @memberOf Application
     */
    removeCrons(crons: any): void;
    astart: () => Promise<void>;
    aconfigure: AConfigureFunc1 | AConfigureFunc2 | AConfigureFunc3;
    rpc?: any;
    sysrpc?: any;
    /**
     * Proxy for rpc client rpcInvoke.
     *
     * @param {String}   serverId remote server id
     * @param {Object}   msg      rpc message: {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {Function} cb      callback function
     */
    rpcInvoke?: (serverId: string, msg: any, cb: Function) => void;
}
