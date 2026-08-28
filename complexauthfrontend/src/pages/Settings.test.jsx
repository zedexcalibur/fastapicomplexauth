import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockPost,
  mockRefreshUser,
  mockLogout,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockRefreshUser: vi.fn(),
  mockLogout: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("../api", () => ({
  api: {
    post: mockPost,
  },
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({
    refreshUser: mockRefreshUser,
    logout: mockLogout,
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import Settings from "./Settings";

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the settings page", () => {
    render(<Settings />);

    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Change Password" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Change Email" })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Current password")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("New password")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("New email")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Update Password" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Update Email" })
    ).toBeInTheDocument();
  });

  it("sends the current and new passwords to the API", async () => {
    mockPost.mockResolvedValueOnce({});

    render(<Settings />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "oldpassword"
    );

    await user.type(
      screen.getByPlaceholderText("New password"),
      "newpassword123"
    );

    await user.click(
      screen.getByRole("button", { name: "Update Password" })
    );

    await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
        "/change-password",
        {
            current_password: "oldpassword",
            new_password: "newpassword123",
        }
        );

        expect(
        screen.getByRole("button", { name: "Update Password" })
        ).not.toBeDisabled();
    });
  });

  it("shows a success message and logs out after changing the password", async () => {
    mockPost.mockResolvedValueOnce({});
    mockLogout.mockResolvedValueOnce({});

    render(<Settings />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Current password"),
      "oldpassword"
    );

    await user.type(
      screen.getByPlaceholderText("New password"),
      "newpassword123"
    );

    await user.click(
      screen.getByRole("button", { name: "Update Password" })
    );

    await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
        "Password updated. Please log in again."
        );

        expect(
        screen.getByRole("button", { name: "Update Password" })
        ).not.toBeDisabled();
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("sends the new email address to the API", async () => {
    mockPost.mockResolvedValueOnce({});

    render(<Settings />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New email"),
      "newemail@example.com"
    );

    await user.click(
      screen.getByRole("button", { name: "Update Email" })
    );

    await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
        "/change-email",
        {
            new_email: "newemail@example.com",
        }
        );

        expect(
        screen.getByRole("button", { name: "Update Email" })
        ).not.toBeDisabled();
    });
  });

  it("refreshes the user and shows a success message after changing the email", async () => {
    mockPost.mockResolvedValueOnce({});
    mockRefreshUser.mockResolvedValueOnce({});

    render(<Settings />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New email"),
      "newemail@example.com"
    );

    await user.click(
      screen.getByRole("button", { name: "Update Email" })
    );

    await waitFor(() => {
        expect(mockRefreshUser).toHaveBeenCalled();
        expect(
        screen.getByRole("button", { name: "Update Email" })
        ).not.toBeDisabled();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
        "Email updated"
    );
  });

  it("shows an error if changing the email fails", async () => {
    mockPost.mockRejectedValueOnce(
        new Error("Email change failed")
    );

    render(<Settings />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New email"),
      "newemail@example.com"
    );

    await user.click(
      screen.getByRole("button", { name: "Update Email" })
    );

    await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong."
        );
        expect(
        screen.getByRole("button", { name: "Update Email" })
        ).not.toBeDisabled();
    });

    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});