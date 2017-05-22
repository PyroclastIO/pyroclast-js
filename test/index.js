import expect from 'expect.js';
import PyroclastClient from '../src/pyroclast';

describe('PyroclastClient', function() {
    const writeApiKey = 'key';
    const endpoint = 'http://no.op';
    
    it('fails to construct when required options are not specified.', function() {
        expect(() => new PyroclastClient({})).to.throwError();
    });
    
    it('bootstraps a default fetch impl under Node', function() {
        const c = new PyroclastClient({writeApiKey, endpoint});
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
        const c = new PyroclastClient({writeApiKey, endpoint, fetchImpl: mockFetch});
        expect(c.fetchImpl.custom).to.be.ok();
    });

    it('should promise parsed json from successful requests', function(done) {
        const c = new PyroclastClient({writeApiKey, endpoint, fetchImpl: mockFetch});
        c.sendEvent('atopic', {foo: 'bar', mocking: 200})
            .then((result) => {
                expect(result.url).to.equal("http://no.op/api/v1/topic/atopic/event")
                expect(result.baz).to.equal('quux');
                done();
            })
            .catch(done);
    });

    it('should reject on 400s', function(done) {
        const c = new PyroclastClient({writeApiKey, endpoint, fetchImpl: mockFetch});
        c.sendEvent('atopic', {foo: 'bar', mocking: 400})
            .then((result) => {
                done('Not expected');
            })
            .catch((err) => {
                expect(err).to.be.an(Error);
                done();
            });
    });

    it('should reject on network error', function(done) {
        const c = new PyroclastClient({writeApiKey, endpoint, fetchImpl: mockFetch});
        c.sendEvent('atopic', {foo: 'bar', mocking: null})
            .then((result) => {
                done('Not expected');
            })
            .catch((err) => {
                expect(err).to.be.an(Error);
                done();
            });
    })
});
