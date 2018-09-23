// this file called 'mocha.js' instead of 'index.js' so mocha's stackTraceFilter thinks
// we're part of mocha.. 

;(function() {
	var adminProp = typeof Symbol !== 'undefined' ? Symbol('ctxAdminProp') : '__ctxAdminProp__'

	var g = typeof global !== 'undefined' ? global : (window || {})
	var mocha = typeof require !== 'undefined' ? require('mocha') : g.Mocha

	var _ctx = null
	function withContext(fn) {
		if(fn.length > 0)
			return function(done) {_ctx = this; return fn.call(this, done)}		
		return function() {_ctx = this; return fn.call(this)}
	}

	function defineGlobals(globals) {
		var savedGlobals = _ctx[adminProp]
		var vals = {}

		function defineGlobal(name, from, isIgnored) {
			savedGlobals[name] = Object.getOwnPropertyDescriptor(g, name)
			var val = vals[name] = (isIgnored && from[name] === undefined ? g : from)[name]

			var get = isIgnored || val
				? function() {return vals[name]}
				: function() {throw new Error('Attempted to get global "' + name + '".')}
			var set = isIgnored
				? function(v) {vals[name] = v}
				: function() {throw new Error('Attempted to set global "' + name + '".')}

			Object.defineProperty(g, name, {
				configurable: true,
				enumerable: true,
				get: get,
				set: set
			})
		}

		Object.keys(globals).forEach(function(name) {
			if(name !== 'globals') defineGlobal(name, globals, false)
			else {
				var ignoredGlobals = globals.globals
				Object.keys(ignoredGlobals).forEach(function(ignoredName) {
					defineGlobal(ignoredName, ignoredGlobals, true)
				})
			}
		})
	}

	function defineContext(properties) {
		if(typeof properties !== 'object') throw(new Error('Argument must be an object'))

		if(!_ctx.hasOwnProperty(adminProp))	_ctx[adminProp] = {}
		
		var vals = {}
		var defs = {}
		Object.keys(properties).forEach(function(name) {
			if(name === 'globals') return defineGlobals(properties[name])

			var initVal = properties[name]
			var isObj = typeof initVal === 'object'
			var hasGet = isObj && typeof initVal.get === 'function'
			var hasSet = isObj && (typeof initVal.set === 'function' || initVal.set === null)
	
			vals[name] = isObj && initVal.value ? initVal.value : initVal

			defs[name] = {
				//?? configurable: false,
				configurable: true,
				enumerable: true,
				get: hasGet ? initVal.get : function() {return vals[name]},
				set: hasSet ? (initVal.set === null ? undefined : initVal.set) : function(v) {vals[name] = v}
			}
		})

		Object.defineProperties(_ctx, defs)
	}

	var canDefine = false
	function context(title, fn) {
		if(arguments.length === 0) return _ctx
		if(arguments.length === 1 && typeof title === 'object') {
			if(!canDefine) throw (new Error('Can only be called during suite setup (i.e. in before(), suiteSetup(), etc.)'))
			return defineContext(title)
		}	
		return mocha.describe(title, fn)
	}
	context.only = mocha.describe.only
	context.skip = mocha.describe.skip
	
	var SuiteProto = mocha.Suite.prototype
	var oBefore = SuiteProto.beforeAll

	function before(title, fn) {

		this.afterAll(function revertGlobals() {
			var savedGlobals = _ctx[adminProp]
			if(!savedGlobals) return

			Object.keys(savedGlobals).forEach(function(name) {
				var revert = savedGlobals[name]
				if(revert === undefined) delete g[name]
				else Object.defineProperty(g, name, savedGlobals[name])
			})

			delete _ctx[adminProp]
		})

		if(typeof title === 'function') {
			fn = title
			title = fn.name
		}

		var withCtx = withContext(fn)

		if(fn.length > 0)
			fn = function(done) {
				canDefine = true
				return withCtx.call(this, function() {canDefine = false; done()})
			}
		else
			fn = function() {
				canDefine = true
				var result = withCtx.call(this)
				return result && typeof result.then === 'function'
					? result.then(function() {canDefine = false})
					: canDefine = false, result
			}

		return oBefore.call(this, title, fn)
	}
	SuiteProto.beforeAll = before
		
	function hook(original) {
		return function(title, fn) {
			if(typeof title === 'function') {
				fn = title
				title = fn.name
			}
			return original.call(this, title, withContext(fn))	
		}
	}

	SuiteProto.afterAll = hook(SuiteProto.afterAll)
	SuiteProto.beforeEach = hook(SuiteProto.beforeEach)
	SuiteProto.afterEach = hook(SuiteProto.afterEach)

	var oAddTest = SuiteProto.addTest
	function addTest(test) {
		var fn = test.fn

		function ctx(parent) {
			if(!parent[adminProp]) return parent

			function Context() {}
			Context.prototype = parent
			return(new Context())
		}

		var withCtx = withContext(fn)

		fn = fn.length > 0
			? function(done) {return withCtx.call(ctx(this), done)}
			: function() {return withCtx.call(ctx(this))}

		test.fn = fn

		return oAddTest.call(this, test)
	}

	SuiteProto.addTest = addTest

	Object.defineProperty(mocha.Runnable.prototype, '_allowedGlobals', {
		configurable: true,
		enumerable: true,
		get: function() {
			if(_ctx[adminProp]) return Object.keys(_ctx[adminProp])
			return this[adminProp]
		},
		set: function(v) {
			if(_ctx[adminProp]) return
			this[adminProp] = v
		}
	})

	var oCheckGlobals = mocha.Runner.prototype.checkGlobals
	Object.defineProperty(mocha.Runner.prototype, 'checkGlobals', {
		configurable: true,
		enumerable: true,
		value: function checkGlobals() {
			var saveIgnoreLeaks = this.ignoreLeaks
			this.ignoreLeaks = this.ignoreLeaks && !_ctx[adminProp]
			var rv
			try {rv = oCheckGlobals.apply(this, arguments)}
			catch(ex) {throw(ex)}
			finally {this.ignoreLeaks = saveIgnoreLeaks}
			return rv
		}
	})

	g.context && (g.context = context)
	g.suite && (g.suite.context = context)
	module &&	(module.exports = context)
})()
