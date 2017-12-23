/**
 * Scheduler component to schedule message sending.
 */

import * as  DefaultScheduler from '../pushSchedulers/direct';
import { getLogger } from 'pomelo-logger';
import { Application } from '../application';
var logger = getLogger('pomelo', __filename);

export default function (app, opts)
{
    return new PushScheduler(app, opts);
};

export class PushScheduler
{
    scheduler : any;
    constructor(private app : Application, opts)
    {
        opts = opts || {};
        this.scheduler = getScheduler(this, app, opts);
    };

    name = '__pushScheduler__';

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart(cb)
    {
        if (this.isSelectable)
        {
            for (var k in this.scheduler)
            {
                var sch = this.scheduler[k];
                if (typeof sch.start === 'function')
                {
                    sch.start();
                }
            }
            process.nextTick(cb);
        } else if (typeof this.scheduler.start === 'function')
        {
            this.scheduler.start(cb);
        } else
        {
            process.nextTick(cb);
        }
    };

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    stop(force, cb)
    {
        if (this.isSelectable)
        {
            for (var k in this.scheduler)
            {
                var sch = this.scheduler[k];
                if (typeof sch.stop === 'function')
                {
                    sch.stop();
                }
            }
            process.nextTick(cb);
        } else if (typeof this.scheduler.stop === 'function')
        {
            this.scheduler.stop(cb);
        } else
        {
            process.nextTick(cb);
        }
    };

    /**
     * Schedule how the message to send.
     *
     * @param  {Number}   reqId request id
     * @param  {String}   route route string of the message
     * @param  {Object}   msg   message content after encoded
     * @param  {Array}    recvs array of receiver's session id
     * @param  {Object}   opts  options
     * @param  {Function} cb
     */

    schedule(reqId, route, msg, recvs, opts, cb)
    {
        var self = this;
        if (self.isSelectable)
        {
            if (typeof self.selector === 'function')
            {
                self.selector(reqId, route, msg, recvs, opts, function (id)
                {
                    if (self.scheduler[id] && typeof self.scheduler[id].schedule === 'function')
                    {
                        self.scheduler[id].schedule(reqId, route, msg, recvs, opts, cb);
                    } else
                    {
                        logger.error('invalid pushScheduler id, id: %j', id);
                    }
                });
            } else
            {
                logger.error('the selector for pushScheduler is not a function, selector: %j', self.selector);
            }
        } else
        {
            if (typeof self.scheduler.schedule === 'function')
            {
                self.scheduler.schedule(reqId, route, msg, recvs, opts, cb);
            } else
            {
                logger.error('the scheduler does not have a schedule function, scheduler: %j', self.scheduler);
            }
        }
    };
}
var getScheduler = function (pushSchedulerComp, app, opts)
{
    var scheduler = opts.scheduler || DefaultScheduler;
    if (typeof scheduler === 'function')
    {
        return scheduler(app, opts);
    }

    if (Array.isArray(scheduler))
    {
        var res = {};
        scheduler.forEach(function (sch)
        {
            if (typeof sch.scheduler === 'function')
            {
                res[sch.id] = sch.scheduler(app, sch.options);
            } else
            {
                res[sch.id] = sch.scheduler;
            }
        });
        pushSchedulerComp.isSelectable = true;
        pushSchedulerComp.selector = opts.selector;
        return res;
    }

    return scheduler;
};
