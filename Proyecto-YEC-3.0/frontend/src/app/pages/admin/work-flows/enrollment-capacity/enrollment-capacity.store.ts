import {computed, inject, Injectable, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {CatalogueInterface} from '@utils/interfaces';
import {EnrollmentCapacityHttpService} from './enrollment-capacity.service';
import {
    TeacherDistributionInterface,
    FilterFormInterface,
    ModalFormInterface,
    CellInterface,
    ChartOptionsInterface,
    SubjectInterface,
    INITIAL_FILTER_FORM,
    INITIAL_MODAL_FORM,
    DEFAULT_CHART_OPTIONS,
    ERROR_MESSAGES,
} from './enrollment-capacity.state';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacityStore {
    private readonly httpService = inject(EnrollmentCapacityHttpService);

    readonly filterForm = signal<FilterFormInterface>({...INITIAL_FILTER_FORM});
    readonly modalForm = signal<ModalFormInterface>({...INITIAL_MODAL_FORM});
    readonly modalVisible = signal<boolean>(false);
    readonly isEditMode = signal<boolean>(false);
    readonly selectedCell = signal<CellInterface | null>(null);
    readonly chartOptions = signal<ChartOptionsInterface>(DEFAULT_CHART_OPTIONS);
    readonly selectedSubjectId = signal<string | null>(null);

    readonly careers = signal<CatalogueInterface[]>([]);
    readonly schoolPeriods = signal<CatalogueInterface[]>([]);
    readonly catalogues = signal<CatalogueInterface[]>([]);

    readonly subjectsResource = rxResource({
        params: () => this.filterForm().careerId || undefined,
        stream: ({params: careerId}) =>
            careerId ? this.httpService.findSubjectsByCareer(careerId) : of([]),
    });
    readonly subjects = computed<SubjectInterface[]>(() => this.subjectsResource.value() ?? []);

    readonly distributionsResource = rxResource({
        params: () => this.filterForm().schoolPeriodId || undefined,
        stream: ({params: schoolPeriodId}) =>
            schoolPeriodId
                ? this.httpService.findAllDistributions({schoolPeriodId})
                : of([]),
    });
    readonly distributions = computed<TeacherDistributionInterface[]>(() =>
        this.distributionsResource.value() ?? []
    );

    readonly enrolledCountsResource = rxResource({
        params: () => this.distributions().map(d => d.id),
        stream: ({params: ids}) =>
            ids.length ? this.httpService.findEnrolledCounts(ids) : of({}),
    });
    readonly enrolledCountsRaw = computed(() => this.enrolledCountsResource.value() ?? {});

    constructor() {
        this.httpService.findCareers().subscribe({
            next: data => this.careers.set(data),
            error: () => console.error(ERROR_MESSAGES.CAREERS_LOAD),
        });
        this.httpService.findSchoolPeriods().subscribe({
            next: data => this.schoolPeriods.set(data),
            error: () => console.error(ERROR_MESSAGES.SCHOOL_PERIODS_LOAD),
        });
        this.httpService.findCatalogues().subscribe({
            next: data => this.catalogues.set(data),
            error: () => console.error(ERROR_MESSAGES.CATALOGUES_LOAD),
        });
    }

    selectSubject(subjectId: string | null): void {
        this.selectedSubjectId.set(subjectId);
    }

    closeModal(): void {
        this.modalVisible.set(false);
        this.selectedCell.set(null);
        this.modalForm.set({...INITIAL_MODAL_FORM});
    }

    reloadDistributions(): void {
        this.distributionsResource.reload();
    }
}
