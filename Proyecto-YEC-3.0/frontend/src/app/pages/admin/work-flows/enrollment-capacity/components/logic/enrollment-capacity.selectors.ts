import {computed, inject, Injectable} from '@angular/core';
import {EnrollmentCapacityStore} from '../../enrollment-capacity.store';
import {CATALOGUE_TYPE_PARALLEL, CATALOGUE_TYPE_WORKDAY, CATALOGUE_TYPE_CLASSROOM} from '../../enrollment-capacity.state';
import {buildEnrollmentMatrix, calculateEnrollmentStatistics, buildEnrollmentChart, buildCountsMap} from './enrollment-capacity.helpers';

@Injectable({providedIn: 'root'})
export class EnrollmentCapacitySelectors {
    private readonly store = inject(EnrollmentCapacityStore);

    readonly parallels = computed(() =>
        this.store.catalogues().filter((c) => c.type === CATALOGUE_TYPE_PARALLEL)
    );

    readonly workdays = computed(() =>
        this.store.catalogues().filter((c) => c.type === CATALOGUE_TYPE_WORKDAY)
    );

    readonly classrooms = computed(() =>
        this.store.catalogues().filter((c) => c.type === CATALOGUE_TYPE_CLASSROOM)
    );

    readonly enrolledCounts = computed(() =>
        buildCountsMap(this.store.distributions(), this.store.enrolledCountsRaw() ?? {})
    );

    readonly filteredDistributions = computed(() => {
        const selected = this.store.selectedSubjectId();
        if (!selected) return this.store.distributions();
        return this.store.distributions().filter((d) => d.subjectId === selected);
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
        !!this.store.filterForm().careerId && !!this.store.filterForm().schoolPeriodId
    );

    readonly showDetails = computed(() =>
        this.hasBothFilters() && !!this.store.selectedSubjectId()
    );

    readonly hasSelectedLevelDistributions = computed(() => {
        const subjectId = this.store.selectedSubjectId();
        if (!subjectId) return false;
        return this.store.distributions().some((d) => d.subjectId === subjectId);
    });

    readonly selectedCellHasEnrolledStudents = computed(() => {
        const cell = this.store.selectedCell();
        return cell ? cell.enrolledCount > 0 : false;
    });

    readonly firstParallelId = computed(() =>
        this.parallels()[0]?.id ?? ''
    );

    readonly isLoading = computed(() =>
        this.store.careersResource.isLoading() ||
        this.store.schoolPeriodsResource.isLoading() ||
        this.store.cataloguesResource.isLoading() ||
        this.store.subjectsResource.isLoading() ||
        this.store.distributionsResource.isLoading() ||
        this.store.enrolledCountsResource.isLoading()
    );
}
