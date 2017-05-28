import expect from 'expect.js';
import {PyroclastTopicClient, PyroclastServiceClient} from '../src/pyroclast';

describe('PyroclastTopicClient', function() {
    const writeApiKey = 'key';
    const topicId = "atopic";
    const endpoint = 'http://no.op';
    
    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastTopicClient({})).to.throwError();
    });
    
    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint});
        expect(c.fetchImpl).to.be.ok();
    });

    const mockFetch = (url, {body}) => {
        body = JSON.parse(body);
        return new Promise((resolve, reject) => {
            switch (body.mocking) {
            case 200:
                return resolve({
                    status: 200,
                    json: () => { return {baz: 'quux', url};}
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
        const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
        expect(c.fetchImpl.custom).to.be.ok();
    });

    it('should promise parsed json from successful send requests', function(done) {
        const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
        c.sendEvent({foo: 'bar', mocking: 200})
            .then((result) => {
                expect(result.url).to.equal("http://no.op/api/v1/topics/atopic/produce")
                expect(result.baz).to.equal('quux');
                done();
            })
            .catch(done);
    });

    it('should promise parsed json from successful send multiple requests', function(done) {
        const c = new PyroclastTopicClient({writeApiKey, topicId, endpoint, fetchImpl: mockFetch});
        c.sendEvents({foo: 'bar', mocking: 200})
            .then((result) => {
                expect(result.url).to.equal("http://no.op/api/v1/topics/atopic/bulk-produce")
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
    })
});

describe('PyroclastServiceClient', function() {
    const readApiKey = 'key';
    const serviceId = "aservice";
    const endpoint = 'http://no.op';

    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastServiceClient({})).to.throwError();
    });

    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastServiceClient({readApiKey, serviceId, endpoint});
        expect(c.fetchImpl).to.be.ok();
    });

    const mockFetch = (url, {body}) => {
        return new Promise((resolve, reject) => {
            return resolve({
                    status: 200,
                    json: () => { return {url};}
            });
        });
    };

    mockFetch.custom = true;

    it('uses user-specified fetch implementation when provided.', function() {
        const c = new PyroclastServiceClient({readApiKey, serviceId, endpoint, fetchImpl: mockFetch});
        expect(c.fetchImpl.custom).to.be.ok();
    });

    it('should promise parsed json at the correctly constructed urls', function(done) {
        const c = new PyroclastServiceClient({readApiKey, serviceId, endpoint, fetchImpl: mockFetch});
        Promise
            .all([
                c.readAggregates()
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/api/v1/services/aservice");
                    }),
                c.readAggregate('foo')
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/api/v1/services/aservice/aggregates/foo");
                    }),
                c.readAggregateGroup('foo', 'bar')
                    .then((result) => {
                        expect(result.url).to.equal("http://no.op/api/v1/services/aservice/aggregates/foo/group/bar");
                    })
            ])
            .then((_) => done())
            .catch(done);
    });
});
