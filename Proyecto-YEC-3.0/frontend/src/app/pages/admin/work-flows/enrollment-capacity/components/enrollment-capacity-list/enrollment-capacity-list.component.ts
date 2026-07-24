import {Component, effect, inject, OnInit} from '@angular/core';
import {ConfirmDialog} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {FilterPanelComponent} from '../filter-panel/filter-panel.component';
import {StatisticsPanelComponent} from '../statistics-panel/statistics-panel.component';
import {CapacityMatrixComponent} from '../capacity-matrix/capacity-matrix.component';
import {CapacityModalComponent} from '../capacity-modal/capacity-modal.component';
import {LevelCardsComponent} from '../level-cards/level-cards.component';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {CellInterface} from '../../enrollment-capacity.state';
import {BreadcrumbService} from '@layout/service/breadcrumb.service';
import {MY_ROUTES} from '@routes';
import {CustomMessageService, FormRegistryService} from '@utils/services';

@Component({
    selector: 'app-enrollment-capacity-list',
    imports: [
        ConfirmDialog,
        ButtonModule,
        FilterPanelComponent,
        StatisticsPanelComponent,
        CapacityMatrixComponent,
        CapacityModalComponent,
        LevelCardsComponent,
    ],
    templateUrl: './enrollment-capacity-list.component.html',
})
export class EnrollmentCapacityListComponent implements OnInit {
    private readonly breadcrumbService = inject(BreadcrumbService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly customMessageService = inject(CustomMessageService);
    private readonly formRegistryService = inject(FormRegistryService);
    protected readonly store = inject(EnrollmentCapacityStore);

    constructor() {
        this.breadcrumbService.setItems([
            {
                label: 'Capacidad de Matrícula',
                routerLink: MY_ROUTES.adminPages.enrollmentCapacity.absolute,
            },
        ]);
    }

    ngOnInit(): void {
        this.store.loadInitialData();
    }

    protected openCreateModal(): void {
        this.store.openCreateModal(this.store.selectedSubjectId() ?? undefined);
    }

    protected openEditModal(cell: CellInterface): void {
        this.store.openEditModal(cell);
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
            icon: 'pi pi-question-circle',
            acceptLabel: isEdit ? 'Actualizar' : 'Guardar',
            rejectLabel: 'Cancelar',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.saveDistribution(),
        });
    }

    protected confirmDelete(): void {
        if (this.store.selectedCellHasEnrolledStudents()) {
            const cell = this.store.getSelectedCellDistribution();
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
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            acceptIcon: 'pi pi-trash',
            rejectIcon: 'pi pi-times',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.deleteDistribution(),
        });
    }

    private saveDistribution(): void {
        if (this.store.isEditMode()) {
            this.updateDistribution();
        } else {
            this.createDistribution();
        }
    }

    private updateDistribution(): void {
        const cell = this.store.getSelectedCellDistribution();
        if (!cell) return;

        const modalData = this.store.getModalData();

        this.store.updateDistribution({
            capacity: modalData.capacity,
            parallelId: cell.parallelId,
            workdayId: cell.workdayId,
            subjectId: cell.subjectId,
            schoolPeriodId: cell.schoolPeriodId,
            classroomId: modalData.classroomId || cell.classroomId,
        }).subscribe({
            next: () => {
                this.store.onSaveSuccess();
            },
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo actualizar la distribución',
                });
            },
        });
    }

    private createDistribution(): void {
        const modalData = this.store.getModalData();

        if (!modalData.subjectId || !modalData.workdayId || !modalData.classroomId) {
            this.customMessageService.showError({
                summary: 'Error',
                detail: 'Todos los campos son obligatorios',
            });
            return;
        }

        const parallelId = modalData.parallelId ?? this.store.getFirstParallelId();

        this.store.createDistribution({
            capacity: modalData.capacity,
            parallelId,
            workdayId: modalData.workdayId,
            subjectId: modalData.subjectId,
            schoolPeriodId: this.store.getFilterSchoolPeriodId(),
            classroomId: modalData.classroomId,
            hours: modalData.hours || 4,
        }).subscribe({
            next: () => {
                this.store.onSaveSuccess();
            },
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo crear la distribución',
                });
            },
        });
    }

    private deleteDistribution(): void {
        this.store.deleteDistribution().subscribe({
            next: () => {
                this.store.onSaveSuccess();
            },
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo eliminar la distribución',
                });
            },
        });
    }
}
