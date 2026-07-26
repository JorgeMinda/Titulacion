import {inject, Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {EnrollmentCapacityHttpService} from '../../enrollment-capacity.service';
import {
    CellInterface,
    CreateTeacherDistributionPayload,
    UpdateTeacherDistributionPayload,
    TeacherDistributionInterface,
    INITIAL_MODAL_FORM,
} from '../../enrollment-capacity.state';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacityActions {
    private readonly store = inject(EnrollmentCapacityStore);
    private readonly httpService = inject(EnrollmentCapacityHttpService);

    openCreateModal(subjectId?: string): void {
        this.store.isEditMode.set(false);
        this.store.selectedCell.set(null);
        this.store.modalForm.set({
            ...INITIAL_MODAL_FORM,
            subjectId: subjectId || null,
        });
        this.store.modalVisible.set(true);
    }

    openEditModal(cell: CellInterface): void {
        this.store.isEditMode.set(true);
        this.store.selectedCell.set(cell);
        this.store.modalForm.set({
            capacity: cell.maxCapacity,
            parallelId: cell.parallelId,
            workdayId: cell.workdayId,
            subjectId: cell.subjectId,
            classroomId: cell.classroomId,
        });
        this.store.modalVisible.set(true);
    }

    save(payload: {
        modalData: {
            capacity: number;
            subjectId: string | null;
            workdayId: string | null;
            parallelId: string | null;
            classroomId: string | null;
            hours?: number;
        };
        firstParallelId: string;
    }): Observable<TeacherDistributionInterface> {
        if (this.store.isEditMode()) {
            return this.update(payload);
        }
        return this.create(payload);
    }

    private update(payload: {
        modalData: {
            capacity: number;
            classroomId: string | null;
        };
    }): Observable<TeacherDistributionInterface> {
        const cell = this.store.selectedCell();
        if (!cell) return of();

        const data: UpdateTeacherDistributionPayload = {
            capacity: payload.modalData.capacity,
            parallelId: cell.parallelId,
            workdayId: cell.workdayId,
            subjectId: cell.subjectId,
            schoolPeriodId: cell.schoolPeriodId,
            classroomId: payload.modalData.classroomId || cell.classroomId,
        };
        return this.httpService.update(cell.id, data);
    }

    private create(payload: {
        modalData: {
            capacity: number;
            subjectId: string | null;
            workdayId: string | null;
            parallelId: string | null;
            classroomId: string | null;
            hours?: number;
        };
        firstParallelId: string;
    }): Observable<TeacherDistributionInterface> {
        const {modalData, firstParallelId} = payload;

        if (!modalData.subjectId || !modalData.workdayId) {
            return of();
        }

        const parallelId = modalData.parallelId ?? firstParallelId;
        if (!parallelId) {
            return of();
        }

        const data: CreateTeacherDistributionPayload = {
            capacity: modalData.capacity,
            parallelId,
            workdayId: modalData.workdayId,
            subjectId: modalData.subjectId,
            schoolPeriodId: this.store.filterForm().schoolPeriodId,
            classroomId: modalData.classroomId,
            hours: modalData.hours || 4,
        };
        return this.httpService.register(data);
    }

    delete(): Observable<void> {
        const cell = this.store.selectedCell();
        if (!cell) return of();
        return this.httpService.remove(cell.id);
    }

    onSaveSuccess(): void {
        this.store.reloadDistributions();
        this.store.closeModal();
    }
}
