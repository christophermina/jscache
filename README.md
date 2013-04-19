jscache
=======

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

