// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmendedBadge } from "@/components/session/amended-badge";

describe("AmendedBadge", () => {
  it("renders Amended text when isAmended is true", () => {
    render(<AmendedBadge isAmended={true} />);
    expect(screen.getByText("Amended")).toBeInTheDocument();
  });

  it("renders nothing when isAmended is false", () => {
    const { container } = render(<AmendedBadge isAmended={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies amber color styling", () => {
    render(<AmendedBadge isAmended={true} />);
    const badge = screen.getByText("Amended");
    expect(badge.closest("[class]")?.className).toMatch(/amber/);
  });
});
