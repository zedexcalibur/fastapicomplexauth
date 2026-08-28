import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

const {
  mockPost,
  mockLogin,
  mockToastSuccess,
  mockToastError,
  mockNavigate,
} = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockLogin: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("../api", () => ({
  api: {
    post: mockPost,
  },
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({
    user: null,
    login: mockLogin,
  }),
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

import Register from "./Register";

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the registration form", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Create Account" })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Username")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Email")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Password")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Register" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Login" })
    ).toBeInTheDocument();
  });

  it("registers the user and logs them in", async () => {
    mockPost.mockResolvedValueOnce({});

    mockLogin.mockResolvedValueOnce({
        id: 1,
        username: "zoe",
        email: "zoe@example.com",
    });

    render(
        <MemoryRouter>
        <Register />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Username"),
      "zoe"
    );

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Password"),
      "secretpassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Register" })
    );

    await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
        "/register",
        {
            username: "zoe",
            email: "zoe@example.com",
            password: "secretpassword",
        }
        );

          expect(
          screen.getByRole("button", { name: "Register" })
          ).not.toBeDisabled();
    });

    expect(mockLogin).toHaveBeenCalledWith(
        "zoe",
        "secretpassword"
    );
  });

  it("shows a success message and navigates home after registration", async () => {
    mockPost.mockResolvedValueOnce({});
    mockLogin.mockResolvedValueOnce({});

    render(
        <MemoryRouter>
        <Register />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Username"),
      "zoe"
    );

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Password"),
      "secretpassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Register" })
    );

    await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
        "Account created"
        );

          expect(
          screen.getByRole("button", { name: "Register" })
          ).not.toBeDisabled();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows the backend error message when registration fails", async () => {
    mockPost.mockRejectedValueOnce({
        response: {
        data: {
            detail: "Username already exists",
        },
        },
    });

    render(
        <MemoryRouter>
        <Register />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Username"),
      "zoe"
    );

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Password"),
      "secretpassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Register" })
    );

    await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
        "Username already exists"
        );

          expect(
          screen.getByRole("button", { name: "Register" })
          ).not.toBeDisabled();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows a generic error for an unexpected registration failure", async () => {
    mockPost.mockRejectedValueOnce(
        new Error("Network error")
    );

    render(
        <MemoryRouter>
        <Register />
        </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Username"),
      "zoe"
    );

    await user.type(
      screen.getByPlaceholderText("Email"),
      "zoe@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Password"),
      "secretpassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Register" })
    );

    await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong."
        );

          expect(
          screen.getByRole("button", { name: "Register" })
          ).not.toBeDisabled();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});