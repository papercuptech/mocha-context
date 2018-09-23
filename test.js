if(typeof require !== 'undefined') require('./mocha')
var should = (typeof chai !== 'undefined' ? chai : require('chai')).should()

var g = typeof global !== 'undefined' ? global : (window || {})

g.neverAccess = 'but still has value'
g.readOnly = 'before we changed'
g.ignored = 'no checks'
g.asIs = 1

describe('mocha-context', () => {
	describe('lambda', () => {
		before(function() {
			this.should.equal(context())
		})

		after(function() {
			this.should.equal(context())
		})

		beforeEach(function() {
			this.should.equal(context())
		})

		afterEach(function() {
			this.should.equal(context())
		})

		it('provides "this" as "context()"', function() {
			this.should.equal(context())
		})
	})

	describe('outer context', () => {
		before(() => {
			context({
				outerCounter: 0,
				outerProperty: 1000000,
				outerPropertyReset: 0,
				sharedFn: function() {return this.outerProperty + this.outerPropertyReset},
				sharedFn2: () => context().outerProperty + context().outerPropertyReset
			})
		})

		beforeEach(() => {
			context().outerCounter++
		})

		describe('inner context', () => {
			it('can set property on outer context', () => {
				context().outerProperty = 'bananas'
				context().sharedFn().should.equal('bananas1')
			})

			it('can still see same value on property of outer context', () => {
				context().outerProperty.should.equal('bananas')
			})

			it('can set outer property that will reset from inner beforeEach', () => {
				context().outerProperty = 1
				context().outerPropertyReset = 100
				context().sharedFn().should.equal(101)
				context().sharedFn2().should.equal(101)
			})

			beforeEach(() => {
				context().outerPropertyReset = 1
			})

			it('did reset outer property from inner beforeEach', () => {
				context().sharedFn().should.equal(2)
			})

			it('should have made outer context count to 5', () => {
				context().outerCounter.should.equal(5)
			})
		})		

		describe('when "context({props: values})" called each test', () => {
			it('should have its own separate context', () => {
				context().testProp = 1
				context().testProp.should.equal(1)
			})
	
			it('does have its own separate context', () => {
				should.not.exist(context().testProp)
			})
		})
	})

	describe('globals', () => {
		before((done) => {
			context({
				globals: {
					neverAccess: undefined,
					readOnly: 'read only',

					globals: {
						asIs: undefined, // undefined means dont change, but stil ignore
						ignored: 'whatever',
						readWrite: 'can get and set with impunity, but still reverted at end of suite'
					}
				}
			})
			setTimeout(done, 10)
		})

		after(() => {
			neverAccess.should.equal('but still has value')
			readOnly.should.equal('before we changed')
			ignored.should.equal('no checks')
			console.log('\n      globals correctly reverted\n')
		})

		it('should throw getting "neverAccess"', () => {
			(() => neverAccess).should.throw()
		})

		it('should throw setting "neverAccess"', () => {
			(() => neverAccess = 'wont happen').should.throw()
		})

		it('should get "readOnly"', () => {
			readOnly.should.equal('read only')
		})

		it('should throw setting "readOnly"', () => {
			(() => readOnly = 'wont happen').should.throw()
		})

		it('should get "ignored" with initialized value', () => {
			ignored.should.equal('whatever')
		})

		it('should set "ignored"', () => {
			ignored = 'really ignored'
			ignored.should.equal('really ignored')
		})

		it('should not init ignored global when initializier is "undefined"', () => {
			asIs.should.equal(1)
		})

		it('should fail from leak detection activated by calling "context({props: values})"', () => {
			leak = true
		})

		describe('nested', () => {
			before(() => {
				context({
					globals: {
						neverAccess: 'we can get now'
					}
				})
			})

			it('can now read "neverAccess" in inner context', () => {
				neverAccess.should.equal('we can get now')
			})
		})
	})

	describe('async', () => {
		before(async() => {
			await sleep(10)
			context({prop: 1})
		})

		after(() => {
			neverAccess.should.equal('but still has value')
			console.log('\n      globals correctly reverted\n')
		})

		it('still sees context value after await', async() => {
			context().prop = 10
			await sleep(10)
			context().prop.should.equal(10)
		})

		it('still sees context using done', (done) => {
			setTimeout(() => {
				context().prop.should.equal(10)
				done()
			})
		})
	})
})

describe('back compat', function() {
	before(() => {
		context()
	})
	it('should not activate when "context()" called', () => {
		context()
	})

	it('should not activate when "context({})" not called', function() { 
		this.prop1 = 1
	})

	it('should then implicitely share props set on "this" between tests', function() {
		this.prop1.should.equal(1)
	})

	it('should not detect leaks without flag', function() {
		ignoredLeak = 1
	})

	context('can still call "contest" as alias for "describe"', () => {})
})

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
