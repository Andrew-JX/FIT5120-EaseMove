import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ExtremeWeatherQuizPage from "../ExtremeWeatherQuizPage";

const navigateToMock = vi.fn();

vi.mock("../../lib/navigation", () => ({
  navigateTo: (path: string) => navigateToMock(path),
}));

function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  navigateToMock.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ExtremeWeatherQuizPage - Epic 4.3", () => {
  test("renders five quiz questions covering heat, heavy rain, storm, cold, and dry conditions", () => {
    const view = render(<ExtremeWeatherQuizPage />);

    expect(view.container.textContent).toContain("Extreme Weather Quiz");
    expect(view.container.textContent).toContain("Q1. During very hot weather, which action is the safest?");
    expect(view.container.textContent).toContain("Q2. In heavy rain conditions, what should you do first?");
    expect(view.container.textContent).toContain(
      "Q3. What is the best safety response during a storm with lightning?"
    );
    expect(view.container.textContent).toContain(
      "Q4. In very cold weather, which action helps prevent hypothermia risk?"
    );
    expect(view.container.textContent).toContain(
      "Q5. Under dry conditions, what is a recommended action?"
    );

    view.unmount();
  });

  test("submitting one question shows immediate correct or incorrect feedback with explanation", () => {
    const view = render(<ExtremeWeatherQuizPage />);

    const firstQuestionRadios = Array.from(
      view.container.querySelectorAll('input[name="q1"]')
    ) as HTMLInputElement[];
    expect(firstQuestionRadios).toHaveLength(3);

    act(() => {
      firstQuestionRadios[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const submitButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.trim() === "Submit"
    );
    expect(submitButtons.length).toBeGreaterThan(0);

    act(() => {
      submitButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Correct");
    expect(view.container.textContent).toContain(
      "Hydration and avoiding peak heat reduce risk of heat-related illness."
    );

    view.unmount();
  });

  test("after all five questions are submitted, the page shows a score summary", () => {
    const view = render(<ExtremeWeatherQuizPage />);

    const answerIndexes = {
      q1: 0,
      q2: 1,
      q3: 1,
      q4: 0,
      q5: 0,
    } as const;

    Object.entries(answerIndexes).forEach(([questionId, answerIndex], questionOffset) => {
      const radios = Array.from(
        view.container.querySelectorAll(`input[name="${questionId}"]`)
      ) as HTMLInputElement[];

      act(() => {
        radios[answerIndex].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      const currentSubmitButtons = Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent?.trim() === "Submit"
      );

      act(() => {
        currentSubmitButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(view.container.textContent).toContain(`Q${questionOffset + 1}.`);
    });

    expect(view.container.textContent).toContain("Quiz Summary");
    expect(view.container.textContent).toContain("You scored 5 out of 5.");
    expect(view.container.textContent).toContain(
      "Great work. You are ready to apply these safety steps outdoors."
    );

    view.unmount();
  });

  test("Try Again resets submitted feedback and allows the quiz to restart", () => {
    const view = render(<ExtremeWeatherQuizPage />);

    const firstQuestionRadios = Array.from(
      view.container.querySelectorAll('input[name="q1"]')
    ) as HTMLInputElement[];

    act(() => {
      firstQuestionRadios[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const submitButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.trim() === "Submit"
    );
    expect(submitButton).toBeTruthy();

    act(() => {
      submitButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Incorrect");

    const tryAgainButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Try Again")
    );
    expect(tryAgainButton).toBeTruthy();

    act(() => {
      tryAgainButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).not.toContain("Incorrect");
    expect((view.container.querySelector('input[name="q1"]') as HTMLInputElement).checked).toBe(false);

    view.unmount();
  });

  test("clicking Back returns to the extreme weather risks page", () => {
    const view = render(<ExtremeWeatherQuizPage />);

    const backButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Back")
    );
    expect(backButton).toBeTruthy();

    act(() => {
      backButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(navigateToMock).toHaveBeenCalledWith("/extreme-weather-risks");

    view.unmount();
  });
});
