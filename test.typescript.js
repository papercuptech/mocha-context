"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const mocha_context_1 = __importDefault(require("mocha-context"));
const chai_1 = __importDefault(require("chai"));
const should = chai_1.default.should();
describe('test', () => {
    before(() => {
        mocha_context_1.default({
            prop1: 'test'
        });
    });
    it('should work', () => {
        mocha_context_1.default().prop1.should.equal('test');
    });
});
