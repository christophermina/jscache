jscache
=======

	npm install jscache
	
Simple, efficient Javascript cache with regions, for NodeJS or Client side use.

This cache is optimized for cleanouts only ever x number of seconds (default is 60).  If an object is fetched that has
expired, but the cleaner has not run, it will be removed immediately and a null value is returned.  

You may set any object to the cache witha  key value pair.  As well, you may set a 'region' for the item to be cached in,
simply by passing a string value for the region parameter.  If a region does not exist, one will be created, if it
already exists, the object being set will be added to the existing region.  Each region has it's own cleaner, and each
region can be evicted independently. The default cache is special, it exists on its own and is not considered a region. 
In order to evict the default cache, all regions will be evicted. 


Example of creating a new cache instance by initializing JSCache.

<b>Node</b>

		//using npm
		var JSCache = require('jscache');
		var cache = new JSCache({
  			ttl: 120,    //default Time to live is 60
  			refresh:20  //Default refresh rate. is 61
		});


<b>Client</b>

	require(['path/to/dir/js-cache'], function(jscache) {
  		var cache = new jscache({
    			ttl:120, //default is 60
    			refresh:20 //default is 61
  		});
	});


To add to the cache

		cache.set(key, value, [ttl], [region]);


To update the expiration date without retrieving (touching)

  	cache.touch(key, ttl, [region])


To retrieve the value (you may pass an optional ttl value in to "touch" the object while retrieving, must also pass
a boolean value of 'true' in the touch parameter, if attempting to update the expiration for the cached value.

  	cache.get(key, [touch], [ttl], [region])


To remove from cache

  	cache.remove(key, [region])
  
  
To clear (evict) the cache or a region

  	cache.clearAll([region])
  	
  	
----- UPDATE
Added Node Clustering support for JSCache

With node clustering, each process is its own and data is not shared across.  This can lead to stale or inconsistent data.  However, with standard Node clustering ie: **require('cluster')** worker processes can subscribe to event messages from the master, and vice-versa.  We leverage this event structure and allow a worker process to dispatch an event on applicable cache operations (set, touch, remove, clearall).  The master receives this message and proxies out to the other workers.

There are several options to customize how jscache works under a clustered environment, from the example above:

	
	//using npm
	var JSCache = require('jscache');
	var cache = new JSCache({
  		ttl: 120,    //default Time to live is 60
  		refresh:20  //Default refresh rate. is 61
  		cluster: {
  			enabled: true | false,  //defaults to true
  			nullOnSet: true | false  //defaults to false
  		}
	});
	
In this example, you can override the default cluster behavior (only when running in NodeJS clustered mode) by setting enabled = false or nullOnSet = true.  Enabled = false will simply turn off the clustering capabilities.  nullOnSet will cause, on any set operation, the value to be nulled out, and thus pulled from the DB the next time it is required on that process. The benefit here is to keep size down.  On a single set operation, with the default paramaters, a single piece of data stored in the cache will be duplicated to every other process. This could lead to very large RAM usage, depending on the type of data.  If your DB is very quick and the data being cached is not highly used, you may consider setting nullOnSet = false.  This is a better option than disabling caching alltogether, as it prevents from stale data.
