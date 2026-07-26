// filter-panel.component.ts
import {Component, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {FieldTree, form} from '@angular/forms/signals';
import {FormsModule} from '@angular/forms';
import {Select} from 'primeng/select';
import {LabelDirective} from '@utils/directives/label.directive';
import {ErrorMessageDirective} from '@utils/directives/error-message.directive';
import {FormRegistryService} from '@utils/services/form-registry.service';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {FilterFormInterface, INITIAL_FILTER_FORM} from '../../enrollment-capacity.state';
import {validateFilterForm} from './filter-panel.validation';

const FORM_STATE_KEY = 'filterForm';

@Component({
    selector: 'app-filter-panel',
    imports: [FormsModule, Select, LabelDirective, ErrorMessageDirective],
    templateUrl: './filter-panel.component.html',
})
export class FilterPanelComponent implements OnInit, OnDestroy {
    private readonly formRegistryService = inject(FormRegistryService);
    protected readonly store = inject(EnrollmentCapacityStore);

    // 🔹 Estado LOCAL del formulario — el store ya no es la fuente directa
    private readonly localFilterForm = signal<FilterFormInterface>({...INITIAL_FILTER_FORM});

    protected readonly formData: FieldTree<FilterFormInterface> = this.buildForm();
    protected readonly errorFields = {
        careerId: this.formData.careerId as FieldTree<any>,
        schoolPeriodId: this.formData.schoolPeriodId as FieldTree<any>,
    };

    constructor() {
        // 🔹 Solo sincroniza hacia el store cuando el formulario es válido
        effect(() => {
            const value = this.localFilterForm();
            const isValid = this.formData().valid();
            if (isValid) {
                this.store.filterForm.set(value);
            }
        });
    }

    ngOnInit(): void {
        this.formRegistryService.register(
            'Filtros de Capacidad',
            FORM_STATE_KEY,
            this.formData,
            this.localFilterForm()
        );
    }

    ngOnDestroy(): void {
        this.formRegistryService.unregister(FORM_STATE_KEY);
    }

    private buildForm(): FieldTree<FilterFormInterface> {
        return form<FilterFormInterface>(this.localFilterForm, (schema) => {
            validateFilterForm(schema);
        });
    }
}