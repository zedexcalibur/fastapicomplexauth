import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "./ResetPassword";
import userEvent from "@testing-library/user-event";

const { mockPost, mockToastSuccess, mockToastError, mockNavigate } =
  vi.hoisted(() => ({
    mockPost: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
  }));

vi.mock("../api", () => ({
  api: {
    post: mockPost,
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reset password form", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Reset Password" })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("New password")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Reset Password" })
    ).toBeInTheDocument();
  });

  it("submits the reset token and new password", async () => {
    mockPost.mockResolvedValueOnce({});

    render(
        <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New password"),
      "newpassword123"
    );

    await user.click(
      screen.getByRole("button", { name: "Reset Password" })
    );

    await vi.waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
        "/reset-password",
        {
            token: "test-token",
            new_password: "newpassword123",
        }
        );

          expect(
          screen.getByRole("button", { name: "Reset Password" })
          ).not.toBeDisabled();
    });
  });

  it("shows a success message and navigates to login after a successful reset", async () => {
    mockPost.mockResolvedValueOnce({});

    render(
        <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New password"),
      "newpassword123"
    );

    await user.click(
      screen.getByRole("button", { name: "Reset Password" })
    );

    await vi.waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
        "Password reset successful"
        );

        expect(
        screen.getByRole("button", { name: "Reset Password" })
        ).not.toBeDisabled();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows an error message when the reset fails", async () => {
    mockPost.mockRejectedValueOnce(
        new Error("Invalid or expired token")
    );

    render(
        <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("New password"),
      "newpassword123"
    );

    await user.click(
      screen.getByRole("button", { name: "Reset Password" })
    );

    await vi.waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
        "Invalid or expired token"
        );

          expect(
          screen.getByRole("button", { name: "Reset Password" })
          ).not.toBeDisabled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("disables the button while the reset is in progress", async () => {
    let resolveRequest;

    mockPost.mockImplementation(
        () =>
        new Promise((resolve) => {
            resolveRequest = resolve;
        })
    );

    render(
        <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
        </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("New password");
    const button = screen.getByRole("button", {
        name: "Reset Password",
    });

    const user = userEvent.setup();

    await user.type(passwordInput, "newpassword123");

    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Resetting...");

    resolveRequest({});

    await act(async () => {
      resolveRequest();
    });

    expect(button).not.toBeDisabled();
  });
});