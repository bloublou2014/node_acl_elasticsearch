var Acl = require('../');
var tests = require('../node_modules/acl/test/tests');

describe('Elasticsearch', function () {
    this.timeout(7000);

    before(function (done) {
        var self = this;
        var options = {
            host: 'localhost:9200',
            index: 'tests_node_acl'
        };

        self.backend = new Acl.elasticsearchBackend(options);
        done();
    });

    run();
});

function run() {
    Object.keys(tests).forEach(function (test) {
        tests[test]();
    });
}