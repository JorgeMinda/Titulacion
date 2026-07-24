import { Component, inject } from '@angular/core';
import { EnrollmentCapacityStore } from '../../enrollment-capacity.store';
import { SubjectInterface } from '../../enrollment-capacity.state';

@Component({
    selector: 'app-level-cards',
    templateUrl: './level-cards.component.html',
})
export class LevelCardsComponent {
    protected readonly store = inject(EnrollmentCapacityStore);

    protected selectedId(): string | null {
        return this.store.selectedSubjectId();
    }

    protected onSelect(subject: SubjectInterface): void {
        if (this.store.selectedSubjectId() === subject.id) {
            this.store.selectSubject(null);
        } else {
            this.store.selectSubject(subject.id);
        }
    }
}