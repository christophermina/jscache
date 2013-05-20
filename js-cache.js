/* ===================================================
 * jscache.js v0.5.4
 * ===================================================
 * Copyright 2012 Christopher Mina
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/**
 * Global options:
 *
 * During initialize, pass in global options:
 *
 * {
 *      ttl,        // Time to live in seconds (defaults to 60 seconds)
 *      refresh,    // The rate at which the cleaner runs (defaults to 61 seconds)
 *
 *      //NodeJS only
 *      cluster: {
 *          enabled: true | false,   //default true -- Determines if we enable cluster messages to keep caching in sync between processes
 *          nullOnSet: true | false  //default false -- Determins if we copy the value passed in from another process, or simply set our
 *                                                      local copy to null, forcing a refresh next time.
 *      }
 * }
 */
(function() {

    //See if we're on node
    if (typeof exports !== 'undefined' && this.exports !== exports) {
        //Ensure we have underscore loaded
        if (!_) {
            _ = require('underscore');
        }
    }

    if (!_) {
        throw new Error("js-cache: Underscore is undefined");
    }

    var JSCache = (function(options) {

        this.initialize(options);

        this.setUpClustered();
    });

    _.extend(JSCache.prototype, {

        ttl: 60000,
        refresh: 61000,
        cache: {},
        regions: {},
        nocluster: false,
        clusterNullOnSet: false,

        initialize: function(options) {
            if (options.ttl) {
                options.ttl = options.ttl * 1000;
            }
            if (options.refresh) {
                options.refresh = options.refresh * 1000;
            }

            //Give ability to remove all cluster features, even if running in cluster
            if (options.cluster) {
                if (options.cluster.enabled != null) {
                    this.nocluster = !options.cluster.enabled;
                }

                if (options.cluster.nullOnSet) {
                    this.clusterNullOnSet = true;
                }
            }


            this.ttl = options.ttl || this.ttl;
            this.refresh = options.refresh || this.refresh;

            var self = this;
            this.setUpCheckTimer();
        },


        setUpCheckTimer: function(region) {
            var intervalId = setInterval(this.checkTTL.bind(this), this.refresh, region)
            this.getRegion(region).__intervalId = intervalId;
        },


        checkTTL: function(region) {
            var cache = this.getRegion(region);
            _.each(cache, function(obj, key, _cache) {
                if (obj.exp < new Date().getTime()) {
                    delete _cache[key];
                }
            }, this);

            if (region && Object.keys(cache).length == 1) {
                var intervalId = cache.__intervalId;
                clearInterval(intervalId);
                delete this.regions[region];
            }
        },


        set: function(key, value, ttl, region) {
            if (!this.nocluster && this.clusterWorker != null) {
                process.send({
                    cache:true,
                    type:"set",
                    key:key,
                    value:value,
                    ttl:ttl,
                    region:region
                });
            }

            this._set(key, value, ttl, region);
        },


        _clusterSet: function(msg) {
            this._set(msg.key, (this.clusterNullOnSet ? null : msg.value), msg.ttl, msg.region)
        },


        _set: function(key, value, ttl, region) {
            if (_.isString(ttl)) {
                region = ttl;
                ttl = null;
            }

            if (ttl) {
                ttl = ttl * 1000;
            }
            ttl = ttl || this.ttl;
            var cache = this.getRegion(region);

            var d = new Date();
            cache[key] = {value:value, exp:d.setTime(d.getTime() + ttl) };
        },


        get: function(key, touch, ttl, region) {
            if (_.isString(touch)) {
                region = touch;
                touch = ttl = null;
            } else if (_.isString(ttl)) {
                region = ttl;
                ttl = null;
            }

            var cache = this.getRegion(region);
            if (cache.hasOwnProperty(key)) {
                var obj = cache[key];
                if (obj.exp < new Date().getTime()) {
                    delete cache[key];
                    return null;
                }

                if (touch === true) {
                    this.touch(key, ttl, region);
                }

                return cache[key].value;
            };
            return null;
        },


        touch: function(key, ttl, region) {
            if (!this.nocluster && this.clusterWorker != null) {
                process.send({
                    cache:true,
                    type:"touch",
                    key:key,
                    ttl:ttl,
                    region:region
                });
            }

            this._touch(key, ttl, region);
        },


        _clusterTouch: function(msg) {
            this._touch(msg.key, msg.ttl, msg.region);
        },


        _touch: function(key, ttl, region) {
            if (_.isString(ttl)){
                region = ttl;
                ttl = null;
            }

            var cache = this.getRegion(region);
            if (ttl) {
                ttl = ttl * 1000;
            }
            ttl = ttl || this.ttl;

            if (cache.hasOwnProperty(key)) {
                var obj = cache[key];
                if (obj.exp < new Date().getTime()) {
                    delete cache[key];
                    return;
                }
                var d = new Date();
                obj.exp = d.setTime(d.getTime() + ttl);
                cache[key] = obj;
            }
        },


        remove: function(key, region) {
            if (!this.nocluster && this.clusterWorker != null) {
                process.send({
                    cache:true,
                    type:"remove",
                    region:region
                });
            }

            this._remove(key, region);
        },


        _clusterRemove: function(msg) {
            this._remove(msg.key, msg.region);
        },


        _remove: function(key, region) {
            var cache = this.getRegion(region);
            delete cache[key];
        },


        clearAll: function(region) {
            if (!this.nocluster && this.clusterWorker != null) {
                process.send({
                    cache:true,
                    type:"clearall",
                    region:region
                })
            }

            this._clearAll(region);
        },


        _clusterClearAll: function(msg) {
            this._clearAll(msg.region);
        },


        _clearAll: function(region) {
            if (region != null) {
                this.regions[region] = {};
            } else {
                this.regions = {};
                this.cache = {};
            }
        },


        getRegion: function(region) {
            if (region) {
                if (!this.regions.hasOwnProperty(region)) {
                    this.regions[region] = {};

                    this.setUpCheckTimer(region);
                }
                return this.regions[region];
            }
            return this.cache;
        },


        setUpClustered: function() {

            if (this.nocluster) {
                return;
            }

            //see if we're running on Node
            if (typeof exports !== 'undefined' && this.exports !== exports) {
                //See if we're clustered -- we'll want to keep all jscache values in sync
                var cluster = require('cluster');

                if (cluster != null && cluster.isWorker) {
                    var self = this;
                    this.clusterWorker = cluster.worker;
                    console.log("js-cache listening on clustered environment - current workier id: " + cluster.worker.id);

                    //Listen for messages passed by master
                    process.on("message", function(msg) {
                        if (msg.cache) {
                            switch(msg.type) {
                                case "set":
                                    self._clusterSet(msg);
                                    break;
                                case "touch":
                                    self._clusterTouch(msg);
                                    break;
                                case "remove":
                                    self._clusterRemove(msg);
                                    break;
                                case "clearall":
                                    self._clusterClearAll(msg);
                                    break;
                            }
                        }
                    });


                } else if(cluster != null && cluster.isMaster) {

                    console.log("js-cache listening on clustered environment - master");

                    //listen for messages passed by worker
                    cluster.on('listening', function(worker, address) {
                        worker.on("message", function(msg) {
                            if (msg.cache) {
                                //proxy out the mesage to the other workers
                                Object.keys(cluster.workers).forEach(function(id) {
                                    if (id != worker.id) {
                                        cluster.workers[id].send(msg);
                                    }
                                });
                            }
                        });
                    });
                }
            }
        }
    });


    if (typeof module != 'undefined') {
        module.exports = JSCache;
    }
    return JSCache;
}).call(this);
