import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ForgotPassword from "./ForgotPassword";
import userEvent from "@testing-library/user-event";

const { mockPost, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
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

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the forgot password form", () => {
    render(<ForgotPassword />);

    expect(
      screen.getByRole("heading", { name: "Forgot Password" })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Email")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Send reset link" })
    ).toBeInTheDocument();
  });

  it("submits the email address", async () => {
    mockPost.mockResolvedValueOnce({});

    render(<ForgotPassword />);

    const emailInput = screen.getByPlaceholderText("Email");
    const button = screen.getByRole("button", {
      name: "Send reset link",
    });

    const user = userEvent.setup();

    await user.type(emailInput, "zoe@example.com");

    await user.click(button);

    await vi.waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/forgot-password",
        { email: "zoe@example.com" }
      );
    });
  });

  it("shows a success message when the request succeeds", async () => {
    mockPost.mockResolvedValueOnce({});

    render(<ForgotPassword />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );
    
    await user.click(
      screen.getByRole("button", { name: "Send reset link" })
    );

    await vi.waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "If the email exists, a reset link has been sent"
      );

        expect(
        screen.getByRole("button", { name: "Send reset link" })
        ).not.toBeDisabled();
    });
  });

  it("shows an error message when the request fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("Request failed"));

    render(<ForgotPassword />);

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );

    await user.click(
      screen.getByRole("button", { name: "Send reset link" })
    );

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong"
      );
        expect(
        screen.getByRole("button", { name: "Send reset link" })
        ).not.toBeDisabled();
    });
  });

  it("disables the button while the request is in progress", async () => {
    let resolveRequest;

    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    render(<ForgotPassword />);

    const emailInput = screen.getByPlaceholderText("Email");
    const button = screen.getByRole("button", {
      name: "Send reset link",
    });

    const user = userEvent.setup();

    await user.type(emailInput, "zoe@example.com");

    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Sending...");

    resolveRequest({});

    await act(async () => {
      resolveRequest();
    });

    expect(button).not.toBeDisabled();
  });
});