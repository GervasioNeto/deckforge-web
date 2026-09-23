import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser } from '../models/user.model';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);

  getMe(): Observable<AppUser> {
    return this.http.get<AppUser>(`${environment.apiBaseUrl}/me`);
  }
}
