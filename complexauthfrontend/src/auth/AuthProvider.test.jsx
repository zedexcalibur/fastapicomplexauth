import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AuthProvider } from "./AuthProvider";
import { AuthContext } from "./AuthContext";

import userEvent from "@testing-library/user-event";

const { mockGet, mockPost, mockSetAccessToken, mockApi } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();

  return {
    mockGet,
    mockPost,
    mockSetAccessToken: vi.fn(),
    mockApi: {
      get: mockGet,
      post: mockPost,
      defaults: {
        headers: {
          common: {},
        },
      },
    },
  };
});

vi.mock("../api", () => ({
  api: mockApi,
  setAccessToken: mockSetAccessToken,
}));

function TestConsumer() {
  return (
    <AuthContext.Consumer>
      {({ user, loading, isAuthenticated, logout, refreshUser }) => (
        <>
          <div data-testid="loading">
            {String(loading)}
          </div>

          <div data-testid="authenticated">
            {String(isAuthenticated)}
          </div>

          <div data-testid="username">
            {user?.username ?? "no user"}
          </div>

          <button onClick={logout}>
            Logout
          </button>

          <button onClick={refreshUser}>
            Refresh user
          </button>
        </>
      )}
    </AuthContext.Consumer>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores the user from /me on startup", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: 1,
        username: "zoe",
        email: "zoe@example.com",
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("loading")
      ).toHaveTextContent("false");
    });

    expect(mockGet).toHaveBeenCalledWith("/me");

    expect(
      screen.getByTestId("authenticated")
    ).toHaveTextContent("true");

    expect(
      screen.getByTestId("username")
    ).toHaveTextContent("zoe");
  });

  it("refreshes the token and restores the user when /me initially fails", async () => {
    mockGet
        .mockRejectedValueOnce(new Error("Unauthorized"))
        .mockResolvedValueOnce({
        data: {
            id: 1,
            username: "zoe",
            email: "zoe@example.com",
        },
        });

    mockPost.mockResolvedValueOnce({
        data: {
        access_token: "new-access-token",
        },
    });

    render(
        <AuthProvider>
        <TestConsumer />
        </AuthProvider>
    );

    await waitFor(() => {
        expect(
        screen.getByTestId("loading")
        ).toHaveTextContent("false");
    });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/me");
    expect(mockPost).toHaveBeenCalledWith("/refresh");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/me");

    expect(mockSetAccessToken).toHaveBeenCalledWith(
        "new-access-token"
    );

    expect(
        screen.getByTestId("authenticated")
    ).toHaveTextContent("true");

    expect(
        screen.getByTestId("username")
    ).toHaveTextContent("zoe");
  });

  it("leaves the user unauthenticated when /me and /refresh both fail", async () => {
    mockGet.mockRejectedValueOnce(
        new Error("Unauthorized")
    );

    mockPost.mockRejectedValueOnce(
        new Error("Refresh failed")
    );

    render(
        <AuthProvider>
        <TestConsumer />
        </AuthProvider>
    );

    await waitFor(() => {
        expect(
        screen.getByTestId("loading")
        ).toHaveTextContent("false");
    });

    expect(mockGet).toHaveBeenCalledWith("/me");

    expect(mockPost).toHaveBeenCalledWith("/refresh");

    expect(mockSetAccessToken).toHaveBeenCalledWith(null);

    expect(
        screen.getByTestId("authenticated")
    ).toHaveTextContent("false");

    expect(
        screen.getByTestId("username")
    ).toHaveTextContent("no user");
  });

  it("logs out and clears the authentication state", async () => {
    // Start with a logged-in user.
    mockGet.mockResolvedValueOnce({
        data: {
        id: 1,
        username: "zoe",
        email: "zoe@example.com",
        },
    });

    mockPost.mockResolvedValueOnce({});

    // Simulate an existing Authorization header.
    mockApi.defaults.headers.common["Authorization"] = "Bearer old-access-token";

    render(
        <AuthProvider>
        <TestConsumer />
        </AuthProvider>
    );

    // Wait for startup authentication to finish.
    await waitFor(() => {
        expect(
        screen.getByTestId("authenticated")
        ).toHaveTextContent("true");
    });

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Logout" })
    );

    await waitFor(() => {
        expect(
        screen.getByTestId("authenticated")
        ).toHaveTextContent("false");

        expect(
        screen.getByRole("button", { name: "Logout" })
        ).not.toBeDisabled();
    });

    expect(mockPost).toHaveBeenCalledWith("/logout");

    expect(mockSetAccessToken).toHaveBeenCalledWith(null);

    expect(
        screen.getByTestId("username")
    ).toHaveTextContent("no user");

    expect(
    mockApi.defaults.headers.common["Authorization"]
    ).toBeUndefined();
  });

  it("clears local authentication state even when logout fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mockGet.mockResolvedValueOnce({
        data: {
          id: 1,
          username: "zoe",
          email: "zoe@example.com",
        },
      });

      mockPost.mockRejectedValueOnce(
        new Error("Network error")
      );

      mockApi.defaults.headers.common["Authorization"] =
        "Bearer old-access-token";

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("authenticated")
        ).toHaveTextContent("true");
      });

      const user = userEvent.setup();

      await user.click(
        screen.getByRole("button", { name: "Logout" })
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("authenticated")
        ).toHaveTextContent("false");

        expect(
          screen.getByRole("button", { name: "Logout" })
        ).not.toBeDisabled();
      });

      expect(mockSetAccessToken).toHaveBeenCalledWith(null);

      expect(
        screen.getByTestId("username")
      ).toHaveTextContent("no user");

      expect(
        mockApi.defaults.headers.common["Authorization"]
      ).toBeUndefined();

      expect(consoleError).toHaveBeenCalledWith(
        "Logout error:",
        expect.any(Error)
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("refreshes the current user", async () => {
    mockGet
        .mockResolvedValueOnce({
        data: {
            id: 1,
            username: "zoe",
            email: "zoe@example.com",
        },
        })
        .mockResolvedValueOnce({
        data: {
            id: 1,
            username: "zoe-updated",
            email: "zoe@example.com",
        },
        });

    render(
        <AuthProvider>
        <TestConsumer />
        </AuthProvider>
    );

    await waitFor(() => {
        expect(
        screen.getByTestId("username")
        ).toHaveTextContent("zoe");
    });

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Refresh user" })
    );

    await waitFor(() => {
        expect(
        screen.getByTestId("username")
        ).toHaveTextContent("zoe-updated");

          expect(
          screen.getByRole("button", { name: "Refresh user" })
          ).not.toBeDisabled();
    });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/me");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/me");
  });
});
