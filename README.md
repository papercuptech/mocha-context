

## Features
* Backwards compatible (explicit opt in).
* Access test context inside lambda functions without being passed parameter.
* Every test gets its own context, sharing parent context, hiding private context.
* Explicity declared contextual properties and functions, so lower contexts can set higher shared properties.
* Contextualized 'global' || 'window', with stronger access and use detection on top of leak detection.



## Status
This is a prototype / experimental version of these features, that can be easily 'required' into tests. The purpose of a separate module is to ease exploring the approach and api. Ideally the features will be integrated directly into mocha after feedback.

## Use with node and bundlers

```
npm i mocha-ctx
```

**test.js**
```javascript
require('mocha-ctx')
// the context() global is now overloaded

describe('down with lambda discrimination!!! (and this and that and self)', () => {
  it('provides "this" via "context()"', function() => {
    // context() can still be used as an alias for 'describe(title, fn)', but when
    // passed no arguments, it now returns the 'this' context. ('describe' 
    // will fail however; i.e. context !== describe, but now delegates to it)
    assert(this === context())
    this.immediateContextProp = 1
  })

  it('then lets lambdas effectively get to "this" when needed', () => {
    // NOTE, we're using context(), but semantic of 'this' hasn't changed yet;
    // i.e. tests don't yet have their own context; see what follows
    assert(context().immediateContextProp === 1)
    context().timeout(-42)
  })
})

describe('explicit context', () => {
  before(() => {
    // when 'context()' called with an object arg like 'context({props: values})', 
    // the object is used to explicitly define the shared properties, 
    // functions, and globals (desribed shortly) of the context, and also
    // activates context-per-test semantics for all contained tests
    context({
      outerProperty: 1,
      outerCounter: 0,
      sharedFn: function(offset) {return this.outerProperty + offset},
      sharedFn2: onset => context().outerCounter - onset // of greater things
    })
  })

  beforeEach(() => {
    // context() can only be passed a context-defining object when called
    // from within a 'before' hook (or 'beforeAll', 'suiteSetup'). the 
    // following throws
    context({notGunnaHappen: true})
    // because we're in a 'beforeEach' hook, and the same will throw when 
    // called with an object in any other.. uhm.. context (i.e. in after, afterEach, it)
    
    // however, context({props: values}) can be called multiple times within
    // one or more 'before' hooks, with later calls overiding earlier ones
    // made within the same context (i.e. within the same callback 
    // passed to 'describe()')
  })

  describe('layer 1 context', () => {
    beforeEach(() => {
      context().outerCounter++
    })

    describe('layer 2 context', () => {
      it('can set a property on ancestor context that ancestor function sees', () => {
        context().outerProperty = 100
        assert(context().sharedFn(0) === 100)
      })

      it('should see same value of higher context properties accross tests', () => {
        assert(context().outerProperty === 100)
      })

      it('provides each test its own context', () => {
        context().testProperty = 10
        assert(context().testProperty === 10)
      })

      it('then prevents other tests from seeing each others private context', () => {
        assert(context().testProperty === undefined)
      })

      it('should have made layer 1 count to 5 using outer property context', () => {
        assert(context().outerCounter === 5)
      })
    })
  })
})

describe('globals', () => {
  before(() => {
    context({
      // 'globals' is a distinguished name here, and therefore cant be used
      // generally as a name of a property on a context.
      
      globals: {
        // by setting 'neverAccess' to 'undefined', we're saying this 
        // global 'neverAccess' should never be accessed nor set. when 
        // anything does within this context, it fails. handy as it detects 
        // attempts to merely use a global somewhere.
        neverAccess: undefined,

        // this is read only in this context. any sets fail. useful
        // for mocking globals when necessary
        readOnly: 'read only',
        // NOTE!! we save and restore globals, but not deeply; don't forget.

        // uhhh... uhmmm...(clearing throat)... *cough*... "prototype!"
        // the 'globals' within 'globals', are the, uh, globals to ignore in
        // this context; i.e. to whitelist
        globals: {
          ignored: 'with this init value in this context',
          stillIgnored: undefined // but don't init value; it will be what it is
          // NOTE!! again, we save and restore globals, but not deeply; don't forget.
        }
      }
    })

    // any other globals set in tests, that are not specified above, are automatically 
    // considered leaks that will cause failure regardless of --check-leaks flag. in
    // other words when using mocha-context, you must account for all globals; you
    // are 'using' mocha-context whenever you call 'context({props: values})' in a 'before'
  })

  after(() => {
    // at this point, the globals are restored to the values they had
    // prior to executing tests within this context. keep in mind however
    // globals are saved and restored, but not deeply; we don't clone
    // objects deeply or anything
  })
})



//***** other interfaces... 

// all can explicitly import
var context = require('mocha-ctx')


// or get from globals
// === tdd ===
var context = suite.context
suite('suit', () => {
  suiteSetup(() => {
    context({givesMeaning: 'to EVERYTHING'})
  })
})


// === qunit
var context = suite.context
suite('of law')

before(() => {
  context({seems: 'a little far fetched...'})
})



// === exports
require('mocha-context')
module.exports = {
  'sumpin sweet': {
    before: function() {
      context({
        andTasty: 'like apple pie'
      })
    }
  }
}
