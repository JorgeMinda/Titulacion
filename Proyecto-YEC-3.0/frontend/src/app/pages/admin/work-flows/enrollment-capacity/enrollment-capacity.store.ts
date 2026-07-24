import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {Observable, of} from 'rxjs';
import {EnrollmentCapacityHttpService} from './enrollment-capacity.service';
import {
    TeacherDistributionInterface,
    CatalogueInterface,
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
    CATALOGUE_TYPE_WORKDAY,
    CATALOGUE_TYPE_CLASSROOM,
    CATALOGUE_TYPE_PARALLEL,
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
    readonly catalogues = signal<CatalogueInterface[]>([]);

    readonly modalVisible = signal<boolean>(false);
    readonly isEditMode = signal<boolean>(false);
    readonly selectedCell = signal<CellInterface | null>(null);
    readonly chartOptions = signal<ChartOptionsInterface>(DEFAULT_CHART_OPTIONS);
    readonly selectedSubjectId = signal<string | null>(null);

    readonly careersError = signal<string | null>(null);
    readonly schoolPeriodsError = signal<string | null>(null);
    readonly cataloguesError = signal<string | null>(null);

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

    readonly parallels = computed(() =>
        this.catalogues().filter((c) => c.type === CATALOGUE_TYPE_PARALLEL)
    );

    readonly workdays = computed(() =>
        this.catalogues().filter((c) => c.type === CATALOGUE_TYPE_WORKDAY)
    );

    readonly classrooms = computed(() =>
        this.catalogues().filter((c) => c.type === CATALOGUE_TYPE_CLASSROOM)
    );

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

    private readonly initTrigger = signal(0);

    constructor() {
        effect((onCleanup) => {
            this.initTrigger();

            const sub1 = this.httpService.findCareers().subscribe({
                next: (data) => this.careers.set(data),
                error: () => this.careersError.set('Error al cargar carreras'),
            });
            const sub2 = this.httpService.findSchoolPeriods().subscribe({
                next: (data) => this.schoolPeriods.set(data),
                error: () => this.schoolPeriodsError.set('Error al cargar períodos escolares'),
            });
            const sub3 = this.httpService.findCatalogues().subscribe({
                next: (data) => this.catalogues.set(data),
                error: () => this.cataloguesError.set('Error al cargar catálogos'),
            });

            onCleanup(() => {
                sub1.unsubscribe();
                sub2.unsubscribe();
                sub3.unsubscribe();
            });
        });
    }

    loadInitialData(): void {
        this.initTrigger.update(c => c + 1);
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
