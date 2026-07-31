import {Component, effect, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FieldTree, form} from '@angular/forms/signals';
import {Dialog} from 'primeng/dialog';
import {CatalogueInterface} from '@utils/interfaces';
import {Select} from 'primeng/select';
import {ButtonModule} from 'primeng/button';
import {InputNumber} from 'primeng/inputnumber';
import {LabelDirective} from '@utils/directives/label.directive';
import {ErrorMessageDirective} from '@utils/directives/error-message.directive';
import {
    INITIAL_MODAL_FORM,
    ModalFormInterface,
} from '../../enrollment-capacity.state';
import {validateModalForm} from './capacity-modal.validation';
import {CustomIcons} from '@utils/icons/custom-icons';

@Component({
    selector: 'app-capacity-modal',
    imports: [FormsModule, Dialog, Select, ButtonModule, InputNumber, LabelDirective, ErrorMessageDirective],
    templateUrl: './capacity-modal.component.html',
})
export class CapacityModalComponent {
    protected readonly CustomIcons = CustomIcons;

    readonly visible = input.required<boolean>();
    readonly editMode = input.required<boolean>();
    readonly selectedLevelName = input<string>('');
    readonly initialFormValues = input<ModalFormInterface>({...INITIAL_MODAL_FORM});
    readonly workdays = input.required<CatalogueInterface[]>();
    readonly parallels = input.required<CatalogueInterface[]>();

    readonly save = output<ModalFormInterface>();
    readonly delete = output<void>();
    readonly close = output<void>();

    private readonly localModalForm = signal<ModalFormInterface>({...INITIAL_MODAL_FORM});
    protected readonly formData: FieldTree<ModalFormInterface> = this.buildForm();

    protected readonly errorFields = {
        workdayId: this.formData.workdayId as FieldTree<any>,
        parallelId: this.formData.parallelId as FieldTree<any>,
        capacity: this.formData.capacity as FieldTree<any>,
    };

    constructor() {
        effect(() => {
            if (this.visible()) {
                this.localModalForm.set({...this.initialFormValues()});
            }
        });
    }

    protected onSaveClick(): void {
        if (this.formData().invalid()) return;
        this.save.emit({...this.localModalForm()});
    }

    protected onDeleteClick(): void {
        this.delete.emit();
    }

    protected onHide(): void {
        this.close.emit();
    }

    private buildForm(): FieldTree<ModalFormInterface> {
        return form<ModalFormInterface>(this.localModalForm, (schema) => {
            validateModalForm(schema);
        });
    }
}
