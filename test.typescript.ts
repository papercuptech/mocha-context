import 'mocha'
import context from 'mocha-ctx'
import chai from 'chai'
const should = chai.should()

describe('test', () => {
	before(() => {
		context({
			prop1: 'test'
		})
	})

	it('should work', () => {
		context().prop1.should.equal('test')
	})
})
