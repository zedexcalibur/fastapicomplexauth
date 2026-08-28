import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import userEvent from "@testing-library/user-event";

const { mockLogin, mockToastError } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: mockToastError,
  },
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(
      screen.getByPlaceholderText("Username or email")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Password")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Login" })
    ).toBeInTheDocument();
  });

  it("submits the identifier and password", async () => {
    mockLogin.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const identifier = screen.getByPlaceholderText("Username or email");
    const password = screen.getByPlaceholderText("Password");
    const button = screen.getByRole("button", { name: "Login" });

    const user = userEvent.setup();

    await user.type(identifier, "zoe@example.com");

    await user.type(password, "secretpassword");

    await user.click(button);

    await vi.waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "zoe@example.com",
        "secretpassword"
      );
    });
  });

  it("shows an error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Username or email"),
      "zoe"
    );

    await user.type(
      screen.getByPlaceholderText("Password"),
      "wrongpassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Login" })
    );

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Invalid credentials"
      );

      expect(
        screen.getByRole("button", { name: "Login" })
      ).not.toBeDisabled();
    });
  });
});

it("disables the login button while logging in", async () => {
  let resolveLogin;

  mockLogin.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
  );

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const user = userEvent.setup();

  await user.type(
    screen.getByPlaceholderText("Username or email"),
    "zoe"
  );

  await user.type(
    screen.getByPlaceholderText("Password"),
    "secretpassword"
  );

  const button = screen.getByRole("button", { name: "Login" });

  await user.click(button);

  expect(button).toBeDisabled();
  expect(button).toHaveTextContent("Logging in...");

  await act(async () => {
    resolveLogin({});
  });

  expect(button).not.toBeDisabled();
});