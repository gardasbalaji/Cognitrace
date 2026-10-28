
/**
 * CogniTrace Centralized API Service
 *
 * Features:
 * - Centralized API requests
 * - Bearer token authentication
 * - Session-only authentication
 * - Automatic handling of 401 and 403 errors
 * - Student API helpers
 *
 * Authentication policy:
 * - Tokens are stored in sessionStorage only.
 * - Tokens are not persisted in localStorage.
 * - A page refresh keeps the active session.
 * - Closing the browser session normally clears sessionStorage.
 */

const TOKEN_KEY = 'cognitrace_token';
const USER_KEY = 'cognitrace_user';

const AUTH_EXPIRED_EVENT = 'cognitrace:auth-expired';

export { AUTH_EXPIRED_EVENT };

// --------------------------------------------------
// Storage helpers
// --------------------------------------------------

export function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const rawUser = sessionStorage.getItem(USER_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

/**
 * Store the active session.
 *
 * The persist parameter is retained for compatibility with
 * existing login code. Persistent token storage is deliberately
 * disabled to enforce the session-only authentication policy.
 */
export function setStoredSession(token, user, persist = false) {
  try {
    if (!token || !user) {
      throw new Error('A valid token and user are required.');
    }

    // Clear old account-specific information.
    clearStoredSession();

    // Store credentials only in sessionStorage.
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userRole', user.role || '');
    sessionStorage.setItem('studentName', user.full_name || '');

    // Compatibility data for existing dashboards.
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', user.role || '');
    localStorage.setItem('studentName', user.full_name || '');

    if (user.role === 'student') {
      const studentDetails = {
        name: user.full_name || '',
        studentId: user.student_id || '',
        age: user.age || '',
        course: user.course || '',
        college: user.college || '',
        phone: user.phone || '',
        email: user.email || '',
      };

      sessionStorage.setItem(
        'studentDetails',
        JSON.stringify(studentDetails)
      );

      localStorage.setItem(
        'studentDetails',
        JSON.stringify(studentDetails)
      );
    }

    if (user.role === 'faculty') {
      const facultyDetails = {
        name: user.full_name || '',
        employeeId: user.employee_id || '',
        designation: user.designation || '',
        department: user.department || '',
        phone: user.phone || '',
        email: user.email || '',
      };

      sessionStorage.setItem(
        'facultyDetails',
        JSON.stringify(facultyDetails)
      );

      localStorage.setItem(
        'facultyDetails',
        JSON.stringify(facultyDetails)
      );
    }

    // Never persist credentials, even if older login code
    // passes persist=true.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    if (persist) {
      console.info(
        'Persistent login is disabled. The session will not be saved.'
      );
    }
  } catch (error) {
    console.error('Failed to save authentication session:', error);
    clearStoredSession();
    throw error;
  }
}

export function clearStoredSession() {
  const sessionKeys = [
    TOKEN_KEY,
    USER_KEY,
    'isLoggedIn',
    'userRole',
    'studentName',
    'studentId',
    'studentDetails',
    'facultyDetails',
  ];

  const localKeys = [
    TOKEN_KEY,
    USER_KEY,
    'isLoggedIn',
    'userRole',
    'studentName',
    'studentId',
    'studentDetails',
    'facultyDetails',
  ];

  try {
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
    localKeys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear authentication session:', error);
  }
}

// --------------------------------------------------
// Authentication expiration event
// --------------------------------------------------

export function notifyAuthExpired() {
  clearStoredSession();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

const AUTH_NO_EXPIRE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function isAuthNoExpirePath(url) {
  return AUTH_NO_EXPIRE_PATHS.some((path) => url.includes(path));
}

function isInternalApiUrl(url) {
  return typeof url === 'string' && url.startsWith('/api/');
}

// --------------------------------------------------
// Global fetch interceptor
// --------------------------------------------------

if (
  typeof window !== 'undefined' &&
  !window.__cognitrace_fetch_patched
) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (resource, config = {}) {
    const requestUrl =
      typeof resource === 'string'
        ? resource
        : resource instanceof URL
          ? resource.pathname
          : resource?.url || '';

    const internalRequest = isInternalApiUrl(requestUrl);
    const excludedAuthRoute = isAuthNoExpirePath(requestUrl);

    let requestConfig = { ...config };

    if (internalRequest && !excludedAuthRoute) {
      const headers = new Headers(
        resource instanceof Request ? resource.headers : undefined
      );

      new Headers(config.headers || {}).forEach((value, key) => {
        headers.set(key, value);
      });

      const token = getStoredToken();

      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      requestConfig.headers = headers;
    }

    const response = await originalFetch(resource, requestConfig);

    if (
      response.status === 401 &&
      internalRequest &&
      !excludedAuthRoute
    ) {
      notifyAuthExpired();
    }

    return response;
  };

  window.__cognitrace_fetch_patched = true;
}

// --------------------------------------------------
// Centralized API request helper
// --------------------------------------------------

export async function apiRequest(endpoint, options = {}) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('A valid API endpoint is required.');
  }

  const isExternalUrl = /^https?:\/\//i.test(endpoint);

  const url = isExternalUrl
    ? endpoint
    : endpoint.startsWith('/api/')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Never attach CogniTrace credentials to external URLs.
  if (!isExternalUrl) {
    const token = getStoredToken();

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Set JSON content type only for JSON-style request bodies.
  const hasBody = options.body !== undefined && options.body !== null;

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  if (
    hasBody &&
    !isFormData &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      detail =
        errorBody.detail ||
        errorBody.message ||
        detail;
    } catch {
      // Keep the fallback error message if the body is not JSON.
    }

    const error = new Error(detail);
    error.status = response.status;

    throw error;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

// --------------------------------------------------
// Authentication APIs
// --------------------------------------------------

export const authAPI = {
  login: async (email, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (registrationData) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
  },

  getMe: async () => {
    return apiRequest('/api/auth/me', {
      method: 'GET',
    });
  },

  googleAuth: async (payload) => {
    return apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  forgotPassword: async (email) => {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, newPassword) => {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });
  },
};

// --------------------------------------------------
// UUID and lecture helpers
// --------------------------------------------------

export function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

export function findLectureById(lectures, targetId) {
  if (!Array.isArray(lectures) || !targetId) {
    return null;
  }

  return (
    lectures.find(
      (lecture) => String(lecture.id) === String(targetId)
    ) || null
  );
}

// --------------------------------------------------
// Student APIs
// --------------------------------------------------

export const studentAPI = {
  getLectures: async () => {
    return apiRequest('/api/student/lectures');
  },

  getLectureAnalysis: async (lectureId) => {
    return apiRequest(
      `/api/student/lecture/${encodeURIComponent(lectureId)}/analysis`
    );
  },

  getDashboard: async () => {
    return apiRequest('/api/student/dashboard');
  },

  getPortfolio: async () => {
    return apiRequest('/api/student/portfolio');
  },

  search: async (query) => {
    return apiRequest('/api/student/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

// --------------------------------------------------
// Default export
// --------------------------------------------------

export default {
  apiRequest,
  authAPI,
  studentAPI,
  isValidUUID,
  findLectureById,
  getStoredToken,
  setStoredSession,
  clearStoredSession,
  getStoredUser,
  notifyAuthExpired,
};
