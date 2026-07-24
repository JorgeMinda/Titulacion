import {Component, input, output} from '@angular/core';
import {SubjectInterface} from '../../enrollment-capacity.state';

@Component({
    selector: 'app-level-cards',
    templateUrl: './level-cards.component.html',
})
export class LevelCardsComponent {
    readonly subjects = input.required<SubjectInterface[]>();
    readonly selectedSubjectId = input<string | null>(null);
    readonly selectSubject = output<string | null>();

    protected onSelect(subject: SubjectInterface): void {
        const newValue = this.selectedSubjectId() === subject.id ? null : subject.id;
        this.selectSubject.emit(newValue);
    }
}
