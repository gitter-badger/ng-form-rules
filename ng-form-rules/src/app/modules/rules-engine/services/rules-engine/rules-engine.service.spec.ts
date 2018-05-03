import { TestBed, inject } from '@angular/core/testing';

import { RulesEngineService } from './rules-engine.service';
import { MODEL_SETTINGS_TOKEN } from '../../../form-rules/injection-tokens/model-settings.token';
import { AbstractModelSettings } from '../../../form-rules/models/abstract-model-settings';
import { Property } from '../../../form-rules/models/property';
import { RuleGroup } from '../../../form-rules/models/rule-group';
import { TestResult, PropertyTestResults, TestResultsBase } from '../../../form-rules/models/test-result';
import { Person } from '../../../test-utils/models/person';
import { PersonModelSettings, validPerson, invalidPerson } from '../../../test-utils/models/person-model-settings';
import { Rule } from '../../../form-rules/models/rule';
import { Test } from '../../../form-rules/models/test';
import { TraceService } from '../../../utils/trace/trace.service';
import { TRACE_SETTINGS_TOKEN } from '../../../form-rules/injection-tokens/trace-settings.token';

describe('RulesEngineService', () => {
    let svc: RulesEngineService;
    let personModelSettings: AbstractModelSettings<Person>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                RulesEngineService,
                TraceService,
                {
                    provide: MODEL_SETTINGS_TOKEN,
                    useValue: [
                        new PersonModelSettings("a")
                    ]
                },
                { provide: TRACE_SETTINGS_TOKEN, useValue: true }
            ]
        });

        svc = TestBed.get(RulesEngineService);
        personModelSettings = svc.getModelSettings<Person>("a");
    });

    it('should be created', () => {
        expect(svc).toBeTruthy();
    });

    describe('compilation', () => {
        it('should set model settings initialized via the injection token', () => {
            expect(personModelSettings).toBeTruthy();
        });

        it('should not set model setting when not in the injection token', () => {
            const badSettings = svc.getModelSettings<Person>("bad-name");
            expect(badSettings).toBeFalsy();
        });

        it('should set properties configured in model settings', () => {
            expect(personModelSettings.properties.length).toEqual(3);
            expect(personModelSettings.properties.map(x => x.name)).toEqual(["name", "age", "nicknames"]);
        });
    });

    describe('rule set processing', () => {
        it('should process rule group', () => {
            const ruleGroup = personModelSettings.properties.find(x => x.name == "name").valid[0].check;
            expect(svc.processRuleSet(validPerson, ruleGroup)).toBeTruthy();
            expect(svc.processRuleSet(invalidPerson, ruleGroup)).toBeFalsy();
        });

        it('should process rule', () => {
            const ruleGroup = personModelSettings.properties.find(x => x.name == "age").valid[0].check;
            expect(svc.processRuleSet(validPerson, ruleGroup)).toBeTruthy();
            expect(svc.processRuleSet(invalidPerson, ruleGroup)).toBeFalsy();
        });

        it('should process rule using root data', () => {
            const rule = { func: (x, root) => root.a === 1 } as Rule<any>;
            expect(svc.processRuleSet({}, rule, { rootData: { a: 1 } })).toBeTruthy();
            expect(svc.processRuleSet(invalidPerson, rule, { rootData: { a: 0 } })).toBeFalsy();
        });

        it('should process falsey rule and return positive', () => {
            expect(svc.processRuleSet({ name: "Whatever"}, null)).toBeTruthy();
        });
    });

    describe('running test', () => {
        it('should handle a passed test', () => {
            const test = personModelSettings.properties.find(x => x.name == "name").valid[0];
            const result = svc.runTest(validPerson, test);
            expect(result).toEqual({ passed: true, message: null, name: "Chris" } as TestResult<Person>);
        });

        it('should handle a failed test', () => {
            const test = personModelSettings.properties.find(x => x.name == "name").valid[0];
            const result = svc.runTest(invalidPerson, test);
            expect(result).toEqual({ passed: false, message: "Doesn't equal Chris", name: "Chris" } as TestResult<Person>);
        });

        it('should handle when provided a falsey test', () => {
            const result = svc.runTest({ name: "Whatever"}, null);
            expect(result).toEqual({ passed: true, message: null, name: null } as TestResult<Person>);
        });

        it('should pass rule where condition is not met', () => {
            const test = personModelSettings.properties.find(x => x.name == "name").valid[1];
            const result = svc.runTest({}, test);
            expect(result.passed).toBeTruthy();
        });
    });

    describe('running multiple tests', () => {
        it('should handle passed tests', () => {
            const validTests = personModelSettings.properties.find(x => x.name == "name").valid;
            const results = svc.runTests(validPerson, validTests);
            expect(results.passed).toBeTruthy();
            expect(results.messages).toEqual([]);
            expect(results.failedResults.length).toEqual(0);
            expect(results.passedResults.length).toEqual(2);
            expect(results.results.length).toEqual(2);
        });

        it('should handle failed tests', () => {
            const validTests = personModelSettings.properties.find(x => x.name == "name").valid;
            const results = svc.runTests({}, validTests);
            expect(results.passed).toBeFalsy();
            expect(results.messages).toEqual(["Doesn't equal Chris"]);
            expect(results.failedResults.length).toEqual(1);
            expect(results.passedResults.length).toEqual(1);
            expect(results.results.length).toEqual(2);
        });

        it('should handle when provided falsey tests', () => {
            const results = svc.runTests({}, null);
            expect(results.passed).toBeTruthy();
            expect(results.messages).toEqual([]);
            expect(results.failedResults).toEqual([]);
            expect(results.passedResults).toEqual([]);
            expect(results.results).toEqual([]);
        });

        it('should handle empty tests array', () => {
            const results = svc.runTests({}, []);
            expect(results.passed).toBeTruthy();
            expect(results.messages).toEqual([]);
            expect(results.failedResults).toEqual([]);
            expect(results.passedResults).toEqual([]);
            expect(results.results).toEqual([]);
        });
    });

    describe('validate', () => {
        it('should run validation tests', () => {
            const property = personModelSettings.properties.find(x => x.name == "name");
            const results = svc.validate(invalidPerson, property);
            expect(results.passed).toBeFalsy();
            expect(results.messages).toEqual(["Doesn't equal Chris"]);
        });
    });

    describe('editable', () => {
        it('should run editable tests', () => {
            const property = personModelSettings.properties.find(x => x.name == "name");
            const results = svc.editable(invalidPerson, property);
            expect(results.passed).toBeFalsy();
            expect(results.messages).toEqual(["The first letter isn't C."]);
        });
    });

    describe('visible', () => {
        it('should run visible tests', () => {
            const property = personModelSettings.properties.find(x => x.name == "name");
            const results = svc.visible(invalidPerson, property);
            expect(results.passed).toBeFalsy();
            expect(results.messages).toEqual(["Not 5 characters long."]);
        });
    });

    describe('dependency properties', () => {
        it('should get rule check dependency properties', () => {
            const test = {
                check: {
                    func: () => true,
                    options: { dependencyProperties: ["a"] }
                }
            } as Test<Person>;
            const result = svc.getDependencyProperties([test]);

            expect(result.length).toEqual(1);
            expect(result[0]).toEqual("a");
        });

        it('should get rule condition dependency properties', () => {
            const test = {
                check: null,
                condition: {
                    func: () => true,
                    options: { dependencyProperties: ["a"] }
                }
            } as Test<Person>;
            const result = svc.getDependencyProperties([test]);

            expect(result.length).toEqual(1);
            expect(result[0]).toEqual("a");
        });

        it('should get rule group dependency properties', () => {
            const test = {
                check: {
                    rules: [
                        {
                            func: () => true,
                            options: { dependencyProperties: ["a"] }
                        },
                        {
                            func: () => true,
                            options: { dependencyProperties: ["b"] }
                        }
                    ]
                }
            } as Test<Person>;
            const result = svc.getDependencyProperties([test]);

            expect(result.length).toEqual(2);
            expect(result[0]).toEqual("a");
            expect(result[1]).toEqual("b");
        });

        it('should get unique dependency properties', () => {
            const test = {
                check: {
                    func: () => true,
                    options: { dependencyProperties: ["a", "b", "a", "c", "a"] }
                }
            } as Test<Person>;
            const result = svc.getDependencyProperties([test]);

            expect(result.length).toEqual(3);
            expect(result[0]).toEqual("a");
            expect(result[1]).toEqual("b");
            expect(result[2]).toEqual("c");
        });
    });
});