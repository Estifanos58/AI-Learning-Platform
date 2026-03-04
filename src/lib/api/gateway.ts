import { authMockService, chatMockService, fileMockService, profileMockService } from '@/src/lib/mocks';
import { authApi } from './gateway-auth';
import { chatApi } from './gateway-chat';
import { GatewayApiError, type ApiErrorResponse } from './gateway-errors';
import { fileToBase64 } from './gateway-file-utils';
import { filesApi } from './gateway-files';
import { profileApi } from './gateway-profile';

export const gatewayApi = {
  auth: authApi,
  profile: profileApi,
  files: filesApi,
  chat: chatApi,
  mockFallbacks: {
    auth: authMockService,
    files: fileMockService,
    profile: profileMockService,
    chat: chatMockService,
  },
};

export { fileToBase64, GatewayApiError };
export type { ApiErrorResponse };
