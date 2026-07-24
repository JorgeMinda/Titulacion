import {computed, inject, Injectable, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {EnrollmentCapacityHttpService} from './enrollment-capacity.service';
import {ConfirmationService} from 'primeng/api';
import {CustomMessageService} from '@utils/services';
import {
    TeacherDistributionInterface,
    CatalogueInterface,
    ClassroomInterface,
    FilterFormInterface,
    ModalFormInterface,
    RowInterface,
    CellInterface,
    EnrollmentCapacityStatistics,
    ShiftStatistics,
    CourseStatistics,
    ChartDataInterface,
    ChartOptionsInterface,
    CreateTeacherDistributionPayload,
    UpdateTeacherDistributionPayload,
    DEFAULT_CHART_OPTIONS,
    INITIAL_FILTER_FORM,
    INITIAL_MODAL_FORM,
    SubjectInterface,
} from './enrollment-capacity.state';

function calculateStatusColor(capacity: number, enrolled: number): 'green' | 'orange' | 'red' {
    if (capacity === 0) return 'red';
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'orange';
    return 'green';
}

function buildCellFromDistribution(
    dist: TeacherDistributionInterface,
    enrolled: number,
): CellInterface {
    const capacity = dist.capacity || 0;
    return {
        id: dist.id,
        schedule: dist.workday?.name || FALLBACK_WORKDAY,
        parallel: dist.parallel?.name || '',
        subject: dist.subject?.name || FALLBACK_SUBJECT,
        subjectId: dist.subjectId,
        parallelId: dist.parallelId,
        workdayId: dist.workdayId,
        schoolPeriodId: dist.schoolPeriodId,
        classroomId: dist.classroomId,
        classroom: dist.classroom?.name || 'Sin aula',
        academicLevel: dist.subject?.curriculum?.career?.name || '',
        maxCapacity: capacity,
        enrolledCount: enrolled,
        statusColor: calculateStatusColor(capacity, enrolled),
        teacherDistributionId: dist.id,
    };
}

function buildCountsMap(
    distributions: TeacherDistributionInterface[],
    counts: Record<string, number>,
): Map<string, number> {
    const map = new Map<string, number>();
    distributions.forEach(d => map.set(d.id, counts[d.id] ?? 0));
    return map;
}

const FALLBACK_WORKDAY = 'Sin Jornada';
const FALLBACK_SUBJECT = 'Sin Materia';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacityStore {
    private readonly httpService = inject(EnrollmentCapacityHttpService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly customMessageService = inject(CustomMessageService);

    readonly filterForm = signal<FilterFormInterface>({...INITIAL_FILTER_FORM});
    readonly modalForm = signal<ModalFormInterface>({...INITIAL_MODAL_FORM});

    readonly careers = signal<CatalogueInterface[]>([]);
    readonly schoolPeriods = signal<CatalogueInterface[]>([]);
    readonly classrooms = signal<ClassroomInterface[]>([]);

    readonly modalVisible = signal<boolean>(false);
    readonly isEditMode = signal<boolean>(false);
    readonly selectedCell = signal<CellInterface | null>(null);
    readonly chartOptions = signal<ChartOptionsInterface>(DEFAULT_CHART_OPTIONS);
    readonly error = signal<string | null>(null);
    readonly selectedSubjectId = signal<string | null>(null);

    // 🔹 Recurso reactivo de materias — se recarga solo cuando cambia careerId
    private readonly subjectsResource = rxResource({
        params: () => this.filterForm().careerId || undefined,
        stream: ({params: careerId}) =>
            careerId ? this.httpService.findSubjectsByCareer(careerId) : of([]),
    });

    readonly subjects = computed<SubjectInterface[]>(() => this.subjectsResource.value() ?? []);

    // 🔹 Recurso reactivo de distribuciones — se recarga solo cuando cambia schoolPeriodId
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

    // 🔹 Recurso reactivo de conteos matriculados — depende de las distribuciones ya cargadas
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
        this.buildEnrollmentMatrix(this.filteredDistributions(), this.enrolledCounts())
    );

    readonly statistics = computed(() =>
        this.calculateEnrollmentStatistics(this.filteredDistributions(), this.enrolledCounts())
    );

    readonly chartData = computed(() =>
        this.buildEnrollmentChart(this.statistics())
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

    loadInitialData(): void {
        this.error.set(null);

        this.httpService.findCareers().subscribe({
            next: (data) => this.careers.set(data),
            error: () => this.error.set('Error al cargar carreras'),
        });

        this.httpService.findSchoolPeriods().subscribe({
            next: (data) => this.schoolPeriods.set(data),
            error: () => this.error.set('Error al cargar períodos escolares'),
        });

        this.httpService.findClassrooms().subscribe({
            next: (data) => this.classrooms.set(data),
            error: () => this.error.set('Error al cargar aulas'),
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

    confirmSave(): void {
        this.confirmationService.confirm({
            key: 'confirmdialog',
            header: this.isEditMode() ? 'Actualizar distribución' : 'Guardar distribución',
            message: this.isEditMode()
                ? '¿Está seguro de actualizar este cupo?'
                : '¿Está seguro de guardar este nuevo cupo?',
            icon: 'pi pi-question-circle',
            acceptLabel: this.isEditMode() ? 'Actualizar' : 'Guardar',
            rejectLabel: 'Cancelar',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.saveDistribution(),
        });
    }

    confirmDelete(): void {
        const cell = this.selectedCell();

        if (cell && cell.enrolledCount > 0) {
            this.customMessageService.showError({
                summary: 'No se puede eliminar',
                detail: `El cupo tiene ${cell.enrolledCount} estudiante(s) matriculado(s). No se puede eliminar un cupo con estudiantes asignados.`,
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
        if (this.isEditMode()) {
            this.updateDistribution();
        } else {
            this.createDistribution();
        }
    }

    private updateDistribution(): void {
        const selectedCell = this.selectedCell();
        if (!selectedCell) return;

        const payload: UpdateTeacherDistributionPayload = {
            capacity: this.modalForm().capacity,
            parallelId: selectedCell.parallelId,
            workdayId: selectedCell.workdayId,
            subjectId: selectedCell.subjectId,
            schoolPeriodId: selectedCell.schoolPeriodId,
            classroomId: this.modalForm().classroomId || selectedCell.classroomId,
        };

        this.httpService.update(selectedCell.id, payload).subscribe({
            next: () => {
                this.distributionsResource.reload();
                this.closeModal();
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
        const modalData = this.modalForm();

        if (!modalData.subjectId || !modalData.workdayId || !modalData.classroomId) {
            this.customMessageService.showError({
                summary: 'Error',
                detail: 'Todos los campos son obligatorios',
            });
            return;
        }

        const parallelId = modalData.parallelId ?? (this.parallels()[0]?.id ?? '');

        const payload: CreateTeacherDistributionPayload = {
            capacity: modalData.capacity,
            parallelId,
            workdayId: modalData.workdayId,
            subjectId: modalData.subjectId,
            schoolPeriodId: this.filterForm().schoolPeriodId,
            classroomId: modalData.classroomId,
            hours: modalData.hours || 4,
        };

        this.httpService.register(payload).subscribe({
            next: () => {
                this.distributionsResource.reload();
                this.closeModal();
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
        const cell = this.selectedCell();
        if (!cell) return;

        this.httpService.remove(cell.id).subscribe({
            next: () => {
                this.distributionsResource.reload();
                this.closeModal();
            },
            error: (err: any) => {
                this.customMessageService.showError({
                    summary: 'Error',
                    detail: err.error?.message || 'No se pudo eliminar la distribución',
                });
            },
        });
    }

    private buildEnrollmentMatrix(
        distributions: TeacherDistributionInterface[],
        counts: Map<string, number>,
    ): RowInterface[] {
        if (!distributions.length) return [];

        const workdayMap = new Map<string, { workdayName: string; cells: CellInterface[] }>();

        distributions.forEach((dist) => {
            const workdayName = dist.workday?.name || FALLBACK_WORKDAY;
            const enrolled = counts.get(dist.id) || 0;
            const cell = buildCellFromDistribution(dist, enrolled);
            const workdayId = dist.workdayId || 'unknown';

            if (!workdayMap.has(workdayId)) {
                workdayMap.set(workdayId, {workdayName, cells: []});
            }

            workdayMap.get(workdayId)!.cells.push(cell);
        });

        return Array.from(workdayMap.entries()).map(([workdayId, {workdayName, cells}]) => ({
            workdayId,
            workdayName,
            scheduleBlocks: [{scheduleName: workdayName, cells}],
        }));
    }

    private calculateEnrollmentStatistics(
        distributions: TeacherDistributionInterface[],
        counts: Map<string, number>,
    ): EnrollmentCapacityStatistics {
        const totalCapacity = distributions.reduce((sum, d) => sum + (d.capacity || 0), 0);
        const totalEnrolled = distributions.reduce((sum, d) => sum + (counts.get(d.id) || 0), 0);
        const totalAvailable = totalCapacity - totalEnrolled;

        return {
            totalCapacity,
            totalEnrolled,
            totalAvailable,
            globalOccupancyPercentage: totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0,
            byShift: this.calculateByShift(distributions, counts),
            byCourse: this.calculateByCourse(distributions, counts),
        };
    }

    private aggregateByKey(
        distributions: TeacherDistributionInterface[],
        counts: Map<string, number>,
        keyFn: (d: TeacherDistributionInterface) => string,
    ): { key: string; capacity: number; enrolled: number; available: number; percentage: number }[] {
        const map = new Map<string, {capacity: number; enrolled: number}>();

        distributions.forEach((dist) => {
            const key = keyFn(dist);
            const current = map.get(key) || {capacity: 0, enrolled: 0};
            current.capacity += dist.capacity || 0;
            current.enrolled += counts.get(dist.id) || 0;
            map.set(key, current);
        });

        return Array.from(map.entries()).map(([key, {capacity, enrolled}]) => ({
            key,
            capacity,
            enrolled,
            available: capacity - enrolled,
            percentage: capacity > 0 ? (enrolled / capacity) * 100 : 0,
        }));
    }

    private calculateByShift(
        distributions: TeacherDistributionInterface[],
        counts: Map<string, number>,
    ): ShiftStatistics[] {
        return this.aggregateByKey(distributions, counts, d => d.workday?.name || FALLBACK_WORKDAY)
            .map(({key, ...rest}) => ({shiftName: key, ...rest}));
    }

    private calculateByCourse(
        distributions: TeacherDistributionInterface[],
        counts: Map<string, number>,
    ): CourseStatistics[] {
        return this.aggregateByKey(distributions, counts, d => d.subject?.name || FALLBACK_SUBJECT)
            .map(({key, ...rest}) => ({courseName: key, ...rest}));
    }

    private buildEnrollmentChart(statistics: EnrollmentCapacityStatistics): ChartDataInterface {
        return {
            labels: ['Ocupados', 'Disponibles'],
            datasets: [
                {
                    data: [statistics.totalEnrolled, statistics.totalAvailable],
                    backgroundColor: ['#f97316', '#22c55e'],
                    hoverBackgroundColor: ['#ea580c', '#16a34a'],
                },
            ],
        };
    }
}