import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: mockUseAuth,
}));

import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  it("displays the user's username and email", () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: "zoe",
        email: "zoe@example.com",
      },
    });

    render(<Dashboard />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    expect(
      screen.getByText("zoe")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Email: zoe@example.com")
    ).toBeInTheDocument();
  });

  it("renders without user details when no user is logged in", () => {
    mockUseAuth.mockReturnValue({
        user: null,
    });

    render(<Dashboard />);

    expect(
        screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Email:")).toBeInTheDocument();
  });
});