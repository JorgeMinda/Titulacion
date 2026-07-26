import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import {
    TeacherDistributionInterface,
    FilterFormInterface,
    CreateTeacherDistributionPayload,
    UpdateTeacherDistributionPayload,
    SubjectInterface,
} from './enrollment-capacity.state';
import { CatalogueInterface, HttpResponseInterface } from '@utils/interfaces';
import { environment } from '@env/environment';

type RawCatalogueItem = { id: string; name: string; code?: string; acronym?: string };

@Injectable({ providedIn: 'root' })
export class EnrollmentCapacityHttpService {
    private readonly httpClient = inject(HttpClient);
    private readonly apiUrl = environment.API_URL;

    /**
     * Helper para extraer arrays de manera segura y con tipado fuerte.
     * Clean Architecture: Aísla la lógica de transformación de la llamada HTTP.
     */
    private extractArray<T>(response: HttpResponseInterface): T[] {
        return Array.isArray(response.data) ? (response.data as T[]) : [];
    }

    findCareers(): Observable<CatalogueInterface[]> {
        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/careers`).pipe(
            map((response) =>
                this.extractArray<RawCatalogueItem>(response).map((item) => ({
                    id: item.id,
                    name: item.name,
                    code: (item.code || item.acronym) ?? '',
                }))
            )
            // ✅ SIN catchError: Dejamos que el error fluya hacia rxResource en el Store.
        );
    }

    findSchoolPeriods(): Observable<CatalogueInterface[]> {
        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/school-periods`).pipe(
            map((response) =>
                this.extractArray<RawCatalogueItem>(response).map((item) => ({
                    id: item.id,
                    name: item.name,
                    code: item.code ?? '',
                }))
            )
        );
    }

    findSubjectsByCareer(careerId: string): Observable<SubjectInterface[]> {
        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/careers/${careerId}/subjects`).pipe(
            map((response) => this.extractArray<SubjectInterface>(response))
        );
    }

    findAllDistributions(filters: Partial<FilterFormInterface>): Observable<TeacherDistributionInterface[]> {
        // ✅ Guard clause válido: no es un error, es una condición de negocio para no hacer peticiones inútiles.
        if (!filters.schoolPeriodId) {
            return of([]);
        }

        let params = new HttpParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value != null && value !== '') {
                params = params.append(key, String(value));
            }
        });

        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/teacher-distributions`, { params }).pipe(
            map((response) => this.extractArray<TeacherDistributionInterface>(response))
        );
    }

    findCatalogues(): Observable<CatalogueInterface[]> {
        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/common/catalogues/cache`).pipe(
            // Unificado con extractArray para consistencia y DRY (Don't Repeat Yourself)
            map((response) => this.extractArray<CatalogueInterface>(response))
        );
    }

    register(payload: CreateTeacherDistributionPayload): Observable<TeacherDistributionInterface> {
        return this.httpClient.post<HttpResponseInterface>(`${this.apiUrl}/teacher-distributions`, payload).pipe(
            map((response): TeacherDistributionInterface =>
                Array.isArray(response.data) ? response.data[0] : (response.data as TeacherDistributionInterface)
            )
        );
    }

    update(id: string, payload: UpdateTeacherDistributionPayload): Observable<TeacherDistributionInterface> {
        return this.httpClient.patch<HttpResponseInterface>(`${this.apiUrl}/teacher-distributions/${id}`, payload).pipe(
            map((response): TeacherDistributionInterface =>
                Array.isArray(response.data) ? response.data[0] : (response.data as TeacherDistributionInterface)
            )
        );
    }

    findEnrolledCounts(distributionIds: string[]): Observable<Record<string, number>> {
        // ✅ Guard clause válido
        if (!distributionIds.length) {
            return of({});
        }
        
        const params = new HttpParams().set('ids', distributionIds.join(','));
        return this.httpClient.get<HttpResponseInterface>(`${this.apiUrl}/teacher-distributions/enrolled-counts`, { params }).pipe(
            map((response) => (response.data || {}) as Record<string, number>)
        );
    }

    remove(id: string): Observable<void> {
        return this.httpClient.delete<HttpResponseInterface>(`${this.apiUrl}/teacher-distributions/${id}`).pipe(
            map(() => undefined)
        );
    }
}