import expect from 'expect.js';
import {PyroclastTopicClient, PyroclastDeploymentClient} from '../src/pyroclast';

describe('PyroclastTopicClient', function() {
    const topicId = "atopic";
    const endpoint = 'http://no.op';
    
    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastTopicClient({})).to.throwError();
    });
    
    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastTopicClient({topicId});
        expect(c.fetchImpl).to.be.ok();
    });

    it('uses default endpoint when none provided', function() {
        const c = new PyroclastTopicClient({topicId});
        expect(c.options.endpoint).to.equal('https://api.us-east-1.pyroclast.io');
    });

    it('uses region to set endpoint', function() {
        const c = new PyroclastTopicClient({topicId, region: 'foo'});
        expect(c.options.endpoint).to.equal('https://api.foo.pyroclast.io');
    });

    const mockFetch = (url, {body, headers}) => {
        body = body ? JSON.parse(body) : {mocking: 200};
        return new Promise((resolve, reject) => {
            switch (body.mocking) {
            case 200:
                return resolve({
                    status: 200,
                    json: () => { return {baz: 'quux', url, headers};}
                });
            case 400:
            case 401:
                return resolve({
                    status: body.mocking
                });
            case 999:
                return resolve({
                    status: body.mocking,
                    responseText: 'potato'
                });
            default:
                return reject(new Error(body));
            }});
    };

    mockFetch.custom = true;

    it('uses user-specified fetch implementation when provided.', function() {
        const c = new PyroclastTopicClient({topicId, endpoint, fetchImpl: mockFetch});
        expect(c.fetchImpl.custom).to.be.ok();
    });

    describe('Producing', function() {
        const writeApiKey = 'wkey';

        it('should promise parsed json from successful send requests', function(done) {
            const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.sendEvent({foo: 'bar', mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/produce")
                    expect(result.baz).to.equal('quux');
                    expect(result.headers.Authorization).to.be.equal(writeApiKey);
                    done();
                })
                .catch(done);
        });

        it('should promise parsed json from successful send multiple requests', function(done) {
            const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.sendEvents({foo: 'bar', mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/bulk-produce");
                    expect(result.headers.Authorization).to.be.equal(writeApiKey);
                    done();
                })
                .catch((e) => {console.log(e); done(e);});
        });

        it('should reject on 400s', function(done) {
            const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.sendEvent({foo: 'bar', mocking: 400})
                .then((result) => {
                    done('Not expected');
                })
                .catch((err) => {
                    expect(err).to.be.an(Error);
                    done();
                });
        });

        it('should reject on network error', function(done) {
            const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.sendEvent({foo: 'bar', mocking: null})
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
            const c = new PyroclastTopicClient({readApiKey, topicId, endpoint, fetchImpl: mockFetch});
            expect(() => {
                c.subscribe('contains/slash')
            }).to.throwError();
        });

        it('should construct correct subscribe request', function(done) {
            const c = new PyroclastTopicClient({readApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.subscribe('asubscriber', {mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/subscribe/asubscriber");
                    expect(result.headers.Authorization).to.be.equal(readApiKey);
                    done();
                })
                .catch(done);
        });

        it('should construct correct poll request', function(done) {
            const c = new PyroclastTopicClient({readApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.poll('asubscriber', {mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/poll/asubscriber");
                    expect(result.headers.Authorization).to.be.equal(readApiKey);
                    done();
                })
                .catch(done);
        });

        it('should construct correct commit request', function(done) {
            const c = new PyroclastTopicClient({readApiKey, topicId, endpoint, fetchImpl: mockFetch});
            c.commit('asubscriber', {mocking: 200})
                .then((result) => {
                    expect(result.url).to.equal("http://no.op/v1/topics/atopic/poll/asubscriber/commit");
                    expect(result.headers.Authorization).to.be.equal(readApiKey);
                    done();
                })
                .catch(done);
        });
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
                    }),
                c.readAggregateGroup('foo', 'bar')
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/v1/deployments/adeployment/aggregates/foo/group/bar");
                    })
            ])
            .then((_) => done())
            .catch(done);
    });
});
