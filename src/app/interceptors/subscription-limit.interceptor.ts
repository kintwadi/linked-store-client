import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SubscriptionPlanService } from '../services/subscription-plan.service';

export const subscriptionLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const subscriptionPlanService = inject(SubscriptionPlanService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error?.status === 402
        && typeof error?.error === 'object'
        && error.error !== null
        && error.error['errorCode'] === 'ORDER_LIMIT_EXCEEDED'
      ) {
        subscriptionPlanService.triggerOrderLimitBanner();
      }
      return throwError(() => error);
    })
  );
};
