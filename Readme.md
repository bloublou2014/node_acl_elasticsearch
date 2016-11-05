#NODE ACL - Elasticsearch backend
This fork adds Elasticsearch backend support to [NODE ACL](https://github.com/OptimalBits/node_acl)

based on [thomsonreuters work](https://github.com/thomsonreuters/node_acl/blob/9afb7354532311d9d891042cafc5b69b9869f728/lib/elasticsearch-backend.js)

##Installation

Using npm:

```javascript
npm install acl-elasticsearch
```

##Usage

Create acl module by requiring it and instantiating it with Elasticsearch backend instance:

```javascript
// require Elasticsearch and get instance to firebase path

// require acl and create Firebase backend
var acl = require('acl');
acl = new acl(new acl.elasticsearchBackend({
                                               host: 'localhost:9200',
                                               index: 'node_acl',
                                               prefix: 'myPrefix'
                                           }));
```

##Documentation
See [NODE ACL documentation](https://github.com/OptimalBits/node_acl#documentation)

##License 

(The MIT License)

Copyright (c) 2016 BlouBlou2014 <bloublou2014@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
