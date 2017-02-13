let Acl = require('../');
let tests = require('../node_modules/acl/test/tests');

describe('Elasticsearch', function () {
    this.timeout(7000);

    before(function (done) {
        let self = this;
        let options = {
            host: 'localhost:9200',
            index: 'tests_node_acl',
           // log:'trace'
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