/**
 * Shared validation schemas
 */

// Common schemas
export {
  paginationQuery,
  paginationMeta,
  idParam,
  errorResponse,
  messageResponse,
  type PaginationQuery,
  type PaginationMeta,
  type IdParam,
} from './common.schema.js';

// User schemas
export {
  baseUserSchema,
  createUserInput,
  updateUserInput,
  userResponse,
  userListItem,
  type CreateUserInput,
  type UpdateUserInput,
  type UserResponse,
  type UserListItem,
} from './user.schema.js';

// Auth schemas
export {
  registerInput,
  loginInput,
  refreshInput,
  tokenResponse,
  currentUserResponse,
  type RegisterInput,
  type LoginInput,
  type RefreshInput,
  type TokenResponse,
  type CurrentUserResponse,
} from './auth.schema.js';
