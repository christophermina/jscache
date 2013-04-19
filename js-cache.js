//Ensure we load underscore
if (!_ && (typeof require !== 'undefined')) {
    _ = require('underscore');
} else if (!_) {
    if (typeof global !== 'undefined' && typeof global.noderequire !== 'undefined') {
        _ = global.noderequire('underscore');
    }
}

if (!_) {
    throw new Error("js-cache: Underscore is undefined");
}

var JSCache = (function(options) {

    this.initialize(options);
});

_.extend(JSCache.prototype, {

    ttl: 60000,
    refresh: 61000,
    cache: {},
    regions: {},

    initialize: function(options) {
        if (options.ttl) {
            options.ttl = options.ttl * 1000;
        }
        if (options.refresh) {
            options.refresh = options.refresh * 1000;
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
        var cache = this.getRegion(region);
        delete cache[key];
    },


    clearAll: function(region) {
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
    }

});


if (typeof module != 'undefined') {
    module.exports = JSCache;
}
return JSCache;
