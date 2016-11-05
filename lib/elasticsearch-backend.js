/**
 ElasticSearch Backend.
 Implementation of the storage backend using ElasticSearch
 */
"use strict";

var contract = require('./contract');
var async = require('async');
var elasticsearch = require('elasticsearch');
var _ = require('lodash');

function ElasticSearchBackend(options) {
    this.client = options.client || new elasticsearch.Client(options);
    this.index = typeof options.index !== 'undefined' ? options.index : 'pemissions';
    this.prefix = typeof options.prefix !== 'undefined' ? options.prefix : '';
}

ElasticSearchBackend.prototype = {
    /**
     Begins a transaction.
     */
    begin: function () {
        // returns a transaction object(just an array of functions will do here.)
        return [];
    },

    /**
     Ends a transaction (and executes it)
     */
    end: function (transaction, cb) {
        contract(arguments).params('array', 'function').end();
        async.series(transaction, function (err) {
            cb(err instanceof Error ? err : undefined);
        });
    },

    /**
     Cleans the whole storage.
     */
    clean: function (cb) {
        contract(arguments).params('function').end();
        this.client.indices.delete(
            {
                index: this.index
            },
            cb
        );
    },

    /**
     Gets the contents at the bucket's key.
     */
    get: function (bucket, key, cb) {
        contract(arguments)
            .params('string', 'string|number', 'function')
            .end();

        key = encodeText(key);
        bucket = encodeText(bucket);

        this.client.get(
            {
                index: this.index,
                type: this.prefix + bucket,
                ignore: [404],
                id: key

            },
            function (error, response) {
                if (error instanceof Error) {
                    return cb(error);
                }
                if (response.found === false) {
                    return cb(undefined, []);
                }
                return cb(undefined, fixKeysInArray(_.keys(response._source)));
            }
        );
    },

    /**
     Returns the union of the values in the given keys.
     */
    union: function (bucket, keys, cb) {
        contract(arguments)
            .params('string', 'array', 'function')
            .end();
        keys = encodeAll(keys);
        bucket = encodeText(bucket);

        this.client.mget(
            {
                index: this.index,
                type: this.prefix + bucket,
                ignore: [404],
                body: {
                    ids: keys
                }

            },
            function (err, resp) {

                if (err instanceof Error) {
                    return cb(err);
                }
                var pluckArray = _.compact(_.map(resp.docs, "_source"));
                if (_.isEmpty(pluckArray)) {
                    return cb(undefined, []);
                }
                var result = [];
                pluckArray.forEach(function (doc) {
                    result.push(_.keys(doc));
                });
                cb(undefined, fixKeysInArray(_.uniq(_.flatten(result))));
            }
        );
    },

    /**
     Adds values to a given key inside a bucket.
     */
    add: function (transaction, bucket, key, values) {
        contract(arguments)
            .params('array', 'string', 'string|number', 'string|array|number')
            .end();

        if (key === "key") {
            throw new Error("Key name 'key' is not allowed.");
        }
        key = encodeText(key);
        bucket = encodeText(bucket);
        var self = this;

        transaction.push(function (cb) {
            values = makeArray(values);
            var doc = {};
            values.forEach(function (value) {
                doc[value] = true;
            });
            self.client.update(
                {
                    index: self.index,
                    type: self.prefix + bucket,
                    id: key,
                    refresh: true,
                    retry_on_conflict: 5,
                    ignore: [404],
                    body: {
                        doc: doc,
                        upsert: doc
                    }
                },
                function (err) {
                    if (err instanceof Error) {
                        return cb(err);
                    }
                    return cb(undefined);
                }
            );
        });
    },

    /**
     Delete the given key(s) at the bucket
     */
    del: function (transaction, bucket, keys) {
        contract(arguments)
            .params('array', 'string', 'string|array')
            .end();
        keys = makeArray(keys);
        bucket = encodeText(bucket);
        var self = this;

        transaction.push(function (cb) {
            var body = [];
            if (_.isEmpty(keys)) {
                return cb(undefined);
            }
            keys.forEach(function (key) {
                var obj = {delete: {_id: key}};
                body.push(obj);
            });

            self.client.bulk(
                {
                    index: self.index,
                    type: self.prefix + bucket,
                    body: body,
                    ignore: [404]
                },
                function (err) {
                    if (err instanceof Error) {
                        return cb(err);
                    }
                    cb(undefined);
                }
            );
        });
    },

    /**
     Removes values from a given key inside a bucket.
     */

    //tofix handle version changed: concurrency control
    remove: function (transaction, bucket, key, values) {
        contract(arguments)
            .params('array', 'string', 'string|number', 'string|array|number')
            .end();
        key = encodeText(key);
        bucket = encodeText(bucket);
        var self = this;

        values = makeArray(values);
        transaction.push(function (cb) {
            self.client.get(
                {
                    index: self.index,
                    type: self.prefix + bucket,
                    id: key,
                    ignore: [404]
                },
                function (err, resp) {
                    if (err instanceof Error) {
                        return cb(err);
                    }
                    if (resp.found === false) {
                        return cb(undefined);
                    }
                    var version = resp._version;
                    var docs = resp._source;
                    values.forEach(function (value) {
                        delete docs[value];
                    });
                    self.client.index({
                            index: self.index,
                            type: self.prefix + bucket,
                            id: key,
                            refresh: true,
                            version: version,
                            body: docs
                        },
                        function (err) {
                            if (err instanceof Error) {
                                return cb(err);
                            }
                            return cb(undefined);
                        });
                }
            );
        });
    }
};

function encodeText(text) {
    if (typeof text === 'string' || text instanceof String) {
        text = encodeURIComponent(text);
        text = text.replace(/\./, '%2E');
    }
    return text;
}

function decodeText(text) {
    if (typeof text === 'string' || text instanceof String) {
        text = decodeURIComponent(text);
    }
    return text;
}

function encodeAll(arr) {
    if (Array.isArray(arr)) {
        var ret = [];
        arr.forEach(function (aval) {
            ret.push(encodeText(aval));
        });
        return ret;
    } else {
        return arr;
    }
}

function fixKeysInArray(arr) {
    return _.map(arr, function (key) {
        return decodeText(key);
    });
}

function makeArray(arr) {
    return Array.isArray(arr) ? encodeAll(arr) : [encodeText(arr)];
}

exports = module.exports = ElasticSearchBackend;