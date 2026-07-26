import {Component, computed, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FieldTree, form} from '@angular/forms/signals';
import {Dialog} from 'primeng/dialog';
import { CatalogueInterface } from '@utils/interfaces';
import {Select} from 'primeng/select';
import {ButtonModule} from 'primeng/button';
import {InputNumber} from 'primeng/inputnumber';
import {LabelDirective} from '@utils/directives/label.directive';
import {ErrorMessageDirective} from '@utils/directives/error-message.directive';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {
   
    ModalFormInterface,
    SubjectInterface,
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
    protected readonly store = inject(EnrollmentCapacityStore);

    readonly visible = input.required<boolean>();
    readonly editMode = input.required<boolean>();
    readonly workdays = input.required<CatalogueInterface[]>();
    readonly classrooms = input.required<CatalogueInterface[]>();
    readonly subjects = input.required<SubjectInterface[]>();

    readonly save = output<void>();
    readonly delete = output<void>();
    readonly close = output<void>();

    protected readonly selectedLevelName = computed(() => {
        const id = this.store.selectedSubjectId();
        if (!id) return '';
        const subject = this.subjects().find((s) => s.id === id);
        return subject?.name ?? '';
    });

    protected readonly formData: FieldTree<ModalFormInterface> = this.buildForm();

    protected readonly errorFields = {
        workdayId: this.formData.workdayId as FieldTree<any>,
        classroomId: this.formData.classroomId as FieldTree<any>,
        capacity: this.formData.capacity as FieldTree<any>,
    };

    protected onSaveClick(): void {
        this.save.emit();
    }

    protected onDeleteClick(): void {
        this.delete.emit();
    }

    protected onHide(): void {
        this.close.emit();
    }

    private buildForm(): FieldTree<ModalFormInterface> {
        return form<ModalFormInterface>(this.store.modalForm, (schema) => {
            validateModalForm(schema);
        });
    }
}
