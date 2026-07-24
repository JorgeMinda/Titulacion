import {computed, inject, Injectable, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {Observable, of} from 'rxjs';
import {EnrollmentCapacityHttpService} from './enrollment-capacity.service';
import {
    TeacherDistributionInterface,
    CatalogueInterface,
    ClassroomInterface,
    FilterFormInterface,
    ModalFormInterface,
    RowInterface,
    CellInterface,
    EnrollmentCapacityStatistics,
    ChartDataInterface,
    ChartOptionsInterface,
    CreateTeacherDistributionPayload,
    UpdateTeacherDistributionPayload,
    DEFAULT_CHART_OPTIONS,
    INITIAL_FILTER_FORM,
    INITIAL_MODAL_FORM,
    SubjectInterface,
} from './enrollment-capacity.state';
import {
    buildEnrollmentMatrix,
    calculateEnrollmentStatistics,
    buildEnrollmentChart,
    buildCountsMap,
} from './enrollment-capacity.helpers';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacityStore {
    private readonly httpService = inject(EnrollmentCapacityHttpService);

    readonly filterForm = signal<FilterFormInterface>({...INITIAL_FILTER_FORM});
    readonly modalForm = signal<ModalFormInterface>({...INITIAL_MODAL_FORM});

    readonly careers = signal<CatalogueInterface[]>([]);
    readonly schoolPeriods = signal<CatalogueInterface[]>([]);
    readonly classrooms = signal<ClassroomInterface[]>([]);

    readonly modalVisible = signal<boolean>(false);
    readonly isEditMode = signal<boolean>(false);
    readonly selectedCell = signal<CellInterface | null>(null);
    readonly chartOptions = signal<ChartOptionsInterface>(DEFAULT_CHART_OPTIONS);
    readonly selectedSubjectId = signal<string | null>(null);

    readonly careersError = signal<string | null>(null);
    readonly schoolPeriodsError = signal<string | null>(null);
    readonly classroomsError = signal<string | null>(null);

    private readonly subjectsResource = rxResource({
        params: () => this.filterForm().careerId || undefined,
        stream: ({params: careerId}) =>
            careerId ? this.httpService.findSubjectsByCareer(careerId) : of([]),
    });

    readonly subjects = computed<SubjectInterface[]>(() => this.subjectsResource.value() ?? []);

    private readonly distributionsResource = rxResource({
        params: () => this.filterForm().schoolPeriodId || undefined,
        stream: ({params: schoolPeriodId}) =>
            schoolPeriodId
                ? this.httpService.findAllDistributions({schoolPeriodId})
                : of([]),
    });

    readonly distributions = computed<TeacherDistributionInterface[]>(() =>
        this.distributionsResource.value() ?? []
    );

    private readonly enrolledCountsResource = rxResource({
        params: () => this.distributions().map(d => d.id),
        stream: ({params: ids}) =>
            ids.length ? this.httpService.findEnrolledCounts(ids) : of({}),
    });

    readonly enrolledCounts = computed<Map<string, number>>(() =>
        buildCountsMap(this.distributions(), this.enrolledCountsResource.value() ?? {})
    );

    readonly isLoading = computed(() =>
        this.subjectsResource.isLoading() ||
        this.distributionsResource.isLoading() ||
        this.enrolledCountsResource.isLoading()
    );

    readonly filteredDistributions = computed(() => {
        const selected = this.selectedSubjectId();
        if (!selected) return this.distributions();
        return this.distributions().filter((d) => d.subjectId === selected);
    });

    readonly parallels = computed(() => {
        const parallelsMap = new Map<string, CatalogueInterface>();
        this.filteredDistributions().forEach((dist) => {
            if (dist.parallel && !parallelsMap.has(dist.parallel.id)) {
                parallelsMap.set(dist.parallel.id, {
                    id: dist.parallel.id,
                    name: dist.parallel.name,
                    code: dist.parallel.code,
                });
            }
        });
        return Array.from(parallelsMap.values());
    });

    readonly workdays = computed(() => {
        const workdaysMap = new Map<string, CatalogueInterface>();
        this.filteredDistributions().forEach((dist) => {
            if (dist.workday && !workdaysMap.has(dist.workday.id)) {
                workdaysMap.set(dist.workday.id, {
                    id: dist.workday.id,
                    name: dist.workday.name,
                    code: dist.workday.code,
                });
            }
        });
        return Array.from(workdaysMap.values());
    });

    readonly matrix = computed(() =>
        buildEnrollmentMatrix(this.filteredDistributions(), this.enrolledCounts())
    );

    readonly statistics = computed(() =>
        calculateEnrollmentStatistics(this.filteredDistributions(), this.enrolledCounts())
    );

    readonly chartData = computed(() =>
        buildEnrollmentChart(this.statistics())
    );

    readonly hasBothFilters = computed(() =>
        !!this.filterForm().careerId && !!this.filterForm().schoolPeriodId
    );

    readonly showDetails = computed(() =>
        this.hasBothFilters() && !!this.selectedSubjectId()
    );

    readonly hasSelectedLevelDistributions = computed(() => {
        const subjectId = this.selectedSubjectId();
        if (!subjectId) return false;
        return this.distributions().some((d) => d.subjectId === subjectId);
    });

    readonly selectedCellHasEnrolledStudents = computed(() => {
        const cell = this.selectedCell();
        return cell ? cell.enrolledCount > 0 : false;
    });

    loadInitialData(): void {
        this.httpService.findCareers().subscribe({
            next: (data) => this.careers.set(data),
            error: () => this.careersError.set('Error al cargar carreras'),
        });

        this.httpService.findSchoolPeriods().subscribe({
            next: (data) => this.schoolPeriods.set(data),
            error: () => this.schoolPeriodsError.set('Error al cargar períodos escolares'),
        });

        this.httpService.findClassrooms().subscribe({
            next: (data) => this.classrooms.set(data),
            error: () => this.classroomsError.set('Error al cargar aulas'),
        });
    }

    selectSubject(subjectId: string | null): void {
        this.selectedSubjectId.set(subjectId);
    }

    openCreateModal(subjectId?: string): void {
        this.isEditMode.set(false);
        this.selectedCell.set(null);
        this.modalForm.set({
            ...INITIAL_MODAL_FORM,
            subjectId: subjectId || null,
        });
        this.modalVisible.set(true);
    }

    openEditModal(cell: CellInterface): void {
        this.isEditMode.set(true);
        this.selectedCell.set(cell);
        this.modalForm.set({
            capacity: cell.maxCapacity,
            parallelId: cell.parallelId,
            workdayId: cell.workdayId,
            subjectId: cell.subjectId,
            classroomId: cell.classroomId,
        });
        this.modalVisible.set(true);
    }

    closeModal(): void {
        this.modalVisible.set(false);
        this.selectedCell.set(null);
        this.modalForm.set({...INITIAL_MODAL_FORM});
    }

    updateDistribution(payload: UpdateTeacherDistributionPayload): Observable<TeacherDistributionInterface> {
        const cell = this.selectedCell();
        if (!cell) return of();

        return this.httpService.update(cell.id, payload);
    }

    createDistribution(payload: CreateTeacherDistributionPayload): Observable<TeacherDistributionInterface> {
        return this.httpService.register(payload);
    }

    deleteDistribution(): Observable<void> {
        const cell = this.selectedCell();
        if (!cell) return of();

        return this.httpService.remove(cell.id);
    }

    reloadDistributions(): void {
        this.distributionsResource.reload();
    }

    onSaveSuccess(): void {
        this.distributionsResource.reload();
        this.closeModal();
    }

    getSelectedCellDistribution(): CellInterface | null {
        return this.selectedCell();
    }

    getModalData(): ModalFormInterface {
        return this.modalForm();
    }

    getFilterSchoolPeriodId(): string {
        return this.filterForm().schoolPeriodId;
    }

    getFirstParallelId(): string {
        return this.parallels()[0]?.id ?? '';
    }
}
