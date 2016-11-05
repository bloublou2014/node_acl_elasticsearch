/**
 * Elasticsearch backend Interface for npm acl.
 * API for providing a backend for the acl npm module.
 *
 * Data model within elasticsearch :
 * Index : configured index (will not changed based on date for example)
 * Document Type : Type is mapped to "key" notion on node-acl, all "." are replace with "_pt_" since elasticsearch 2.x
 *      disallows dot usage on type
 *
 * Document is a collection of values, example of document within Elasticsearch
 * {
 *     "_index": "archiv1_acl",
 *     "_type": "allows_cash",
 *     "_id": "silver",
 *     "_version": 7,
 *     "_score": 1,
 *     "_source": {
 *         "key": "silver",
 *         "values": {
 *             "sell": true,
 *             "exchange": true
 *         }
 *     }
 * }
 *
 * As for document Type, if values's key names '.' are replace by '_pt_'.
 *
 */
'use strict';

var contract = require('./contract');
var async = require('async');
var _ = require('lodash');
var esTasks = require('./esTasks');

function ElasticsearchBackend(options) {
    this.options = options;
    this.client = esTasks.getElasticsearchClient(options);
}

ElasticsearchBackend.prototype = {
    /**
     Begins a transaction.
     */
    begin: function () {
        // returns a transaction object
        return [];
    },

    /**
     Ends a transaction (and executes it)
     */
    end: function (transaction, cb) {
        contract(arguments).params('array', 'function').end();
        // Execute transaction
        async.series(transaction, function (err) {
            cb(err);
        });
    },

    /**
     Cleans the whole storage.
     */
    clean: function (cb) {
        contract(arguments)
            .params('function')
            .end();

        cb(undefined);
    },

    /**
     Gets the contents at the bucket's key.
     */
    get: function (bucket, key, cb) {
        contract(arguments)
            .params('string', 'string|number', 'function')
            .end();

        var self = this;

        esTasks.requestEs(self.client, self.options.index, bucket, key, function (err, esDoc) {
            if (err) {
                cb(err);
                return;
            }
            if (!esDoc) {
                cb(undefined, []);
                return;
            }

            var result = [];
            var values = esDoc.values;
            _.each(values, function (v, k) {
                result.push(k.replace(/(_pt_)/g, '.'));
            });

            cb(undefined, _.uniq(result));
        });
    },

    /**
     Returns the union of the values in the given keys.
     */
    union: function (bucket, keys, cb) {
        contract(arguments)
            .params('string', 'array', 'function')
            .end();

        var self = this;
        // get all keys ==> request all keys
        esTasks.searchEsKeys(self.client, self.options.index, bucket, keys, function (err, esDocs) {
            if (err) {
                cb(err);
                return;
            }
            var result = [];
            _.each(esDocs, function (doc) {
                var values = doc.values;
                _.each(values, function (v, k) {
                    result.push(k.replace(/(_pt_)/g, '.'));
                });
            });

            cb(undefined, _.uniq(result));
        });
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

        var self = this;
        transaction.push(function (cb) {
            values = makeArray(values);

            esTasks.requestEs(self.client, self.options.index, bucket, key, function (err, esDoc) {
                var doc;
                if (err || !esDoc) {
                    doc = {
                        key: key,
                        values: {}
                    };
                } else {
                    doc = esDoc;
                }
                // build doc from array values
                values.forEach(function (value) {
                    if (value) {
                        doc.values[value.replace(/[.]/g, '_pt_')] = true;
                    }
                });

                // put document on elasticsearch
                esTasks.insertEs(self.client, self.options.index, bucket, doc, function (err) {
                    cb(err);
                });
            });
        });
    },

    /**
     Delete the given key(s) at the bucket
     */
    del: function (transaction, bucket, keys) {
        contract(arguments)
            .params('array', 'string', 'string|array')
            .end();

        var self = this;
        keys = makeArray(keys);

        transaction.push(function (cb) {
            esTasks.removeEs(self.client, self.options.index, bucket, keys, function (err) {
                cb(err);
            });
        });
    },

    /**
     Removes values from a given key inside a bucket.
     */
    remove: function (transaction, bucket, key, values) {
        contract(arguments)
            .params('array', 'string', 'string|number', 'string|array')
            .end();

        var self = this;
        values = makeArray(values);
        transaction.push(function (cb) {
            // get values from bucket/key
            esTasks.requestEs(self.client, self.options.index, bucket, key, function (err, doc) {
                if (!doc) {
                    cb();
                }

                values.forEach(function (value) {
                    if (value && _.has(doc.values, value.replace(/[.]/g, '_pt_'))) {
                        delete doc.values[value.replace(/[.]/g, '_pt_')];
                    }
                });

                // put document on elasticsearch
                esTasks.insertEs(self.client, self.options.index, bucket, doc, function (err) {
                    cb(err);
                });
            });
        });
    }
};

function makeArray(arr) {
    return Array.isArray(arr) ? arr : [arr];
}

module.exports = ElasticsearchBackend;
