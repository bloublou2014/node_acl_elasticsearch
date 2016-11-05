'use strict';

var _ = require('lodash');
var elasticsearch = require('elasticsearch');

function getElasticsearchClient(options) {
    return options.client || new elasticsearch.Client(options);
}

function insertEs(client, index, bucket, doc, callback) {
    client.index({
        index: index,
        type: bucket.replace(/[.]/g, '_pt_'),
        body: doc, //{doc: doc},
        id: doc.key,
        refresh: true
    }, function (error, response) {
        if (error) {
            callback(error, undefined);
            return;
        }
        callback(undefined, response);
    });
}

function requestEs(client, index, bucket, key, callback) {
    client.get({
        index: index,
        type: bucket.replace(/[.]/g, '_pt_'),
        id: key
    }, function (error, response) {
        if (error) {
            if (error.status === 404) {
                callback(undefined, undefined);
                return;
            }
            callback(error, undefined);
            return;
        }
        if (response && response._source) {
            callback(undefined, response._source);
            return;
        }
        callback(undefined, undefined);
    });
}

function searchEsKeys(client, index, bucket, keys, callback) {
    client.search({
        index: index,
        type: bucket.replace(/[.]/g, '_pt_'),
        body: {
            "query": {
                "constant_score": {
                    "filter": {
                        "terms": {
                            "key": keys
                        }
                    }
                }
            }
        }
    }, function (error, response) {
        if (error) {
            if (error.status === 404) {
                callback(undefined, undefined);
                return;
            }
            callback(error, undefined);
            return;
        }
        if (response && response.hits && response.hits.hits) {
            callback(undefined, _.map(response.hits.hits, '_source'));
            return;
        }
        callback(undefined, undefined);
    });
}

function removeEs(client, index, bucket, keys, callback) {
    client.delete({
        index: index,
        type: bucket.replace(/[.]/g, '_pt_'),
        body: {
            "query": {
                "constant_score": {
                    "filter": {
                        "terms": {
                            "key": keys
                        }
                    }
                }
            }
        },
        refresh: true
    }, function (error, response) {
        if (error) {
            if (error.status === 404) {
                callback(undefined, undefined);
                return;
            }
            callback(error, undefined);
            return;
        }
        callback(undefined, response);
    });
}

exports.getElasticsearchClient = getElasticsearchClient;
exports.requestEs = requestEs;
exports.insertEs = insertEs;
exports.removeEs = removeEs;
exports.searchEsKeys = searchEsKeys;
