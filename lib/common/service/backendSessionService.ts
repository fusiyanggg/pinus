/**
 * backend session service for backend session
 */
import * as utils from '../../util/utils';
import { Application } from '../../application';
import { Component } from '../../interfaces/Component';

var EXPORTED_FIELDS = ['id', 'frontendId', 'uid', 'settings'];

/**
 * Service that maintains backend sessions and the communication with frontend
 * servers.
 *
 * BackendSessionService would be created in each server process and maintains
 * backend sessions for current process and communicates with the relative
 * frontend servers.
 *
 * BackendSessionService instance could be accessed by
 * `app.get('backendSessionService')` or app.backendSessionService.
 *
 * @class
 * @constructor
 */
export class BackendSessionService implements Component
{
    app: Application;
    name: string;

    constructor(app)
    {
        this.app = app;
    };

    create(opts)
    {
        if (!opts)
        {
            throw new Error('opts should not be empty.');
        }
        return new BackendSession(opts, this);
    };

    /**
     * Get backend session by frontend server id and session id.
     *
     * @param  {String}   frontendId frontend server id that session attached
     * @param  {String}   sid        session id
     * @param  {Function} cb         callback function. args: cb(err, BackendSession)
     *
     * @memberOf BackendSessionService
     */
    get(frontendId, sid, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'getBackendSessionBySid';
        var args = [sid];
        rpcInvoke(this.app, frontendId, namespace, service, method,
            args, BackendSessionCB.bind(null, this, cb));
    };

    /**
     * Get backend sessions by frontend server id and user id.
     *
     * @param  {String}   frontendId frontend server id that session attached
     * @param  {String}   uid        user id binded with the session
     * @param  {Function} cb         callback function. args: cb(err, BackendSessions)
     *
     * @memberOf BackendSessionService
     */
    getByUid(frontendId, uid, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'getBackendSessionsByUid';
        var args = [uid];
        rpcInvoke(this.app, frontendId, namespace, service, method,
            args, BackendSessionCB.bind(null, this, cb));
    };

    /**
     * Kick a session by session id.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     */
    kickBySid(frontendId, sid, reason, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'kickBySid';
        var args = [sid];
        if (typeof reason === 'function')
        {
            cb = reason;
        } else
        {
            args.push(reason);
        }
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    /**
     * Kick sessions by user id.
     *
     * @param  {String}          frontendId cooperating frontend server id
     * @param  {Number|String}   uid        user id
     * @param  {String}          reason     kick reason
     * @param  {Function}        cb         callback function
     *
     * @memberOf BackendSessionService
     */
    kickByUid(frontendId, uid, reason, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'kickByUid';
        var args = [uid];
        if (typeof reason === 'function')
        {
            cb = reason;
        } else
        {
            args.push(reason);
        }
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    /**
     * Bind the session with the specified user id. It would finally invoke the
     * the sessionService.bind in the cooperating frontend server.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   uid        user id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    bind(frontendId, sid, uid, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'bind';
        var args = [sid, uid];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    /**
     * Unbind the session with the specified user id. It would finally invoke the
     * the sessionService.unbind in the cooperating frontend server.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   uid        user id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    unbind(frontendId, sid, uid, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'unbind';
        var args = [sid, uid];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    /**
     * Push the specified customized change to the frontend internal session.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   key        key in session that should be push
     * @param  {Object}   value      value in session, primitive js object
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    push(frontendId, sid, key, value, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'push';
        var args = [sid, key, value];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    /**
     * Push all the customized changes to the frontend internal session.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {Object}   settings   key/values in session that should be push
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    pushAll(frontendId, sid, settings, cb)
    {
        var namespace = 'sys';
        var service = 'sessionRemote';
        var method = 'pushAll';
        var args = [sid, settings];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    };

    aget = utils.promisify(this.get.bind(this));
    agetByUid = utils.promisify(this.getByUid.bind(this));
    akickBySid = utils.promisify(this.kickBySid.bind(this));
    akickByUid = utils.promisify(this.kickByUid.bind(this));
}

var rpcInvoke = function(app, sid, namespace, service, method, args, cb) {
  app.rpcInvoke(sid, {namespace: namespace, service: service, method: method, args: args}, cb);
};

/**
 * BackendSession is the proxy for the frontend internal session passed to handlers and
 * it helps to keep the key/value pairs for the server locally.
 * Internal session locates in frontend server and should not be accessed directly.
 *
 * The mainly operation on backend session should be read and any changes happen in backend
 * session is local and would be discarded in next request. You have to push the
 * changes to the frontend manually if necessary. Any push would overwrite the last push
 * of the same key silently and the changes would be saw in next request.
 * And you have to make sure the transaction outside if you would push the session
 * concurrently in different processes.
 *
 * See the api below for more details.
 *
 * @class
 * @constructor
 */
export class BackendSession
{
    id: number;
    frontendId: string;
    uid: string;
    settings: any;
    __sessionService__: BackendSessionService;
    constructor(opts, service: BackendSessionService)
    {
        for (var f in opts)
        {
            this[f] = opts[f];
        }
        this.__sessionService__ = service;
    };

    /**
     * Bind current session with the user id. It would push the uid to frontend
     * server and bind  uid to the frontend internal session.
     *
     * @param  {Number|String}   uid user id
     * @param  {Function} cb  callback function
     *
     * @memberOf BackendSession
     */
    bind(uid, cb)
    {
        var self = this;
        this.__sessionService__.bind(this.frontendId, this.id, uid, function (err)
        {
            if (!err)
            {
                self.uid = uid;
            }
            utils.invokeCallback(cb, err);
        });
    };

    /**
     * Unbind current session with the user id. It would push the uid to frontend
     * server and unbind uid from the frontend internal session.
     *
     * @param  {Number|String}   uid user id
     * @param  {Function} cb  callback function
     *
     * @memberOf BackendSession
     */
    unbind(uid, cb)
    {
        var self = this;
        this.__sessionService__.unbind(this.frontendId, this.id, uid, function (err)
        {
            if (!err)
            {
                self.uid = null;
            }
            utils.invokeCallback(cb, err);
        });
    };

    /**
     * Set the key/value into backend session.
     *
     * @param {String} key   key
     * @param {Object} value value
     */
    set(key, value)
    {
        this.settings[key] = value;
    };

    /**
     * Get the value from backend session by key.
     *
     * @param  {String} key key
     * @return {Object}     value
     */
    get(key)
    {
        return this.settings[key];
    };

    /**
     * Push the key/value in backend session to the front internal session.
     *
     * @param  {String}   key key
     * @param  {Function} cb  callback function
     */
    push(key, cb)
    {
        this.__sessionService__.push(this.frontendId, this.id, key, this.get(key), cb);
    };

    /**
     * Push all the key/values in backend session to the frontend internal session.
     *
     * @param  {Function} cb callback function
     */
    pushAll(cb)
    {
        this.__sessionService__.pushAll(this.frontendId, this.id, this.settings, cb);
    };

    abind = utils.promisify(this.bind.bind(this));
    aunbind = utils.promisify(this.unbind.bind(this));
    apush = utils.promisify(this.push.bind(this));
    apushAll = utils.promisify(this.pushAll.bind(this));

    /**
     * Export the key/values for serialization.
     *
     * @api private
     */
    export()
    {
        var res = {};
        EXPORTED_FIELDS.forEach(function (field)
        {
            res[field] = this[field];
        });
        return res;
    };
}

var BackendSessionCB = function(service, cb, err, sinfo) {
  if(err) {
    utils.invokeCallback(cb, err);
    return;
  }

  if(!sinfo) {
    utils.invokeCallback(cb);
    return;
  }
  var sessions = [];
  if(Array.isArray(sinfo)){
      // #getByUid
      for(var i = 0,k = sinfo.length;i<k;i++){
          sessions.push(service.create(sinfo[i]));
      }
  }
  else{
      // #get
      sessions = service.create(sinfo);
  }
  utils.invokeCallback(cb, null, sessions);
};