import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {Subscription} from 'rxjs';
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

    readonly subjects = signal<SubjectInterface[]>([]);
    readonly subjectsLoading = signal<boolean>(false);
    readonly distributions = signal<TeacherDistributionInterface[]>([]);
    readonly distributionsLoading = signal<boolean>(false);
    readonly enrolledCounts = signal<Record<string, number>>({});
    readonly enrolledCountsLoading = signal<boolean>(false);

    private subjectsSubscription: Subscription | null = null;
    private distributionsSubscription: Subscription | null = null;
    private countsSubscription: Subscription | null = null;

    constructor() {
        this.httpService.findCareers().subscribe({
            next: data => this.careers.set(data),
            error: () => {},
        });
        this.httpService.findSchoolPeriods().subscribe({
            next: data => this.schoolPeriods.set(data),
            error: () => {},
        });
        this.httpService.findCatalogues().subscribe({
            next: data => this.catalogues.set(data),
            error: () => {},
        });

        effect(() => {
            const careerId = this.filterForm().careerId;
            this.subjectsSubscription?.unsubscribe();
            this.subjectsSubscription = null;
            this.subjects.set([]);
            if (!careerId) return;

            this.subjectsLoading.set(true);
            this.subjectsSubscription = this.httpService.findSubjectsByCareer(careerId).subscribe({
                next: data => {
                    this.subjects.set(data);
                    this.subjectsLoading.set(false);
                },
                error: () => {
                    this.subjectsLoading.set(false);
                },
            });
        });

        effect(() => {
            this.loadDistributions(true);
        });

        effect(() => {
            const ids = this.distributions().map(d => d.id);
            this.countsSubscription?.unsubscribe();
            this.countsSubscription = null;
            if (!ids.length) {
                this.enrolledCounts.set({});
                this.enrolledCountsLoading.set(false);
                return;
            }

            this.enrolledCountsLoading.set(true);
            this.countsSubscription = this.httpService.findEnrolledCounts(ids).subscribe({
                next: data => {
                    this.enrolledCounts.set(data);
                    this.enrolledCountsLoading.set(false);
                },
                error: () => {
                    this.enrolledCountsLoading.set(false);
                },
            });
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
        this.loadDistributions(false);
    }

    private loadDistributions(reset: boolean): void {
        const schoolPeriodId = this.filterForm().schoolPeriodId;
        this.distributionsSubscription?.unsubscribe();
        this.distributionsSubscription = null;
        if (!schoolPeriodId) {
            this.distributions.set([]);
            this.distributionsLoading.set(false);
            return;
        }

        if (reset) this.distributions.set([]);
        this.distributionsLoading.set(true);
        this.distributionsSubscription = this.httpService.findAllDistributions({schoolPeriodId}).subscribe({
            next: data => {
                this.distributions.set(data);
                this.distributionsLoading.set(false);
            },
            error: () => {
                this.distributionsLoading.set(false);
            },
        });
    }
}
