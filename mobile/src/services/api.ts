import * as authApi from '../features/auth/api';
import * as workoutsApi from '../features/workouts/api';
import * as nutritionApi from '../features/nutrition/api';
import * as scannerApi from '../features/scanner/api';
import * as reportsApi from '../features/reports/api';
import * as coachApi from '../features/coach/api';
import * as messagingApi from '../features/messaging/api';
import * as bookingsApi from '../features/bookings/api';
import * as adminApi from '../features/admin/api';
import * as profileApi from '../features/profile/api';
import * as notificationsApi from '../features/notifications/api';
import * as anatomyApi from '../features/anatomy/api';
import * as chatApi from '../features/chat/api';

export { resolveUrl, setAuthFailureCallback } from '../shared/api';

const api = {
  ...authApi,
  ...workoutsApi,
  ...nutritionApi,
  ...reportsApi,
  ...coachApi,
  ...messagingApi,
  ...bookingsApi,
  ...adminApi,
  ...profileApi,
  ...notificationsApi,
  ...anatomyApi,

  logScannedFood: scannerApi.logScannedFood,
  scanFoodImage: scannerApi.scanFoodImage,
  sendChatMessage: chatApi.sendChatMessage,
};

export default api;
