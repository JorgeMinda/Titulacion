import {
    TeacherDistributionInterface,
    CellInterface,
    RowInterface,
    EnrollmentCapacityStatistics,
    ShiftStatistics,
    CourseStatistics,
    ChartDataInterface,
} from '../../enrollment-capacity.state';

const FALLBACK_WORKDAY = 'Sin Jornada';
const FALLBACK_SUBJECT = 'Sin Materia';

export function calculateStatusColor(capacity: number, enrolled: number): 'green' | 'orange' | 'red' {
    if (capacity === 0) return 'red';
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'orange';
    return 'green';
}

export function buildCellFromDistribution(
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
    };
}

export function buildCountsMap(
    distributions: TeacherDistributionInterface[],
    counts: Record<string, number>,
): Map<string, number> {
    const map = new Map<string, number>();
    distributions.forEach(d => map.set(d.id, counts[d.id] ?? 0));
    return map;
}

export function buildEnrollmentMatrix(
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

export function calculateEnrollmentStatistics(
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
        byShift: calculateByShift(distributions, counts),
        byCourse: calculateByCourse(distributions, counts),
    };
}

function aggregateByKey(
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

function calculateByShift(
    distributions: TeacherDistributionInterface[],
    counts: Map<string, number>,
): ShiftStatistics[] {
    return aggregateByKey(distributions, counts, d => d.workday?.name || FALLBACK_WORKDAY)
        .map(({key, ...rest}) => ({shiftName: key, ...rest}));
}

function calculateByCourse(
    distributions: TeacherDistributionInterface[],
    counts: Map<string, number>,
): CourseStatistics[] {
    return aggregateByKey(distributions, counts, d => d.subject?.name || FALLBACK_SUBJECT)
        .map(({key, ...rest}) => ({courseName: key, ...rest}));
}

export function buildEnrollmentChart(statistics: EnrollmentCapacityStatistics): ChartDataInterface {
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
