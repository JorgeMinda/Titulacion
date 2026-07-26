export interface SubjectInterface {
    id: string;
    name: string;
    code?: string;
    academicPeriod?: {
        id: string;
        name: string;
        description?: string;
    };
    curriculum?: {
        id: string;
        name: string;
        career?: {
            id: string;
            name: string;
        };
    };
}

export const CATALOGUE_TYPE_WORKDAY = 'ENROLLMENTS_WORKDAY';
export const CATALOGUE_TYPE_CLASSROOM = 'ENROLLMENTS_CLASSROOM';
export const CATALOGUE_TYPE_PARALLEL = 'PARALLEL';

export interface TeacherDistributionInterface {
    id: string;
    parallelId: string;
    schoolPeriodId: string;
    subjectId: string;
    teacherId: string | null;
    workdayId: string;
    classroomId: string | null;
    capacity: number;
    hours: number | null;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;

    parallel?: {
        id: string;
        name: string;
        code?: string;
    };
    schoolPeriod?: {
        id: string;
        name: string;
        code?: string;
        shortName?: string;
    };
    subject?: {
        id: string;
        name: string;
        code?: string;
        academicPeriod?: {
            id: string;
            name: string;
            description?: string;
        };
        curriculum?: {
            id: string;
            name: string;
            career?: {
                id: string;
                name: string;
            };
        };
    };
    workday?: {
        id: string;
        name: string;
        code?: string;
    };
    classroom?: {
        id: string;
        name: string;
        capacity: number;
        code?: string;
        location?: string;
    };
    teacher?: {
        id: string;
        name: string;
    } | null;
}

export interface CellInterface {
    id: string;
    schedule: string;
    parallel: string;
    subject: string;
    subjectId: string;
    parallelId: string;
    workdayId: string;
    schoolPeriodId: string;
    classroomId: string | null;
    classroom: string;
    academicLevel: string;
    maxCapacity: number;
    enrolledCount: number;
    statusColor: 'green' | 'orange' | 'red';
    cssClass: string;
}

export interface RowInterface {
    workdayId: string;
    workdayName: string;
    cells: CellInterface[];
}

export interface EnrollmentCapacityStatistics {
    totalCapacity: number;
    totalEnrolled: number;
    totalAvailable: number;
    globalOccupancyPercentage: number;
    byShift: ShiftStatistics[];
    byCourse: CourseStatistics[];
}

export interface ShiftStatistics {
    shiftName: string;
    capacity: number;
    enrolled: number;
    available: number;
    percentage: number;
}

export interface CourseStatistics {
    courseName: string;
    capacity: number;
    enrolled: number;
    available: number;
    percentage: number;
}

// ── Filtros ─────────────────────────────────────────────
export interface FilterFormInterface {
    careerId: string;
    schoolPeriodId: string;
}

export const INITIAL_FILTER_FORM = {
    careerId: '',
    schoolPeriodId: '',
} satisfies FilterFormInterface;

// ── Formulario del modal ────────────────────────────────
export interface ModalFormInterface {
    capacity: number;
    parallelId: string | null;
    workdayId: string | null;
    subjectId: string | null;
    classroomId: string | null;
    schoolPeriodId: string;
    teacherId?: string;
    hours?: number;
}

export const INITIAL_MODAL_FORM = {
    capacity: 30,
    parallelId: null,
    workdayId: null,
    subjectId: null,
    classroomId: null,
    schoolPeriodId: '',
    hours: 4,
} satisfies ModalFormInterface;

export interface CreateTeacherDistributionPayload {
    capacity: number;
    parallelId: string;
    workdayId: string;
    subjectId: string;
    schoolPeriodId: string;
    classroomId?: string | null;
    hours?: number;
}

export interface UpdateTeacherDistributionPayload {
    capacity: number;
    parallelId: string;
    workdayId: string;
    subjectId: string;
    schoolPeriodId: string;
    classroomId?: string | null;
}

// ── Gráfico ──────────────────────────────────────────────
export interface ChartDataInterface {
    labels: string[];
    datasets: {
        data: number[];
        backgroundColor: string[];
        hoverBackgroundColor: string[];
    }[];
}

export interface ChartOptionsInterface {
    cutout?: string;
    plugins?: {
        legend?: {
            position?: string;
            labels?: {
                color?: string;
            };
        };
    };
}

export const DEFAULT_CHART_OPTIONS = {
    cutout: '60%',
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#475569',
            },
        },
    },
} satisfies ChartOptionsInterface;

export const ERROR_MESSAGES = {
    CAREERS_LOAD: 'Error al cargar carreras',
    SCHOOL_PERIODS_LOAD: 'Error al cargar períodos escolares',
    CATALOGUES_LOAD: 'Error al cargar catálogos',
    SAVE_DISTRIBUTION: 'No se pudo guardar la distribución',
    DELETE_DISTRIBUTION: 'No se pudo eliminar la distribución',
} as const;