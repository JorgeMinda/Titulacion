import {Component, input, output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {RowInterface, CellInterface} from '../../enrollment-capacity.state';
import {CustomIcons} from '@utils/icons/custom-icons';

@Component({
    selector: 'app-capacity-matrix',
    imports: [ButtonModule],
    templateUrl: './capacity-matrix.component.html',
})
export class CapacityMatrixComponent {
    protected readonly CustomIcons = CustomIcons;

    readonly matrix = input.required<RowInterface[]>();
    readonly edit = output<CellInterface>();
}
