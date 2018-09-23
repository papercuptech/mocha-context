

declare module 'mocha-context' {
	import {
		SuiteFunction,
		Context
	} from 'mocha'

	interface CtXfunction extends SuiteFunction {
		(): Context
		(config: {
			[name:string]: any,
			globals?: {
				[name:string]: any
				globals?: {
					[name:string]: any
				}
			}
		}): void
	}

	//function ctx(): Context
	//function ctx(object): void

	var ctx:CtXfunction

	export = ctx
}
