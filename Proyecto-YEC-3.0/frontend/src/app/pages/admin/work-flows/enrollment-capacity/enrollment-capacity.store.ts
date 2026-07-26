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
} from './enrollment-capacity.state';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacityStore {
    private readonly httpService = inject(EnrollmentCapacityHttpService);
    private readonly initialLoadParam = {};

    readonly filterForm = signal<FilterFormInterface>({...INITIAL_FILTER_FORM});
    readonly modalForm = signal<ModalFormInterface>({...INITIAL_MODAL_FORM});
    readonly modalVisible = signal<boolean>(false);
    readonly isEditMode = signal<boolean>(false);
    readonly selectedCell = signal<CellInterface | null>(null);
    readonly chartOptions = signal<ChartOptionsInterface>(DEFAULT_CHART_OPTIONS);
    readonly selectedSubjectId = signal<string | null>(null);

    readonly careersResource = rxResource({
        params: () => this.initialLoadParam,
        stream: () => this.httpService.findCareers(),
    });
    readonly careers = computed<CatalogueInterface[]>(() => this.careersResource.value() ?? []);
    readonly careersError = computed(() => this.careersResource.error() ? 'Error al cargar carreras' : null);

    readonly schoolPeriodsResource = rxResource({
        params: () => this.initialLoadParam,
        stream: () => this.httpService.findSchoolPeriods(),
    });
    readonly schoolPeriods = computed<CatalogueInterface[]>(() => this.schoolPeriodsResource.value() ?? []);
    readonly schoolPeriodsError = computed(() => this.schoolPeriodsResource.error() ? 'Error al cargar períodos escolares' : null);

    readonly cataloguesResource = rxResource({
        params: () => this.initialLoadParam,
        stream: () => this.httpService.findCatalogues(),
    });
    readonly catalogues = computed<CatalogueInterface[]>(() => this.cataloguesResource.value() ?? []);
    readonly cataloguesError = computed(() => this.cataloguesResource.error() ? 'Error al cargar catálogos' : null);

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
    readonly enrolledCountsRaw = this.enrolledCountsResource.value;

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

    loadInitialData(): void {
        this.careersResource.reload();
        this.schoolPeriodsResource.reload();
        this.cataloguesResource.reload();
    }
}
