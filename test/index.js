import expect from 'expect.js';
import {
  PyroclastTopicClient, PyroclastDeploymentClient, PyroclastConsumerInstance,
  PyroclastAdminClient
} from '../src/pyroclast';

describe('PyroclastTopicClient', function() {
    const config = {
        writeApiKey: "cc5409fc-1e59-44e8-b1e8-0701d0a204de",
        readApiKey:"3a6d9c33-86a7-4bb6-ad20-dd239fc93f94",
        topicId: "atopic",
        endpoint: 'http://no.op'
    };

    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastTopicClient({})).to.throwError();
    });

    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastTopicClient(config);
        expect(c.fetchImpl).to.be.ok();
    });

    it('uses default endpoint when none provided', function() {
        const c = new PyroclastTopicClient(Object.assign({}, config, {endpoint: null}));
        expect(c.options.endpoint).to.equal('https://api.us-west-2.pyroclast.io');
    });

    it('uses region to set endpoint', function() {
        const c = new PyroclastTopicClient(Object.assign({}, config, {region: 'foo', endpoint: null}));
        expect(c.options.endpoint).to.equal('https://api.foo.pyroclast.io');
    });

    const mockFetch = (url, {body, headers}) => {
        body = body ? JSON.parse(body) : {mocking: 200};
        let mocking = body.mocking
            || (body.value && body.value.mocking)
            || (body[0] && body[0].value && body[0].value.mocking);
        return new Promise((resolve, reject) => {
            switch (mocking) {
            case 200:
                return resolve({
                    status: 200,
                    json: () => { return {baz: 'quux', url, headers};}
                });
            case 400:
            case 401:
                return resolve({
                    status: mocking
                });
            case 999:
                return resolve({
                    status: mocking,
                    responseText: 'potato'
                });
            default:
                return reject(new Error(body));
            }});
    };

    mockFetch.custom = true;

    it('uses user-specified fetch implementation when provided.', function() {
        const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
        expect(c.fetchImpl.custom).to.be.ok();
    });

    describe('Producing', function() {
        const writeApiKey = 'wkey';

        it('should promise true from a successful request', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.sendEvent({value: {foo: 'bar', mocking: 200}})
                .then((result) => {
                    expect(result).to.be.ok();
                    done();
                })
                .catch(done);
        });

        it('should promise true from successful send multiple requests', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.sendEvents([{value: {foo: 'bar', mocking: 200}}])
                .then((result) => {
                    expect(result).to.be.ok();
                    done();
                })
                .catch((e) => {console.log(e); done(e);});
        });

        it('should throw when values are not wrappped', function() {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            expect(() => c.sendEvent({foo: 'bar'})).to.throwError();
            expect(() => c.sendEvent([{value: {foo: 'wrapped'}}, {foo: 'unwrapped'}])).to.throwError();
        });

        it('should reject on 400s', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.sendEvent({value: {foo: 'bar', mocking: 400}})
                .then((result) => {
                    done('Not expected');
                })
                .catch((err) => {
                    expect(err).to.be.an(Error);
                    done();
                });
        });

        it('should reject on network error', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.sendEvent({value: {foo: 'bar', mocking: null}})
                .then((result) => {
                    done('Not expected');
                })
                .catch((err) => {
                    expect(err).to.be.an(Error);
                    done();
                });
        });
    });

    describe('Consuming', function() {
        const readApiKey = 'rkey';

        it('should throw when requesting malformed subscriber name', function() {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            expect(() => {
                c.subscribe('contains/slash')
            }).to.throwError();
        });

/*        it('should promise a PyroclastConsumerInstance', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.subscribe('asubscriber', {mocking: 201, 'group-id': 'foo'})
                .then((consumerInstance) => {
                    console.log("ERROR", consumerInstance.name);
                    //expect(consumerInstance).to.be.an.instanceOf(PyroclastConsumerInstance)
                    done();
                })
                .catch(done);
        });

        it('should construct correct poll request', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.poll('asubscriber', {mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/poll/asubscriber");
                    expect(result.headers.Authorization).to.be.equal(readApiKey);
                    done();
                })
                .catch(done);
        });

        it('should construct correct commit request', function(done) {
            const c = new PyroclastTopicClient(Object.assign({}, config, {fetchImpl: mockFetch}));
            c.commit('asubscriber', {mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/poll/asubscriber/commit");
                    expect(result.headers.Authorization).to.be.equal(readApiKey);
                    done();
                })
                .catch(done);
        });*/
    });
});

describe('PyroclastDeploymentClient', function() {
    const readApiKey = 'key';
    const deploymentId = "adeployment";
    const endpoint = 'http://no.op';

    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastDeploymentClient({})).to.throwError();
    });

    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastDeploymentClient({readApiKey, deploymentId, endpoint});
        expect(c.fetchImpl).to.be.ok();
    });

    const mockFetch = (url, {body, headers}) => {
        return new Promise((resolve, reject) => {
            return resolve({
                status: 200,
                json: () => { return {url, headers};}
            });
        });
    };

    mockFetch.custom = true;

    it('uses user-specified fetch implementation when provided.', function() {
        const c = new PyroclastDeploymentClient({readApiKey, deploymentId, endpoint, fetchImpl: mockFetch});
        expect(c.fetchImpl.custom).to.be.ok();
    });

    it('should promise parsed json at the correctly constructed urls', function(done) {
        const c = new PyroclastDeploymentClient({readApiKey, deploymentId, endpoint, fetchImpl: mockFetch});
        Promise
            .all([
                c.readAggregates()
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/v1/deployments/adeployment/aggregates");
                        expect(result.headers.Authorization).to.be.equal(readApiKey);
                    }),
                c.readAggregate('foo')
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/v1/deployments/adeployment/aggregates/foo");
                    })
            ])
            .then((_) => done())
            .catch(done);
    });
});

// Integration test, use with real credentials.
describe('IntegrationTest', function(){
    const topicName = Math.random().toString(36).substring(7);
  const adminClient = new PyroclastAdminClient(
      {
        masterKey: 'user1',
        endpoint: "http://localhost:10556"
      });
  it('can create a new topic', function(done){
    adminClient.createTopic(topicName)
      .then((newTopicClient) => {
        newTopicClient.sendEvent({"value": {"foo": "bar"}}).then((res) => {
          expect(res).to.be.ok();
        });
        done();
      })
      .catch(done);
  });
  it('can list existing topics', function(done){
    adminClient.getTopics()
      .then((r) => {
        expect(r).to.be.ok();
        done();
      })
      .catch(done);
  });

    const topicClient = new PyroclastTopicClient({
        writeApiKey: "5c293bff-4320-46dd-8288-b40e5cc6f785",
        readApiKey:"308220d9-1849-4bc7-98e4-37819d4f90ef",
        topicId: "topic-0549b145-edec-4360-9c73-84b0a1b77ede",
        endpoint: "http://localhost:10556"
    });
    it('fails to construct when the required options are not specified', function(){
       expect(() => new PyroclastTopicClient({})).to.throwError();
    });

    it('bootstraps a default fetch impl under Node', function() {
        expect(topicClient.fetchImpl).to.be.ok();
    });
    it('We can send an event and multiple batch events', function(done) {
        topicClient.sendEvent({"value": "foo"}).then((res) => {
          expect(res).to.be.ok();
        });
        topicClient.sendEvents([{"value": "foo"}]).then((res) => {
            expect(res).to.be.ok();
        })
            .then(done())
            .catch(done);
    })
    it('We can subscribe to a topic and get back a list of records', function(done){
        topicClient.subscribe("geee").then(
            (consumerInstance) => {
                consumerInstance.poll().then(
                    (records) => {
                        expect(records).to.be.an('array');
                        expect(records).to.not.be.empty;
                    }
                ).catch(done);
                consumerInstance.commit().then(
                    (status) => {
                        expect(status).to.be.ok();
                    }
                ).catch(done);
                consumerInstance.poll().then(
                    (records) => {
                        expect(records).to.be.an('array');
                        expect(records).to.be.empty;
                    }
                ).catch(done);
                consumerInstance.seekBeginning().then(
                    (status) => {
                        expect(status).to.be.ok();
                    }
                ).catch(done);
                consumerInstance.poll().then(
                    (records) => {
                        expect(records).to.be.an('array');
                        expect(records).to.not.be.empty;
                    }
                ).catch(done);
                consumerInstance.seek([{partition: 0, offset: 0},
                                       {partition: 1, offset: 0}]).then(
                    (status) => {
                        expect(status).to.be.ok();
                    }
                ).catch(done);
                consumerInstance.poll().then(
                    (records) => {
                        expect(records).to.be.an('array');
                        expect(records).to.not.be.empty;
                    }
                ).then(done()).catch(done);
            }
        )
    })
});
