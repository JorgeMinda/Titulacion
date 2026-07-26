import {Component, DestroyRef, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ConfirmDialog} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {FilterPanelComponent} from '../filter-panel/filter-panel.component';
import {StatisticsPanelComponent} from '../statistics-panel/statistics-panel.component';
import {CapacityMatrixComponent} from '../capacity-matrix/capacity-matrix.component';
import {CapacityModalComponent} from '../capacity-modal/capacity-modal.component';
import {LevelCardsComponent} from '../level-cards/level-cards.component';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {EnrollmentCapacitySelectors} from '../logic/enrollment-capacity.selectors';
import {EnrollmentCapacityActions} from '../logic/enrollment-capacity.actions';
import {CellInterface} from '../../enrollment-capacity.state';
import {BreadcrumbService} from '@layout/service/breadcrumb.service';
import {MY_ROUTES} from '@routes';
import {CustomMessageService, FormRegistryService} from '@utils/services';
import {CustomIcons} from '@utils/icons/custom-icons';

@Component({
    selector: 'app-enrollment-capacity-form',
    imports: [
        ConfirmDialog,
        ButtonModule,
        FilterPanelComponent,
        StatisticsPanelComponent,
        CapacityMatrixComponent,
        CapacityModalComponent,
        LevelCardsComponent,
    ],
    templateUrl: './enrollment-capacity-form.component.html',
})
export class EnrollmentCapacityFormComponent {
    private readonly breadcrumbService = inject(BreadcrumbService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly customMessageService = inject(CustomMessageService);
    private readonly formRegistryService = inject(FormRegistryService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly store = inject(EnrollmentCapacityStore);
    protected readonly selectors = inject(EnrollmentCapacitySelectors);
    protected readonly actions = inject(EnrollmentCapacityActions);
    protected readonly CustomIcons = CustomIcons;

    constructor() {
        this.breadcrumbService.setItems([
            {
                label: 'Capacidad de Matrícula',
                routerLink: MY_ROUTES.adminPages.enrollmentCapacity.absolute,
            },
        ]);
    }

    protected openCreateModal(): void {
        this.actions.openCreateModal(this.store.selectedSubjectId() ?? undefined);
    }

    protected openEditModal(cell: CellInterface): void {
        this.actions.openEditModal(cell);
    }

    protected confirmSave(): void {
        const isEdit = this.store.isEditMode();

        if (!isEdit && this.formRegistryService.hasErrors()) {
            this.customMessageService.showFormErrors(this.formRegistryService.errors());
            return;
        }

        this.confirmationService.confirm({
            key: 'confirmdialog',
            header: isEdit ? 'Actualizar distribución' : 'Guardar distribución',
            message: isEdit
                ? '¿Está seguro de actualizar este cupo?'
                : '¿Está seguro de guardar este nuevo cupo?',
            icon: CustomIcons.CIRCLE_QUESTION_SOLID,
            acceptLabel: isEdit ? 'Actualizar' : 'Guardar',
            rejectLabel: 'Cancelar',
            acceptIcon: CustomIcons.CHECK_SOLID,
            rejectIcon: CustomIcons.XMARK_SOLID,
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.saveDistribution(),
        });
    }

    protected confirmDelete(): void {
        if (this.selectors.selectedCellHasEnrolledStudents()) {
            const cell = this.store.selectedCell();
            this.customMessageService.showError({
                summary: 'No se puede eliminar',
                detail: `El cupo tiene ${cell?.enrolledCount} estudiante(s) matriculado(s). No se puede eliminar un cupo con estudiantes asignados.`,
            });
            return;
        }

        this.confirmationService.confirm({
            key: 'confirmdialog',
            header: 'Eliminar distribución',
            message: '¿Está seguro de eliminar este cupo?',
            icon: CustomIcons.TRIANGLE_EXCLAMATION_SOLID,
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            acceptIcon: CustomIcons.TRASH_CAN_SOLID,
            rejectIcon: CustomIcons.XMARK_SOLID,
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.deleteDistribution(),
        });
    }

    private saveDistribution(): void {
        const modalData = this.store.modalForm();

        this.actions.save({
            modalData,
            firstParallelId: this.selectors.firstParallelId(),
        }).pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: () => this.actions.onSaveSuccess(),
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo guardar la distribución',
                });
            },
        });
    }

    private deleteDistribution(): void {
        this.actions.delete().pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: () => this.actions.onSaveSuccess(),
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo eliminar la distribución',
                });
            },
        });
    }
}
