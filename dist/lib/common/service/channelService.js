"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const countDownLatch = require("../../util/countDownLatch");
const utils = require("../../util/utils");
const channelRemote_1 = require("../remote/frontend/channelRemote");
const pinus_logger_1 = require("pinus-logger");
var logger = pinus_logger_1.getLogger('pinus', __filename);
/**
 * constant
 */
var ST_INITED = 0;
var ST_DESTROYED = 1;
/**
 * Create and maintain channels for server local.
 *
 * ChannelService is created by channel component which is a default loaded
 * component of pinus and channel service would be accessed by `app.get('channelService')`.
 *
 * @class
 * @constructor
 */
class ChannelService {
    constructor(app, opts) {
        this.apushMessageByUids = utils.promisify(this.pushMessageByUids);
        this.abroadcast = utils.promisify(this.broadcast);
        opts = opts || {};
        this.app = app;
        this.channels = {};
        this.prefix = opts.prefix;
        this.store = opts.store;
        this.broadcastFilter = opts.broadcastFilter;
        this.channelRemote = new channelRemote_1.ChannelRemote(app);
    }
    ;
    start(cb) {
        restoreChannel(this, cb);
    }
    ;
    /**
     * Create channel with name.
     *
     * @param {String} name channel's name
     * @memberOf ChannelService
     */
    createChannel(name) {
        if (this.channels[name]) {
            return this.channels[name];
        }
        var c = new Channel(name, this);
        addToStore(this, genKey(this), genKey(this, name));
        this.channels[name] = c;
        return c;
    }
    ;
    /**
     * Get channel by name.
     *
     * @param {String} name channel's name
     * @param {Boolean} create if true, create channel
     * @return {Channel}
     * @memberOf ChannelService
     */
    getChannel(name, create) {
        var channel = this.channels[name];
        if (!channel && !!create) {
            channel = this.channels[name] = new Channel(name, this);
            addToStore(this, genKey(this), genKey(this, name));
        }
        return channel;
    }
    ;
    /**
     * Destroy channel by name.
     *
     * @param {String} name channel name
     * @memberOf ChannelService
     */
    destroyChannel(name) {
        delete this.channels[name];
        removeFromStore(this, genKey(this), genKey(this, name));
        removeAllFromStore(this, genKey(this, name));
    }
    ;
    pushMessageByUids(route, msg, uids, opts, cb) {
        if (typeof route !== 'string') {
            cb = opts;
            opts = uids;
            uids = msg;
            msg = route;
            route = msg.route;
        }
        if (!cb && typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        if (!uids || uids.length === 0) {
            utils.invokeCallback(cb, new Error('uids should not be empty'));
            return;
        }
        var groups = {}, record;
        for (var i = 0, l = uids.length; i < l; i++) {
            record = uids[i];
            add(record.uid, record.sid, groups);
        }
        sendMessageByGroup(this, route, msg, groups, opts, cb);
    }
    ;
    broadcast(stype, route, msg, opts, cb) {
        var app = this.app;
        var namespace = 'sys';
        var service = 'channelRemote';
        var method = 'broadcast';
        var servers = app.getServersByType(stype);
        if (!servers || servers.length === 0) {
            // server list is empty
            utils.invokeCallback(cb);
            return;
        }
        var count = servers.length;
        var successFlag = false;
        var latch = countDownLatch.createCountDownLatch(count, function () {
            if (!successFlag) {
                utils.invokeCallback(cb, new Error('broadcast fails'));
                return;
            }
            utils.invokeCallback(cb, null);
        });
        var genCB = function (serverId) {
            return function (err) {
                if (err) {
                    logger.error('[broadcast] fail to push message to serverId: ' + serverId + ', err:' + err.stack);
                    latch.done();
                    return;
                }
                successFlag = true;
                latch.done();
            };
        };
        var self = this;
        var sendMessage = function (serverId) {
            return (function () {
                if (serverId === app.serverId) {
                    self.channelRemote[method](route, msg, opts, genCB());
                }
                else {
                    app.rpcInvoke(serverId, {
                        namespace: namespace, service: service,
                        method: method, args: [route, msg, opts]
                    }, genCB(serverId));
                }
            }());
        };
        opts = { type: 'broadcast', userOptions: opts || {} };
        // for compatiblity 
        opts.isBroadcast = true;
        if (opts.userOptions) {
            opts.binded = opts.userOptions.binded;
            opts.filterParam = opts.userOptions.filterParam;
        }
        for (var i = 0, l = count; i < l; i++) {
            sendMessage(servers[i].id);
        }
    }
    ;
}
exports.ChannelService = ChannelService;
/**
 * Channel maintains the receiver collection for a subject. You can
 * add users into a channel and then broadcast message to them by channel.
 *
 * @class channel
 * @constructor
 */
class Channel {
    constructor(name, service) {
        this.apushMessage = utils.promisify(this.pushMessage);
        this.name = name;
        this.groups = {}; // group map for uids. key: sid, value: [uid]
        this.records = {}; // member records. key: uid
        this.__channelService__ = service;
        this.state = ST_INITED;
        this.userAmount = 0;
    }
    ;
    /**
     * Add user to channel.
     *
     * @param {Number} uid user id
     * @param {String} sid frontend server id which user has connected to
     */
    add(uid, sid) {
        if (this.state > ST_INITED) {
            return false;
        }
        else {
            var res = add(uid, sid, this.groups);
            if (res) {
                this.records[uid] = { sid: sid, uid: uid };
                this.userAmount = this.userAmount + 1;
            }
            addToStore(this.__channelService__, genKey(this.__channelService__, this.name), genValue(sid, uid));
            return res;
        }
    }
    ;
    /**
     * Remove user from channel.
     *
     * @param {Number} uid user id
     * @param {String} sid frontend server id which user has connected to.
     * @return [Boolean] true if success or false if fail
     */
    leave(uid, sid) {
        if (!uid || !sid) {
            return false;
        }
        var res = deleteFrom(uid, sid, this.groups[sid]);
        if (res) {
            delete this.records[uid];
            this.userAmount = this.userAmount - 1;
        }
        if (this.userAmount < 0)
            this.userAmount = 0; //robust
        removeFromStore(this.__channelService__, genKey(this.__channelService__, this.name), genValue(sid, uid));
        if (this.groups[sid] && this.groups[sid].length === 0) {
            delete this.groups[sid];
        }
        return res;
    }
    ;
    /**
     * Get channel UserAmount in a channel.
    
     *
     * @return {number } channel member amount
     */
    getUserAmount() {
        return this.userAmount;
    }
    ;
    /**
     * Get channel members.
     *
     * <b>Notice:</b> Heavy operation.
     *
     * @return {Array} channel member uid list
     */
    getMembers() {
        var res = [], groups = this.groups;
        var group, i, l;
        for (var sid in groups) {
            group = groups[sid];
            for (i = 0, l = group.length; i < l; i++) {
                res.push(group[i]);
            }
        }
        return res;
    }
    ;
    /**
     * Get Member info.
     *
     * @param  {String} uid user id
     * @return {Object} member info
     */
    getMember(uid) {
        return this.records[uid];
    }
    ;
    /**
     * Destroy channel.
     */
    destroy() {
        this.state = ST_DESTROYED;
        this.__channelService__.destroyChannel(this.name);
    }
    ;
    /**
     * Push message to all the members in the channel
     *
     * @param {String} route message route
     * @param {Object} msg message that would be sent to client
     * @param {Object} opts user-defined push options, optional
     * @param {Function} cb callback function
     */
    pushMessage(route, msg, opts, cb) {
        if (this.state !== ST_INITED) {
            utils.invokeCallback(new Error('channel is not running now'));
            return;
        }
        if (typeof route !== 'string') {
            cb = opts;
            opts = msg;
            msg = route;
            route = msg.route;
        }
        if (!cb && typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        sendMessageByGroup(this.__channelService__, route, msg, this.groups, opts, cb);
    }
    ;
}
exports.Channel = Channel;
/**
 * add uid and sid into group. ignore any uid that uid not specified.
 *
 * @param uid user id
 * @param sid server id
 * @param groups {Object} grouped uids, , key: sid, value: [uid]
 */
var add = function (uid, sid, groups) {
    if (!sid) {
        logger.warn('ignore uid %j for sid not specified.', uid);
        return false;
    }
    var group = groups[sid];
    if (!group) {
        group = [];
        groups[sid] = group;
    }
    group.push(uid);
    return true;
};
/**
 * delete element from array
 */
var deleteFrom = function (uid, sid, group) {
    if (!uid || !sid || !group) {
        return false;
    }
    for (var i = 0, l = group.length; i < l; i++) {
        if (group[i] === uid) {
            group.splice(i, 1);
            return true;
        }
    }
    return false;
};
/**
 * push message by group
 *
 * @param route {String} route route message
 * @param msg {Object} message that would be sent to client
 * @param groups {Object} grouped uids, , key: sid, value: [uid]
 * @param opts {Object} push options
 * @param cb {Function} cb(err)
 *
 * @api private
 */
var sendMessageByGroup = function (channelService, route, msg, groups, opts, cb) {
    var app = channelService.app;
    var namespace = 'sys';
    var service = 'channelRemote';
    var method = 'pushMessage';
    var count = utils.size(groups);
    var successFlag = false;
    var failIds = [];
    logger.debug('[%s] channelService sendMessageByGroup route: %s, msg: %j, groups: %j, opts: %j', app.serverId, route, msg, groups, opts);
    if (count === 0) {
        // group is empty
        utils.invokeCallback(cb);
        return;
    }
    var latch = countDownLatch.createCountDownLatch(count, function () {
        if (!successFlag) {
            utils.invokeCallback(cb, new Error('all uids push message fail'));
            return;
        }
        utils.invokeCallback(cb, null, failIds);
    });
    var rpcCB = function (serverId) {
        return function (err, fails) {
            if (err) {
                logger.error('[pushMessage] fail to dispatch msg to serverId: ' + serverId + ', err:' + err.stack);
                latch.done();
                return;
            }
            if (fails) {
                failIds = failIds.concat(fails);
            }
            successFlag = true;
            latch.done();
        };
    };
    opts = { type: 'push', userOptions: opts || {} };
    // for compatiblity
    opts.isPush = true;
    var sendMessage = function (sid) {
        return (function () {
            if (sid === app.serverId) {
                channelService.channelRemote[method](route, msg, groups[sid], opts, rpcCB(sid));
            }
            else {
                app.rpcInvoke(sid, {
                    namespace: namespace, service: service,
                    method: method, args: [route, msg, groups[sid], opts]
                }, rpcCB(sid));
            }
        })();
    };
    var group;
    for (var sid in groups) {
        group = groups[sid];
        if (group && group.length > 0) {
            sendMessage(sid);
        }
        else {
            // empty group
            process.nextTick(rpcCB(sid));
        }
    }
};
var restoreChannel = function (self, cb) {
    if (!self.store) {
        utils.invokeCallback(cb);
        return;
    }
    else {
        loadAllFromStore(self, genKey(self), function (err, list) {
            if (!!err) {
                utils.invokeCallback(cb, err);
                return;
            }
            else {
                if (!list.length || !Array.isArray(list)) {
                    utils.invokeCallback(cb);
                    return;
                }
                var load = function (key) {
                    return (function () {
                        loadAllFromStore(self, key, function (err, items) {
                            for (var j = 0; j < items.length; j++) {
                                var array = items[j].split(':');
                                var sid = array[0];
                                var uid = array[1];
                                var channel = self.channels[name];
                                var res = add(uid, sid, channel.groups);
                                if (res) {
                                    channel.records[uid] = { sid: sid, uid: uid };
                                }
                            }
                        });
                    })();
                };
                for (var i = 0; i < list.length; i++) {
                    var name = list[i].slice(genKey(self).length + 1);
                    self.channels[name] = new Channel(name, self);
                    load(list[i]);
                }
                utils.invokeCallback(cb);
            }
        });
    }
};
var addToStore = function (self, key, value) {
    if (!!self.store) {
        self.store.add(key, value, function (err) {
            if (!!err) {
                logger.error('add key: %s value: %s to store, with err: %j', key, value, err.stack);
            }
        });
    }
};
var removeFromStore = function (self, key, value) {
    if (!!self.store) {
        self.store.remove(key, value, function (err) {
            if (!!err) {
                logger.error('remove key: %s value: %s from store, with err: %j', key, value, err.stack);
            }
        });
    }
};
var loadAllFromStore = function (self, key, cb) {
    if (!!self.store) {
        self.store.load(key, function (err, list) {
            if (!!err) {
                logger.error('load key: %s from store, with err: %j', key, err.stack);
                utils.invokeCallback(cb, err);
            }
            else {
                utils.invokeCallback(cb, null, list);
            }
        });
    }
};
var removeAllFromStore = function (self, key) {
    if (!!self.store) {
        self.store.removeAll(key, function (err) {
            if (!!err) {
                logger.error('remove key: %s all members from store, with err: %j', key, err.stack);
            }
        });
    }
};
var genKey = function (self, name) {
    if (!!name) {
        return self.prefix + ':' + self.app.serverId + ':' + name;
    }
    else {
        return self.prefix + ':' + self.app.serverId;
    }
};
var genValue = function (sid, uid) {
    return sid + ':' + uid;
};
//# sourceMappingURL=channelService.js.map