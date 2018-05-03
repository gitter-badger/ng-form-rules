import { TestBed } from "@angular/core/testing";
import { ReactiveFormsRuleService } from "./reactive-forms-rule.service";
import { ReactiveFormsModule } from "@angular/forms";
import { RulesEngineService } from "../rules-engine/rules-engine.service";
import { MODEL_SETTINGS_TOKEN } from "../../../form-rules/injection-tokens/model-settings.token";
import { PersonModelSettings, validPerson, invalidPerson } from "../../../test-utils/models/person-model-settings";
import { Person } from "../../../test-utils/models/person";
import { AbstractModelSettings } from "../../../form-rules/models/abstract-model-settings";
import { Property } from "../../../form-rules/models/property";
import { TraceService } from "../../../utils/trace/trace.service";
import { TRACE_SETTINGS_TOKEN } from "../../../form-rules/injection-tokens/trace-settings.token";

export class BlahModelSettings extends AbstractModelSettings<Person> {
    buildPropertyRules(): Property<Person>[] {
        return [
            this.builder.property<Person>("age"),
            this.builder.property<Person>("name", p => {
                p.valid = [
                    {
                        name: "Blah test",
                        check: {
                            func: x => x.name == "Chris" && x.age > 0,
                            options: { dependencyProperties: ["age"] }
                        }
                    }
                ];
            })
        ];
    }
}

describe('ReactiveFormsRuleService', () => {
    let svc: ReactiveFormsRuleService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule
            ],
            providers: [
                ReactiveFormsRuleService,
                RulesEngineService,
                TraceService,
                {
                    provide: MODEL_SETTINGS_TOKEN,
                    useValue: [
                        new PersonModelSettings("a"),
                        new BlahModelSettings('b')
                    ]
                },
                { provide: TRACE_SETTINGS_TOKEN, useValue: true }
            ]
        });

        svc = TestBed.get(ReactiveFormsRuleService);
    });

    it('should ... ... ...', () => {
        const fg = svc.createFormGroup('b', { name: "Chris", age: 30 });
        expect(fg.valid).toBeTruthy();
        fg.patchValue({age: -30});
        expect(fg.valid).toBeFalsy();
    });

    it('should be created', () => {
        expect(svc).toBeTruthy();
    });

    describe('create form group', () => {
        it('should create form group according to model settings', () => {
            const fg = svc.createFormGroup('a');
            const value = fg.getRawValue();
            expect(value).toEqual({
                age: null,
                name: null,
                nicknames: [null]
            } as Person);
        });

        it('should throw an error provided non-configured model settings name', () => {
            expect(() => svc.createFormGroup('BAD NAME')).toThrowError(`No model setting found with the name "BAD NAME"`);
        });

        it('should create form group with initial values', () => {
            const fg = svc.createFormGroup('a', validPerson);
            const value = fg.getRawValue();
            expect(value).toEqual(validPerson);
        });

        it('should create form group as valid when given valid values', () => {
            const fg = svc.createFormGroup('a', validPerson);
            expect(fg.valid).toBeTruthy();
        });

        it('should create form group as invalid when given invalid values', () => {
            const fg = svc.createFormGroup('a', invalidPerson);
            expect(fg.valid).toBeFalsy();
        });
    });
});