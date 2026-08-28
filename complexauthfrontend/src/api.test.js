import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreate,
  mockRequestUse,
  mockResponseUse,
  mockStorage,
} = vi.hoisted(() => {
  const storage = {};

  return {
    mockCreate: vi.fn(),
    mockRequestUse: vi.fn(),
    mockResponseUse: vi.fn(),

    mockStorage: {
      getItem: vi.fn((key) => storage[key] ?? null),

      setItem: vi.fn((key, value) => {
        storage[key] = String(value);
      }),

      removeItem: vi.fn((key) => {
        delete storage[key];
      }),

      clear: vi.fn(() => {
        Object.keys(storage).forEach((key) => {
          delete storage[key];
        });
      }),
    },
  };
});

const mockApi = {
  defaults: {
    headers: {
      common: {},
    },
  },

  interceptors: {
    request: {
      use: mockRequestUse,
    },

    response: {
      use: mockResponseUse,
    },
  },
};

vi.mock("axios", () => ({
  default: {
    create: mockCreate,
  },
}));

mockCreate.mockReturnValue(mockApi);

Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  configurable: true,
});

const {
  api,
  setAccessToken,
  getAccessToken,
} = await import("./api");

const requestInterceptor = mockRequestUse.mock.calls[0][0];
const responseSuccessInterceptor = mockResponseUse.mock.calls[0][0];

describe("api", () => {
  beforeEach(() => {
    mockStorage.clear();
    mockApi.defaults.headers.common = {};

    setAccessToken(null);

    document.cookie =
        "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    vi.clearAllMocks();
  });

  it("sets the access token in memory, localStorage and the Authorization header", () => {
    setAccessToken("test-token");

    expect(getAccessToken()).toBe("test-token");

    expect(mockStorage.getItem("accessToken")).toBe(
      "test-token"
    );

    expect(
      api.defaults.headers.common["Authorization"]
    ).toBe("Bearer test-token");
  });

  it("clears the access token from memory, localStorage and the Authorization header", () => {
    setAccessToken("test-token");

    setAccessToken(null);

    expect(getAccessToken()).toBeNull();

    expect(mockStorage.getItem("accessToken")).toBeNull();

    expect(
        api.defaults.headers.common["Authorization"]
    ).toBeUndefined();
  });

  it("adds the access token to the Authorization header", () => {
    setAccessToken("test-token");

    const config = {
        headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe(
        "Bearer test-token"
    );
  });

  it("adds the CSRF token to the request headers", () => {
    document.cookie = "csrf_token=test-csrf-token";

    const config = {
        headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers["X-CSRF-Token"]).toBe(
        "test-csrf-token"
    );
  });

  it("does not add authentication headers when no tokens exist", () => {
    const config = {
        headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers["X-CSRF-Token"]).toBeUndefined();
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("returns successful responses unchanged", () => {
    const response = {
        status: 200,
        data: {
        message: "Success",
        },
    };

    const result = responseSuccessInterceptor(response);

    expect(result).toBe(response);
  });
});