import {Component, input} from '@angular/core';
import {ChartModule} from 'primeng/chart';
import {
    EnrollmentCapacityStatistics,
    ChartDataInterface,
    ChartOptionsInterface,
} from '../../enrollment-capacity.state';

@Component({
    selector: 'app-statistics-panel',
    imports: [ChartModule],
    templateUrl: './statistics-panel.component.html',
})
export class StatisticsPanelComponent {
    readonly chartData = input.required<ChartDataInterface>();
    readonly chartOptions = input.required<ChartOptionsInterface>();
    readonly statistics = input.required<EnrollmentCapacityStatistics>();
}
